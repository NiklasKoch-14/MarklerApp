package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.marklerapp.crm.entity.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request DTO for updating an existing property.
 *
 * <p>This DTO contains fields that can be updated for an existing property.
 * All fields are optional to support partial updates (PATCH semantics).
 * Only fields that are not null will be updated.</p>
 *
 * <p>Key differences from CreatePropertyRequest:
 * <ul>
 *   <li>All fields are optional (nullable)</li>
 *   <li>Validation only applies if field is provided</li>
 *   <li>Supports partial updates</li>
 * </ul>
 * </p>
 *
 * @see PropertyDto
 * @see CreatePropertyRequest
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdatePropertyRequest {

    // ========================================
    // Basic Information
    // ========================================

    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    private PropertyType propertyType;

    private ListingType listingType;

    private PropertyStatus status;

    // ========================================
    // Location Information
    // ========================================

    @Size(max = 200, message = "Street address must not exceed 200 characters")
    private String addressStreet;

    @Size(max = 20, message = "House number must not exceed 20 characters")
    private String addressHouseNumber;

    @Size(max = 100, message = "City must not exceed 100 characters")
    private String addressCity;

    @Pattern(regexp = "^[0-9]{5}$|^$", message = "Postal code must be 5 digits or empty")
    private String addressPostalCode;

    @Size(max = 100, message = "State must not exceed 100 characters")
    private String addressState;

    @Size(max = 100, message = "District must not exceed 100 characters")
    private String addressDistrict;

    // ========================================
    // Property Specifications
    // ========================================

    @DecimalMin(value = "0.0", message = "Living area must be positive")
    @DecimalMax(value = "10000.0", message = "Living area must not exceed 10,000 sqm")
    private BigDecimal livingAreaSqm;

    @DecimalMin(value = "0.0", message = "Total area must be positive")
    @DecimalMax(value = "100000.0", message = "Total area must not exceed 100,000 sqm")
    private BigDecimal totalAreaSqm;

    @DecimalMin(value = "0.0", message = "Plot area must be positive")
    @DecimalMax(value = "1000000.0", message = "Plot area must not exceed 1,000,000 sqm")
    private BigDecimal plotAreaSqm;

    @DecimalMin(value = "0.5", message = "Rooms must be at least 0.5")
    @DecimalMax(value = "50.0", message = "Rooms must not exceed 50")
    private BigDecimal rooms;

    @Min(value = 0, message = "Bedrooms must be non-negative")
    @Max(value = 20, message = "Bedrooms must not exceed 20")
    private Integer bedrooms;

    @Min(value = 0, message = "Bathrooms must be non-negative")
    @Max(value = 20, message = "Bathrooms must not exceed 20")
    private Integer bathrooms;

    @Min(value = 1, message = "Floors must be at least 1")
    @Max(value = 100, message = "Floors must not exceed 100")
    private Integer floors;

    @Min(value = -5, message = "Floor number must be at least -5 (basement)")
    @Max(value = 100, message = "Floor number must not exceed 100")
    private Integer floorNumber;

    @Min(value = 1000, message = "Construction year must be at least 1000")
    @Max(value = 3000, message = "Construction year must not exceed 3000")
    private Integer constructionYear;

    @Min(value = 1000, message = "Last renovation year must be at least 1000")
    @Max(value = 3000, message = "Last renovation year must not exceed 3000")
    private Integer lastRenovationYear;

    // ========================================
    // Financial Information
    // ========================================

    @DecimalMin(value = "0.0", message = "Price must be non-negative")
    @DecimalMax(value = "99999999.99", message = "Price exceeds maximum allowed value")
    private BigDecimal price;

    @DecimalMin(value = "0.0", message = "Price per sqm must be non-negative")
    private BigDecimal pricePerSqm;

    @DecimalMin(value = "0.0", message = "Additional costs must be non-negative")
    private BigDecimal additionalCosts;

    @DecimalMin(value = "0.0", message = "Heating costs must be non-negative")
    private BigDecimal heatingCosts;

    @DecimalMin(value = "0.0", message = "Commission must be non-negative")
    private BigDecimal commission;

    // ========================================
    // Features and Amenities
    // ========================================

    private Boolean hasElevator;
    private Boolean hasBalcony;
    private Boolean hasTerrace;
    private Boolean hasGarden;
    private Boolean hasGarage;
    private Boolean hasParking;
    private Boolean hasBasement;
    private Boolean hasAttic;
    private Boolean isBarrierFree;
    private Boolean petsAllowed;
    private Boolean furnished;

    // ========================================
    // Energy Efficiency
    // ========================================

    @Size(max = 10, message = "Energy efficiency class must not exceed 10 characters")
    private String energyEfficiencyClass;

    @DecimalMin(value = "0.0", message = "Energy consumption must be non-negative")
    @DecimalMax(value = "1000.0", message = "Energy consumption must not exceed 1000 kWh/m²a")
    private BigDecimal energyConsumptionKwh;

    private HeatingType heatingType;

    // ========================================
    // Additional Fields
    // ========================================

    private LocalDate availableFrom;

    @Pattern(regexp = "^[+]?[0-9\\s\\-()]*$|^$", message = "Phone number format is invalid")
    @Size(max = 20, message = "Contact phone must not exceed 20 characters")
    private String contactPhone;

    @Email(message = "Contact email should be valid")
    private String contactEmail;

    @Size(max = 500, message = "Virtual tour URL must not exceed 500 characters")
    private String virtualTourUrl;

    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Check if this is an empty update request (no fields to update).
     *
     * @return true if all fields are null
     */
    public boolean isEmpty() {
        return title == null && description == null &&
               propertyType == null && listingType == null && status == null &&
               addressStreet == null && addressCity == null && addressPostalCode == null &&
               livingAreaSqm == null && rooms == null &&
               price == null && pricePerSqm == null &&
               hasElevator == null && hasBalcony == null && hasGarden == null &&
               energyEfficiencyClass == null && heatingType == null &&
               availableFrom == null && contactPhone == null && contactEmail == null &&
               notes == null;
    }

    /**
     * Check if basic property information is being updated.
     *
     * @return true if title, description, type, or listing type is set
     */
    public boolean hasBasicInfoUpdate() {
        return title != null || description != null ||
               propertyType != null || listingType != null || status != null;
    }

    /**
     * Check if location information is being updated.
     *
     * @return true if any address field is set
     */
    public boolean hasLocationUpdate() {
        return addressStreet != null || addressCity != null ||
               addressPostalCode != null || addressState != null || addressDistrict != null;
    }

    /**
     * Check if financial information is being updated.
     *
     * @return true if any price field is set
     */
    public boolean hasFinancialUpdate() {
        return price != null || pricePerSqm != null ||
               additionalCosts != null || heatingCosts != null || commission != null;
    }

    /**
     * Check if features are being updated.
     *
     * @return true if any feature field is set
     */
    public boolean hasFeaturesUpdate() {
        return hasElevator != null || hasBalcony != null || hasTerrace != null ||
               hasGarden != null || hasGarage != null || hasParking != null ||
               hasBasement != null || hasAttic != null || isBarrierFree != null ||
               petsAllowed != null || furnished != null;
    }
}
