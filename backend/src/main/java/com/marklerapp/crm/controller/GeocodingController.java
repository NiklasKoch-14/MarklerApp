package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.AddressLookupDto;
import com.marklerapp.crm.dto.GeocodingSuggestionDto;
import com.marklerapp.crm.service.GeocodingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

/**
 * Proxies address search to Nominatim so the frontend map picker never calls a
 * third-party geocoder directly — keeps the required User-Agent header and rate
 * limiting server-side, see {@link GeocodingService}.
 */
@RestController
@RequestMapping("/geocoding")
@RequiredArgsConstructor
@Tag(name = "Geocoding", description = "Address search for the map-based location picker")
public class GeocodingController {

    private final GeocodingService geocodingService;

    @GetMapping("/search")
    @Operation(summary = "Search addresses",
               description = "Proxied Nominatim address search, used by the map picker's search box to jump to a location.")
    public List<GeocodingSuggestionDto> search(
            @Parameter(description = "Free-text address query", required = true)
            @RequestParam String q) {
        return geocodingService.search(q);
    }

    /**
     * Adressauflösung für die Formular-Vervollständigung (Issue #29).
     *
     * <p>Läuft bewusst über diesen Proxy und nicht direkt aus dem Browser: Nominatims
     * Nutzungsrichtlinie verlangt einen aussagekräftigen User-Agent und begrenzt auf
     * eine Anfrage pro Sekunde — beides lässt sich clientseitig nicht zusichern.</p>
     */
    @GetMapping("/address")
    @Operation(summary = "Resolve address components",
               description = "Returns structured address parts (city, state, district, postcode) for "
                           + "form auto-completion. Germany only. Empty body when nothing resolves — "
                           + "the form stays usable either way.")
    public ResponseEntity<AddressLookupDto> address(
            @Parameter(description = "Postal code (5 digits)")
            @RequestParam(required = false) String postalCode,
            @Parameter(description = "City name")
            @RequestParam(required = false) String city,
            @Parameter(description = "Street name")
            @RequestParam(required = false) String street,
            @Parameter(description = "House number")
            @RequestParam(required = false) String houseNumber) {
        return geocodingService.lookupAddress(street, houseNumber, postalCode, city)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/reverse")
    @Operation(summary = "Reverse-geocode a coordinate",
               description = "Resolves a lat/lng pair to a human-readable address label, e.g. to show what address a client's search-radius pin points at.")
    public GeocodingSuggestionDto reverse(
            @Parameter(description = "Latitude", required = true)
            @RequestParam BigDecimal lat,
            @Parameter(description = "Longitude", required = true)
            @RequestParam BigDecimal lng) {
        String label = geocodingService.reverseGeocode(lat, lng).orElse(null);
        return GeocodingSuggestionDto.builder().label(label).latitude(lat).longitude(lng).build();
    }
}
