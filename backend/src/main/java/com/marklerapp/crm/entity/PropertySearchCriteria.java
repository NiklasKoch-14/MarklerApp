package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.*;

import java.math.BigDecimal;

/**
 * Entity representing client's property search criteria and preferences.
 */
@Entity
@Table(name = "property_search_criteria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertySearchCriteria extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false, unique = true)
    private Client client;

    @Column(name = "min_square_meters")
    @Min(value = 10, message = "Minimum square meters must be at least 10")
    private Integer minSquareMeters;

    @Column(name = "max_square_meters")
    @Max(value = 10000, message = "Maximum square meters cannot exceed 10000")
    private Integer maxSquareMeters;

    @Column(name = "min_rooms")
    @Min(value = 1, message = "Minimum rooms must be at least 1")
    @Max(value = 20, message = "Minimum rooms cannot exceed 20")
    private Integer minRooms;

    @Column(name = "max_rooms")
    @Min(value = 1, message = "Maximum rooms must be at least 1")
    @Max(value = 20, message = "Maximum rooms cannot exceed 20")
    private Integer maxRooms;

    @Column(name = "min_budget", precision = 12, scale = 2)
    @DecimalMin(value = "0.0", inclusive = false, message = "Minimum budget must be positive")
    private BigDecimal minBudget;

    @Column(name = "max_budget", precision = 12, scale = 2)
    @DecimalMin(value = "0.0", inclusive = false, message = "Maximum budget must be positive")
    private BigDecimal maxBudget;

    // Kaltmiete (rent excluding utilities/heating) — relevant when the client's clientType is RENTER
    @Column(name = "min_cold_rent", precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = false, message = "Minimum cold rent must be positive")
    private BigDecimal minColdRent;

    @Column(name = "max_cold_rent", precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = false, message = "Maximum cold rent must be positive")
    private BigDecimal maxColdRent;

    // Warmmiete (rent including utilities/heating) — relevant when the client's clientType is RENTER
    @Column(name = "min_warm_rent", precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = false, message = "Minimum warm rent must be positive")
    private BigDecimal minWarmRent;

    @Column(name = "max_warm_rent", precision = 10, scale = 2)
    @DecimalMin(value = "0.0", inclusive = false, message = "Maximum warm rent must be positive")
    private BigDecimal maxWarmRent;

    @Column(name = "preferred_locations", length = 500)
    private String preferredLocations; // Comma-separated list — legacy free-text fallback,
                                        // kept alongside the map-based fields below for
                                        // clients whose criteria predate the location picker.

    // Map-based search location: a pin (lat/lng) plus a radius in km, set interactively
    // in the client form. When present, PropertyMatchingService prefers real-distance
    // matching over the text-based preferredLocations comparison.
    @Column(name = "latitude", precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "search_radius_km")
    @Min(value = 1, message = "Search radius must be at least 1 km")
    @Max(value = 200, message = "Search radius must not exceed 200 km")
    private Integer searchRadiusKm;

    // Hard-filters matching to properties within searchRadiusKm when true (default).
    // Unchecking it in the UI keeps the radius for scoring/ranking but stops excluding
    // properties outside it — an explicit opt-out, not a silent one.
    @Column(name = "restrict_to_search_radius", nullable = false)
    @Builder.Default
    private Boolean restrictToSearchRadius = true;

    @Column(name = "property_types", length = 200)
    private String propertyTypes; // Comma-separated list

    @Column(name = "additional_requirements", length = 1000)
    private String additionalRequirements;

    /**
     * Get preferred locations as an array
     */
    public String[] getPreferredLocationsArray() {
        if (preferredLocations == null || preferredLocations.trim().isEmpty()) {
            return new String[0];
        }
        return preferredLocations.split(",\\s*");
    }

    /**
     * Set preferred locations from an array
     */
    public void setPreferredLocationsArray(String[] locations) {
        if (locations == null || locations.length == 0) {
            this.preferredLocations = null;
        } else {
            this.preferredLocations = String.join(", ", locations);
        }
    }

    /**
     * Get property types as an array
     */
    public String[] getPropertyTypesArray() {
        if (propertyTypes == null || propertyTypes.trim().isEmpty()) {
            return new String[0];
        }
        return propertyTypes.split(",\\s*");
    }

    /**
     * Set property types from an array
     */
    public void setPropertyTypesArray(String[] types) {
        if (types == null || types.length == 0) {
            this.propertyTypes = null;
        } else {
            this.propertyTypes = String.join(", ", types);
        }
    }

    /**
     * Check if criteria has any budget constraints
     */
    public boolean hasBudgetConstraints() {
        return minBudget != null || maxBudget != null;
    }

    /**
     * Check if criteria has any rent constraints (cold or warm rent)
     */
    public boolean hasRentConstraints() {
        return minColdRent != null || maxColdRent != null || minWarmRent != null || maxWarmRent != null;
    }

    /**
     * Check if criteria has any size constraints
     */
    public boolean hasSizeConstraints() {
        return minSquareMeters != null || maxSquareMeters != null;
    }

    /**
     * Check if criteria has any room constraints
     */
    public boolean hasRoomConstraints() {
        return minRooms != null || maxRooms != null;
    }

    /**
     * Validate that min values are less than max values
     */
    @PrePersist
    @PreUpdate
    private void validateCriteria() {
        if (minSquareMeters != null && maxSquareMeters != null && minSquareMeters > maxSquareMeters) {
            throw new IllegalArgumentException("Minimum square meters cannot be greater than maximum");
        }

        if (minRooms != null && maxRooms != null && minRooms > maxRooms) {
            throw new IllegalArgumentException("Minimum rooms cannot be greater than maximum");
        }

        if (minBudget != null && maxBudget != null && minBudget.compareTo(maxBudget) > 0) {
            throw new IllegalArgumentException("Minimum budget cannot be greater than maximum");
        }

        if (minColdRent != null && maxColdRent != null && minColdRent.compareTo(maxColdRent) > 0) {
            throw new IllegalArgumentException("Minimum cold rent cannot be greater than maximum");
        }

        if (minWarmRent != null && maxWarmRent != null && minWarmRent.compareTo(maxWarmRent) > 0) {
            throw new IllegalArgumentException("Minimum warm rent cannot be greater than maximum");
        }
    }

    @Override
    public String toString() {
        return "PropertySearchCriteria{" +
                "id=" + getId() +
                ", minSquareMeters=" + minSquareMeters +
                ", maxSquareMeters=" + maxSquareMeters +
                ", minRooms=" + minRooms +
                ", maxRooms=" + maxRooms +
                ", minBudget=" + minBudget +
                ", maxBudget=" + maxBudget +
                '}';
    }
}