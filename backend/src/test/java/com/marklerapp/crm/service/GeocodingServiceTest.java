package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GeocodingProperties;
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
}
