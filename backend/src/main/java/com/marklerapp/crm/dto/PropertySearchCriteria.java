package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.marklerapp.crm.entity.HeatingType;
import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.PropertyType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO for advanced property search criteria.
 *
 * <p>This DTO provides comprehensive search capabilities for properties with support for:
 * <ul>
 *   <li>Property type and status filtering</li>
 *   <li>Price range filtering</li>
 *   <li>Area (sqm) range filtering</li>
 *   <li>Room count filtering</li>
 *   <li>Location-based filtering (city, postal code, state)</li>
 *   <li>Feature-based filtering (elevator, balcony, garage, etc.)</li>
 *   <li>Energy efficiency filtering</li>
 *   <li>Date-based filtering</li>
 * </ul>
 * </p>
 *
 * <p>All fields are optional to allow flexible search combinations.
 * Search results will include properties matching ALL specified criteria (AND logic).</p>
 *
 * @see PropertyDto
 * @see com.marklerapp.crm.entity.Property
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertySearchCriteria {

    // ========================================
    // Property Type and Status
    // ========================================

    /**
     * Filter by property type (e.g., APARTMENT, HOUSE, VILLA)
     */
    private PropertyType propertyType;

    /**
     * Filter by multiple property types (OR logic within types)
     */
    private List<PropertyType> propertyTypes;

    /**
     * Filter by listing type (SALE, RENT, LEASE)
     */
    private ListingType listingType;

    /**
     * Filter by multiple listing types (OR logic within types)
     */
    private List<ListingType> listingTypes;

    /**
     * Filter by property status (e.g., AVAILABLE, RESERVED, SOLD)
     */
    private PropertyStatus status;

    /**
     * Filter by multiple statuses (OR logic within statuses)
     */
    private List<PropertyStatus> statuses;

    // ========================================
    // Price Filtering
    // ========================================

    /**
     * Minimum price (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Minimum price must be non-negative")
    @DecimalMax(value = "99999999.99", message = "Minimum price exceeds maximum allowed value")
    private BigDecimal minPrice;

    /**
     * Maximum price (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Maximum price must be non-negative")
    @DecimalMax(value = "99999999.99", message = "Maximum price exceeds maximum allowed value")
    private BigDecimal maxPrice;

    /**
     * Minimum price per square meter (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Minimum price per sqm must be non-negative")
    private BigDecimal minPricePerSqm;

    /**
     * Maximum price per square meter (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Maximum price per sqm must be non-negative")
    private BigDecimal maxPricePerSqm;

    // ========================================
    // Area Filtering
    // ========================================

    /**
     * Minimum living area in square meters (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Minimum living area must be non-negative")
    @DecimalMax(value = "10000.0", message = "Minimum living area must not exceed 10,000 sqm")
    private BigDecimal minLivingArea;

    /**
     * Maximum living area in square meters (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Maximum living area must be non-negative")
    @DecimalMax(value = "10000.0", message = "Maximum living area must not exceed 10,000 sqm")
    private BigDecimal maxLivingArea;

    /**
     * Minimum total area in square meters (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Minimum total area must be non-negative")
    @DecimalMax(value = "100000.0", message = "Minimum total area must not exceed 100,000 sqm")
    private BigDecimal minTotalArea;

    /**
     * Maximum total area in square meters (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Maximum total area must be non-negative")
    @DecimalMax(value = "100000.0", message = "Maximum total area must not exceed 100,000 sqm")
    private BigDecimal maxTotalArea;

    /**
     * Minimum plot area in square meters (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Minimum plot area must be non-negative")
    @DecimalMax(value = "1000000.0", message = "Minimum plot area must not exceed 1,000,000 sqm")
    private BigDecimal minPlotArea;

    /**
     * Maximum plot area in square meters (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Maximum plot area must be non-negative")
    @DecimalMax(value = "1000000.0", message = "Maximum plot area must not exceed 1,000,000 sqm")
    private BigDecimal maxPlotArea;

    // ========================================
    // Room Filtering
    // ========================================

    /**
     * Minimum number of rooms (inclusive)
     */
    @DecimalMin(value = "0.5", message = "Minimum rooms must be at least 0.5")
    @DecimalMax(value = "50.0", message = "Minimum rooms must not exceed 50")
    private BigDecimal minRooms;

    /**
     * Maximum number of rooms (inclusive)
     */
    @DecimalMin(value = "0.5", message = "Maximum rooms must be at least 0.5")
    @DecimalMax(value = "50.0", message = "Maximum rooms must not exceed 50")
    private BigDecimal maxRooms;

    /**
     * Minimum number of bedrooms (inclusive)
     */
    @Min(value = 0, message = "Minimum bedrooms must be non-negative")
    @Max(value = 20, message = "Minimum bedrooms must not exceed 20")
    private Integer minBedrooms;

    /**
     * Maximum number of bedrooms (inclusive)
     */
    @Min(value = 0, message = "Maximum bedrooms must be non-negative")
    @Max(value = 20, message = "Maximum bedrooms must not exceed 20")
    private Integer maxBedrooms;

    /**
     * Minimum number of bathrooms (inclusive)
     */
    @Min(value = 0, message = "Minimum bathrooms must be non-negative")
    @Max(value = 20, message = "Minimum bathrooms must not exceed 20")
    private Integer minBathrooms;

    /**
     * Maximum number of bathrooms (inclusive)
     */
    @Min(value = 0, message = "Maximum bathrooms must be non-negative")
    @Max(value = 20, message = "Maximum bathrooms must not exceed 20")
    private Integer maxBathrooms;

    // ========================================
    // Location Filtering
    // ========================================

    /**
     * Filter by city (exact match, case-insensitive)
     */
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    /**
     * Filter by multiple cities (OR logic)
     */
    private List<String> cities;

    /**
     * Filter by postal code (exact match)
     */
    @Pattern(regexp = "^[0-9]{5}$|^$", message = "Postal code must be 5 digits or empty")
    private String postalCode;

    /**
     * Filter by multiple postal codes (OR logic)
     */
    private List<String> postalCodes;

    /**
     * Filter by state/region (case-insensitive)
     */
    @Size(max = 100, message = "State must not exceed 100 characters")
    private String state;

    /**
     * Filter by district/neighborhood (case-insensitive)
     */
    @Size(max = 100, message = "District must not exceed 100 characters")
    private String district;

    /**
     * Filter by country (case-insensitive)
     */
    @Size(max = 100, message = "Country must not exceed 100 characters")
    private String country;

    // ========================================
    // Feature Filtering
    // ========================================

    /**
     * Filter by elevator availability
     */
    private Boolean hasElevator;

    /**
     * Filter by balcony availability
     */
    private Boolean hasBalcony;

    /**
     * Filter by terrace availability
     */
    private Boolean hasTerrace;

    /**
     * Filter by garden availability
     */
    private Boolean hasGarden;

    /**
     * Filter by garage availability
     */
    private Boolean hasGarage;

    /**
     * Filter by parking availability
     */
    private Boolean hasParking;

    /**
     * Filter by basement availability
     */
    private Boolean hasBasement;

    /**
     * Filter by attic availability
     */
    private Boolean hasAttic;

    /**
     * Filter by barrier-free accessibility
     */
    private Boolean isBarrierFree;

    /**
     * Filter by pets allowed
     */
    private Boolean petsAllowed;

    /**
     * Filter by furnished status
     */
    private Boolean furnished;

    // ========================================
    // Building Details
    // ========================================

    /**
     * Minimum construction year (inclusive)
     */
    @Min(value = 1000, message = "Minimum construction year must be at least 1000")
    @Max(value = 3000, message = "Minimum construction year must not exceed 3000")
    private Integer minConstructionYear;

    /**
     * Maximum construction year (inclusive)
     */
    @Min(value = 1000, message = "Maximum construction year must be at least 1000")
    @Max(value = 3000, message = "Maximum construction year must not exceed 3000")
    private Integer maxConstructionYear;

    /**
     * Minimum floor number (inclusive)
     */
    @Min(value = -5, message = "Minimum floor number must be at least -5 (basement)")
    @Max(value = 100, message = "Minimum floor number must not exceed 100")
    private Integer minFloorNumber;

    /**
     * Maximum floor number (inclusive)
     */
    @Min(value = -5, message = "Maximum floor number must be at least -5 (basement)")
    @Max(value = 100, message = "Maximum floor number must not exceed 100")
    private Integer maxFloorNumber;

    // ========================================
    // Energy Efficiency
    // ========================================

    /**
     * Filter by energy efficiency class (e.g., A+, A, B, C, etc.)
     */
    @Size(max = 10, message = "Energy efficiency class must not exceed 10 characters")
    private String energyEfficiencyClass;

    /**
     * Filter by multiple energy efficiency classes (OR logic)
     */
    private List<String> energyEfficiencyClasses;

    /**
     * Maximum energy consumption in kWh/m²a (inclusive)
     */
    @DecimalMin(value = "0.0", message = "Maximum energy consumption must be non-negative")
    @DecimalMax(value = "1000.0", message = "Maximum energy consumption must not exceed 1000 kWh/m²a")
    private BigDecimal maxEnergyConsumption;

    /**
     * Filter by heating type
     */
    private HeatingType heatingType;

    /**
     * Filter by multiple heating types (OR logic)
     */
    private List<HeatingType> heatingTypes;

    // ========================================
    // Date Filtering
    // ========================================

    /**
     * Filter by available from date (properties available on or after this date)
     */
    private LocalDate availableFrom;

    /**
     * Filter by available until date (properties available on or before this date)
     */
    private LocalDate availableTo;

    // ========================================
    // Text Search
    // ========================================

    /**
     * Search in title and description (case-insensitive, partial match)
     */
    @Size(max = 200, message = "Search query must not exceed 200 characters")
    private String searchQuery;

    // ========================================
    // Sorting and Pagination
    // ========================================

    /**
     * Sort field (e.g., "price", "livingAreaSqm", "createdAt")
     * Default: "createdAt"
     */
    @Size(max = 50, message = "Sort field must not exceed 50 characters")
    private String sortBy;

    /**
     * Sort direction ("ASC" or "DESC")
     * Default: "DESC"
     */
    @Pattern(regexp = "^(ASC|DESC|asc|desc)$|^$", message = "Sort direction must be ASC or DESC")
    private String sortDirection;

    /**
     * Page number (0-based)
     * Default: 0
     */
    @Min(value = 0, message = "Page number must be non-negative")
    private Integer page;

    /**
     * Page size (number of results per page)
     * Default: 20
     */
    @Min(value = 1, message = "Page size must be at least 1")
    @Max(value = 100, message = "Page size must not exceed 100")
    private Integer size;

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Check if any search criteria are specified.
     *
     * @return true if at least one search criterion is set
     */
    public boolean hasAnyCriteria() {
        return propertyType != null || propertyTypes != null ||
               listingType != null || listingTypes != null ||
               status != null || statuses != null ||
               minPrice != null || maxPrice != null ||
               minLivingArea != null || maxLivingArea != null ||
               minRooms != null || maxRooms != null ||
               city != null || cities != null ||
               postalCode != null || postalCodes != null ||
               state != null || district != null ||
               hasElevator != null || hasBalcony != null ||
               hasGarden != null || hasParking != null ||
               searchQuery != null;
    }

    /**
     * Check if price range is valid (min <= max).
     *
     * @return true if price range is valid or not specified
     */
    public boolean isValidPriceRange() {
        if (minPrice == null || maxPrice == null) {
            return true;
        }
        return minPrice.compareTo(maxPrice) <= 0;
    }

    /**
     * Check if area range is valid (min <= max).
     *
     * @return true if area range is valid or not specified
     */
    public boolean isValidAreaRange() {
        if (minLivingArea == null || maxLivingArea == null) {
            return true;
        }
        return minLivingArea.compareTo(maxLivingArea) <= 0;
    }

    /**
     * Check if room range is valid (min <= max).
     *
     * @return true if room range is valid or not specified
     */
    public boolean isValidRoomRange() {
        if (minRooms == null || maxRooms == null) {
            return true;
        }
        return minRooms.compareTo(maxRooms) <= 0;
    }
}
