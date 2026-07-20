package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.GeocodingSuggestionDto;
import com.marklerapp.crm.service.GeocodingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
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
