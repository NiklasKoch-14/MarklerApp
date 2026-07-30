package com.marklerapp.crm.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.marklerapp.crm.config.GeocodingProperties;
import com.marklerapp.crm.dto.AddressLookupDto;
import com.marklerapp.crm.dto.GeocodingSuggestionDto;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Resolves addresses to coordinates via Nominatim (OpenStreetMap), called server-side
 * only — Nominatim's usage policy requires an identifying User-Agent and caps requests
 * at roughly 1/sec, which is far easier to respect from one backend service than from
 * every agent's browser.
 *
 * <p>Failures never propagate: geocoding is an enrichment, not a requirement. A
 * property save must never fail because an external geocoder is slow, rate-limited,
 * or unreachable — callers get an empty result and matching falls back to the
 * existing city/postal-code text logic (see PropertyMatchingService).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GeocodingService {

    private final GeocodingProperties props;

    private RestClient client;

    @PostConstruct
    void init() {
        client = RestClient.builder()
            .baseUrl(props.getBaseUrl())
            .defaultHeader("User-Agent", props.getUserAgent())
            .build();
    }

    public record GeoPoint(BigDecimal latitude, BigDecimal longitude) {}

    /**
     * Forward-geocode a property address. Returns empty when geocoding is disabled,
     * the address doesn't resolve, or on any network/parsing failure.
     */
    public Optional<GeoPoint> geocodeAddress(String street, String houseNumber, String postalCode,
                                              String city, String country) {
        if (!props.isEnabled()) {
            return Optional.empty();
        }
        String query = buildAddressQuery(street, houseNumber, postalCode, city, country);
        if (query.isBlank()) {
            return Optional.empty();
        }

        try {
            JsonNode results = client.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/search")
                    .queryParam("format", "json")
                    .queryParam("limit", 1)
                    .queryParam("q", query)
                    .build())
                .retrieve()
                .body(JsonNode.class);

            if (results == null || !results.isArray() || results.isEmpty()) {
                log.debug("Geocoding found no result for: {}", query);
                return Optional.empty();
            }
            return Optional.of(toGeoPoint(results.get(0)));
        } catch (Exception e) {
            log.warn("Geocoding failed for '{}': {}", query, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Strukturierte Adressauflösung für die Formular-Vervollständigung (Issue #29).
     *
     * <p>Bewusst auf Deutschland begrenzt ({@code countrycodes=de}): weder das
     * 5-Ziffern-PLZ-Format noch die Annahme "PLZ bestimmt den Ort" gelten international,
     * und ein falsch gefülltes Feld ist schlimmer als ein leeres — nach Ort und PLZ wird
     * später gefiltert und gematcht.</p>
     *
     * <p>Gleicher Fail-Soft-Vertrag wie die übrigen Methoden: jeder Fehler ergibt
     * {@link Optional#empty()}, das Formular bleibt normal ausfüllbar.</p>
     */
    public Optional<AddressLookupDto> lookupAddress(String street, String houseNumber,
                                                     String postalCode, String city) {
        if (!props.isEnabled()) {
            return Optional.empty();
        }
        String query = buildAddressQuery(street, houseNumber, postalCode, city, null);
        if (query.isBlank()) {
            return Optional.empty();
        }

        try {
            JsonNode results = client.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/search")
                    .queryParam("format", "json")
                    // Ohne addressdetails liefert Nominatim gar kein address-Objekt.
                    .queryParam("addressdetails", 1)
                    .queryParam("countrycodes", "de")
                    .queryParam("limit", 1)
                    .queryParam("q", query)
                    .build())
                .retrieve()
                .body(JsonNode.class);

            if (results == null || !results.isArray() || results.isEmpty()) {
                log.debug("Address lookup found no result for: {}", query);
                return Optional.empty();
            }
            return Optional.of(toAddressLookup(results.get(0)));
        } catch (Exception e) {
            log.warn("Address lookup failed for '{}': {}", query, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Nominatim benennt die Ortsangabe je nach Groesse anders: {@code city} in
     * Grossstaedten, {@code town} in Kleinstaedten, {@code village} auf dem Land.
     * Wer nur {@code city} liest, bekommt fuer die halbe Republik nichts.
     */
    // Package-private statt private: die Feld-Zuordnung ist die eigentliche Logik hier
    // und wird direkt getestet. Diese Klasse mockt bewusst kein HTTP (siehe
    // GeocodingServiceTest), also gaebe es sonst keinen Weg an die Zuordnung heran.
    AddressLookupDto toAddressLookup(JsonNode node) {
        JsonNode a = node.path("address");
        return AddressLookupDto.builder()
            .road(text(a, "road"))
            .houseNumber(text(a, "house_number"))
            .postalCode(text(a, "postcode"))
            .city(firstNonBlank(text(a, "city"), text(a, "town"), text(a, "village"), text(a, "municipality")))
            .district(firstNonBlank(text(a, "suburb"), text(a, "city_district"), text(a, "borough")))
            .state(text(a, "state"))
            .country(text(a, "country"))
            .latitude(node.hasNonNull("lat") ? new BigDecimal(node.path("lat").asText()) : null)
            .longitude(node.hasNonNull("lon") ? new BigDecimal(node.path("lon").asText()) : null)
            .build();
    }

    private String text(JsonNode node, String field) {
        return node.hasNonNull(field) ? node.get(field).asText() : null;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    /**
     * Reverse-geocode a coordinate pair into a human-readable label — used to show
     * "what address is this pin actually pointing at" above a read-only search-radius
     * map, since a client's search criteria only stores lat/lng/radius, not an address.
     * Same fail-soft contract as {@link #geocodeAddress}.
     */
    public Optional<String> reverseGeocode(BigDecimal latitude, BigDecimal longitude) {
        if (!props.isEnabled() || latitude == null || longitude == null) {
            return Optional.empty();
        }

        try {
            JsonNode result = client.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/reverse")
                    .queryParam("format", "json")
                    .queryParam("lat", latitude.toPlainString())
                    .queryParam("lon", longitude.toPlainString())
                    .build())
                .retrieve()
                .body(JsonNode.class);

            if (result == null || !result.hasNonNull("display_name")) {
                return Optional.empty();
            }
            return Optional.of(result.get("display_name").asText());
        } catch (Exception e) {
            log.warn("Reverse geocoding failed for {},{}: {}", latitude, longitude, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Address search-as-you-type for the map picker's search box. Same fail-soft
     * contract as {@link #geocodeAddress}: any failure yields an empty list.
     */
    public List<GeocodingSuggestionDto> search(String query) {
        if (!props.isEnabled() || query == null || query.isBlank()) {
            return List.of();
        }

        try {
            JsonNode results = client.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/search")
                    .queryParam("format", "json")
                    .queryParam("limit", 5)
                    .queryParam("q", query)
                    .build())
                .retrieve()
                .body(JsonNode.class);

            if (results == null || !results.isArray()) {
                return List.of();
            }

            List<GeocodingSuggestionDto> suggestions = new ArrayList<>();
            for (JsonNode node : results) {
                suggestions.add(GeocodingSuggestionDto.builder()
                    .label(node.path("display_name").asText())
                    .latitude(new BigDecimal(node.path("lat").asText()))
                    .longitude(new BigDecimal(node.path("lon").asText()))
                    .build());
            }
            return suggestions;
        } catch (Exception e) {
            log.warn("Geocoding search failed for '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    private GeoPoint toGeoPoint(JsonNode node) {
        return new GeoPoint(
            new BigDecimal(node.path("lat").asText()),
            new BigDecimal(node.path("lon").asText())
        );
    }

    private String buildAddressQuery(String street, String houseNumber, String postalCode,
                                      String city, String country) {
        StringBuilder query = new StringBuilder();
        if (street != null && !street.isBlank()) {
            query.append(street);
            if (houseNumber != null && !houseNumber.isBlank()) {
                query.append(" ").append(houseNumber);
            }
        }
        if (postalCode != null && !postalCode.isBlank()) {
            if (query.length() > 0) query.append(", ");
            query.append(postalCode);
        }
        if (city != null && !city.isBlank()) {
            if (query.length() > 0) query.append(" ");
            query.append(city);
        }
        if (country != null && !country.isBlank()) {
            if (query.length() > 0) query.append(", ");
            query.append(country);
        }
        return query.toString();
    }
}
