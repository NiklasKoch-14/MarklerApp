package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GeocodingProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marklerapp.crm.dto.AddressLookupDto;
import com.marklerapp.crm.dto.GeocodingSuggestionDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * GeocodingService talks to a live external service (Nominatim), so there's no
 * existing precedent in this codebase for mocking a RestClient-based service — the
 * project's only other one, SupabaseStorageService, has no test either. Rather than
 * introduce new HTTP-mocking infrastructure for a single service, this covers the
 * fail-soft contract that PropertyService and the geo-matching logic actually depend
 * on: geocoding must never throw, and must return "no result" when disabled or given
 * a nonsensical query — real network parsing is exercised manually/in Docker.
 */
class GeocodingServiceTest {

    private GeocodingService geocodingService;

    @BeforeEach
    void setUp() {
        GeocodingProperties props = new GeocodingProperties();
        props.setEnabled(true);
        geocodingService = new GeocodingService(props);
        geocodingService.init();
    }

    @Test
    void geocodeAddress_WhenDisabled_ReturnsEmptyWithoutCallingOut() {
        GeocodingProperties props = new GeocodingProperties();
        props.setEnabled(false);
        GeocodingService disabled = new GeocodingService(props);
        disabled.init();

        Optional<GeocodingService.GeoPoint> result =
            disabled.geocodeAddress("Hauptstraße", "1", "10115", "Berlin", "Germany");

        assertThat(result).isEmpty();
    }

    @Test
    void geocodeAddress_WithBlankAddress_ReturnsEmptyWithoutCallingOut() {
        Optional<GeocodingService.GeoPoint> result =
            geocodingService.geocodeAddress(null, null, null, null, null);

        assertThat(result).isEmpty();
    }

    @Test
    void search_WhenDisabled_ReturnsEmptyList() {
        GeocodingProperties props = new GeocodingProperties();
        props.setEnabled(false);
        GeocodingService disabled = new GeocodingService(props);
        disabled.init();

        List<GeocodingSuggestionDto> results = disabled.search("Berlin");

        assertThat(results).isEmpty();
    }

    @Test
    void search_WithBlankQuery_ReturnsEmptyListWithoutCallingOut() {
        List<GeocodingSuggestionDto> results = geocodingService.search("   ");

        assertThat(results).isEmpty();
    }

    @Test
    void geocodeAddress_WhenUnderlyingHostIsUnreachable_FailsSoftInsteadOfThrowing() {
        // Points at a base URL that can't resolve, standing in for "Nominatim is down/
        // rate-limited/unreachable" — the one failure mode PropertyService's save path
        // absolutely must survive without the whole request blowing up.
        GeocodingProperties props = new GeocodingProperties();
        props.setEnabled(true);
        props.setBaseUrl("http://geocoding.invalid.marklerapp.test");
        GeocodingService unreachable = new GeocodingService(props);
        unreachable.init();

        Optional<GeocodingService.GeoPoint> result =
            unreachable.geocodeAddress("Hauptstraße", "1", "10115", "Berlin", "Germany");

        assertThat(result).isEmpty();
    }

    // ========================================
    // Adressauflösung (Issue #29)
    // ========================================

    private JsonNode json(String raw) throws Exception {
        return new ObjectMapper().readTree(raw);
    }

    @Test
    void toAddressLookup_ReadsAllComponents() throws Exception {
        JsonNode node = json("""
            {
              "lat": "50.7374", "lon": "7.0982",
              "address": {
                "road": "Hauptstraße", "house_number": "12",
                "postcode": "53111", "city": "Bonn",
                "suburb": "Zentrum", "state": "Nordrhein-Westfalen",
                "country": "Deutschland"
              }
            }
            """);

        AddressLookupDto dto = geocodingService.toAddressLookup(node);

        assertThat(dto.getRoad()).isEqualTo("Hauptstraße");
        assertThat(dto.getHouseNumber()).isEqualTo("12");
        assertThat(dto.getPostalCode()).isEqualTo("53111");
        assertThat(dto.getCity()).isEqualTo("Bonn");
        assertThat(dto.getDistrict()).isEqualTo("Zentrum");
        assertThat(dto.getState()).isEqualTo("Nordrhein-Westfalen");
        assertThat(dto.getLatitude()).isNotNull();
    }

    @Test
    void toAddressLookup_FallsBackFromCityToTownAndVillage() throws Exception {
        // Nominatim benennt den Ort je nach Groesse anders. Wer nur "city" liest,
        // bekommt fuer Kleinstaedte und Doerfer gar nichts -- also fuer die halbe Republik.
        assertThat(geocodingService.toAddressLookup(
                json("{\"address\":{\"town\":\"Königswinter\"}}")).getCity())
                .isEqualTo("Königswinter");

        assertThat(geocodingService.toAddressLookup(
                json("{\"address\":{\"village\":\"Unkel\"}}")).getCity())
                .isEqualTo("Unkel");

        assertThat(geocodingService.toAddressLookup(
                json("{\"address\":{\"municipality\":\"Verbandsgemeinde\"}}")).getCity())
                .isEqualTo("Verbandsgemeinde");
    }

    @Test
    void toAddressLookup_PrefersCityOverTheFallbacks() throws Exception {
        AddressLookupDto dto = geocodingService.toAddressLookup(
                json("{\"address\":{\"city\":\"Bonn\",\"town\":\"Falsch\",\"village\":\"Auch falsch\"}}"));

        assertThat(dto.getCity()).isEqualTo("Bonn");
    }

    @Test
    void toAddressLookup_WithoutAddressBlock_YieldsNullsInsteadOfThrowing() throws Exception {
        // Ohne addressdetails=1 liefert Nominatim gar kein address-Objekt.
        AddressLookupDto dto = geocodingService.toAddressLookup(json("{\"lat\":\"1\",\"lon\":\"2\"}"));

        assertThat(dto.getCity()).isNull();
        assertThat(dto.getPostalCode()).isNull();
        assertThat(dto.getState()).isNull();
    }

    @Test
    void lookupAddress_WhenDisabled_ReturnsEmptyWithoutCallingOut() {
        GeocodingProperties props = new GeocodingProperties();
        props.setEnabled(false);
        GeocodingService disabled = new GeocodingService(props);
        disabled.init();

        assertThat(disabled.lookupAddress(null, null, "53111", null)).isEmpty();
    }

    @Test
    void lookupAddress_WithNothingToSearchFor_ReturnsEmptyWithoutCallingOut() {
        assertThat(geocodingService.lookupAddress(null, null, null, null)).isEmpty();
    }
}
