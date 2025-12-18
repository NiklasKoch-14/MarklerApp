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
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Comprehensive DTO for Property entity operations.
 * Used for both request and response operations.
 *
 * <p>This DTO includes all property fields with proper validation annotations
 * for create and update operations, as well as computed fields for responses.</p>
 *
 * <p>For more specialized use cases, consider using:
 * <ul>
 *   <li>{@link CreatePropertyRequest} - For creating new properties</li>
 *   <li>{@link UpdatePropertyRequest} - For updating existing properties</li>
 *   <li>{@link PropertyResponse} - For API responses with computed fields</li>
 * </ul>
 * </p>
 *
 * @see Property
 * @see PropertyImageDto
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertyDto {

    /**
     * Unique identifier of the property (read-only for updates)
     */
    private UUID id;

    /**
     * Agent responsible for this property
     */
    private UUID agentId;

    // ========================================
    // Basic Information
    // ========================================

    @NotBlank(message = "Property title is required")
    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    @NotNull(message = "Property type is required")
    private PropertyType propertyType;

    @NotNull(message = "Listing type is required")
    private ListingType listingType;

    private PropertyStatus status;

    // ========================================
    // Location Information
    // ========================================

    @NotBlank(message = "Street address is required")
    @Size(max = 200, message = "Street address must not exceed 200 characters")
    private String addressStreet;

    @Size(max = 20, message = "House number must not exceed 20 characters")
    private String addressHouseNumber;

    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String addressCity;

    @NotBlank(message = "Postal code is required")
    @Pattern(regexp = "^[0-9]{5}$", message = "Postal code must be 5 digits")
    private String addressPostalCode;

    @Size(max = 100, message = "State must not exceed 100 characters")
    private String addressState;

    private String addressCountry;

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
    // Energy Efficiency (German EneV requirements)
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

    @Pattern(regexp = "^[+]?[0-9\\s\\-()]*$", message = "Phone number format is invalid")
    @Size(max = 20, message = "Contact phone must not exceed 20 characters")
    private String contactPhone;

    @Email(message = "Contact email should be valid")
    private String contactEmail;

    @Size(max = 500, message = "Virtual tour URL must not exceed 500 characters")
    private String virtualTourUrl;

    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;

    // ========================================
    // GDPR Compliance
    // ========================================

    /**
     * Indicates whether data processing consent has been given.
     * Required for GDPR compliance.
     */
    private Boolean dataProcessingConsent;

    /**
     * Date when GDPR consent was given.
     */
    private LocalDate consentDate;

    // ========================================
    // Property Images
    // ========================================

    /**
     * List of images associated with this property
     */
    private List<PropertyImageDto> images;

    // ========================================
    // Property Expose/Brochure
    // ========================================

    /**
     * Original filename of the expose (PDF brochure)
     */
    private String exposeFileName;

    /**
     * File size of the expose in bytes
     */
    private Long exposeFileSize;

    /**
     * Timestamp when the expose was uploaded
     */
    private LocalDateTime exposeUploadedAt;

    // ========================================
    // Audit Fields (Read-Only)
    // ========================================

    /**
     * Timestamp when the property was created (read-only)
     */
    private LocalDateTime createdAt;

    /**
     * Timestamp when the property was last updated (read-only)
     */
    private LocalDateTime updatedAt;

    // ========================================
    // Computed Fields (Read-Only)
    // ========================================

    /**
     * Formatted address string (computed field)
     */
    private String formattedAddress;

    /**
     * Calculated price per square meter (computed field)
     */
    private BigDecimal calculatedPricePerSqm;

    /**
     * URL of the main/primary image (computed field)
     */
    private String mainImageUrl;

    /**
     * Count of images (computed field)
     */
    private Integer imageCount;

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Get formatted address (computed field).
     * Constructs a human-readable address string from components.
     *
     * @return formatted address string
     */
    public String getFormattedAddress() {
        if (formattedAddress != null) {
            return formattedAddress;
        }

        StringBuilder address = new StringBuilder();

        if (addressStreet != null && !addressStreet.trim().isEmpty()) {
            address.append(addressStreet);
            if (addressHouseNumber != null && !addressHouseNumber.trim().isEmpty()) {
                address.append(" ").append(addressHouseNumber);
            }
        }

        if (addressPostalCode != null && !addressPostalCode.trim().isEmpty()) {
            if (address.length() > 0) address.append(", ");
            address.append(addressPostalCode);
        }

        if (addressCity != null && !addressCity.trim().isEmpty()) {
            if (address.length() > 0) address.append(" ");
            address.append(addressCity);
        }

        if (addressDistrict != null && !addressDistrict.trim().isEmpty()) {
            if (address.length() > 0) address.append(" (");
            address.append(addressDistrict).append(")");
        }

        return address.toString();
    }

    /**
     * Get calculated price per square meter (computed field).
     * If pricePerSqm is set, returns that value; otherwise calculates from price and livingAreaSqm.
     *
     * @return price per square meter
     */
    public BigDecimal getCalculatedPricePerSqm() {
        if (pricePerSqm != null) {
            return pricePerSqm;
        }

        if (price != null && livingAreaSqm != null && livingAreaSqm.compareTo(BigDecimal.ZERO) > 0) {
            return price.divide(livingAreaSqm, 2, java.math.RoundingMode.HALF_UP);
        }

        return calculatedPricePerSqm;
    }

    /**
     * Get image count (computed field).
     *
     * @return number of images associated with this property
     */
    public Integer getImageCount() {
        if (images != null) {
            return images.size();
        }
        return imageCount != null ? imageCount : 0;
    }
}
