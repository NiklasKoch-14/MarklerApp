package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.marklerapp.crm.entity.*;
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
 * Response DTO for Property entity API responses.
 *
 * <p>This DTO is optimized for API responses and includes:
 * <ul>
 *   <li>All property data fields</li>
 *   <li>Computed/derived fields (formattedAddress, calculatedPricePerSqm, etc.)</li>
 *   <li>Audit timestamps</li>
 *   <li>Nested PropertyImageDto list</li>
 *   <li>Agent information (basic details)</li>
 *   <li>Statistics and metadata</li>
 * </ul>
 * </p>
 *
 * <p>This DTO does NOT include validation annotations since it's used only for responses.</p>
 *
 * @see PropertyDto
 * @see CreatePropertyRequest
 * @see UpdatePropertyRequest
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertyResponse {

    // ========================================
    // Identity
    // ========================================

    private UUID id;
    private UUID agentId;
    private String agentName;
    private String agentEmail;

    // ========================================
    // Basic Information
    // ========================================

    private String title;
    private String description;
    private PropertyType propertyType;
    private ListingType listingType;
    private PropertyStatus status;

    // ========================================
    // Location Information
    // ========================================

    private String addressStreet;
    private String addressHouseNumber;
    private String addressCity;
    private String addressPostalCode;
    private String addressState;
    private String addressCountry;
    private String addressDistrict;
    private String formattedAddress;

    // ========================================
    // Property Specifications
    // ========================================

    private BigDecimal livingAreaSqm;
    private BigDecimal totalAreaSqm;
    private BigDecimal plotAreaSqm;
    private BigDecimal rooms;
    private Integer bedrooms;
    private Integer bathrooms;
    private Integer floors;
    private Integer floorNumber;
    private Integer constructionYear;
    private Integer lastRenovationYear;

    // ========================================
    // Financial Information
    // ========================================

    private BigDecimal price;
    private BigDecimal pricePerSqm;
    private BigDecimal calculatedPricePerSqm;
    private BigDecimal additionalCosts;
    private BigDecimal heatingCosts;
    private BigDecimal commission;
    private BigDecimal totalMonthlyCosts; // For rentals: base rent + additional costs + heating

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

    // Summary of features for quick display
    private List<String> featureSummary;
    private Integer featureCount;

    // ========================================
    // Energy Efficiency
    // ========================================

    private String energyEfficiencyClass;
    private BigDecimal energyConsumptionKwh;
    private HeatingType heatingType;

    // ========================================
    // Additional Fields
    // ========================================

    private LocalDate availableFrom;
    private String contactPhone;
    private String contactEmail;
    private String virtualTourUrl;
    private String notes;

    // ========================================
    // GDPR Compliance
    // ========================================

    private Boolean dataProcessingConsent;
    private LocalDate consentDate;
    private Boolean hasValidConsent;

    // ========================================
    // Property Images
    // ========================================

    private List<PropertyImageDto> images;
    private PropertyImageDto mainImage;
    private String mainImageUrl;
    private Integer imageCount;

    // ========================================
    // Audit Fields
    // ========================================

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    // ========================================
    // Statistics and Metadata
    // ========================================

    private Integer viewCount;
    private Integer favoriteCount;
    private Integer inquiryCount;
    private LocalDateTime lastViewedAt;
    private LocalDateTime lastInquiryAt;

    /**
     * Number of days the property has been listed
     */
    private Integer daysOnMarket;

    /**
     * Property age in years (calculated from construction year)
     */
    private Integer propertyAge;

    /**
     * Years since last renovation
     */
    private Integer yearsSinceRenovation;

    /**
     * Indicates if this property is featured/highlighted
     */
    private Boolean isFeatured;

    /**
     * Indicates if this property is urgent/priority
     */
    private Boolean isUrgent;

    /**
     * External reference ID (for integration with external systems)
     */
    private String externalReferenceId;

    // ========================================
    // Computed Helper Methods
    // ========================================

    /**
     * Get formatted address.
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
     * Get calculated price per square meter.
     *
     * @return price per square meter
     */
    public BigDecimal getCalculatedPricePerSqm() {
        if (pricePerSqm != null) {
            return pricePerSqm;
        }

        if (calculatedPricePerSqm != null) {
            return calculatedPricePerSqm;
        }

        if (price != null && livingAreaSqm != null && livingAreaSqm.compareTo(BigDecimal.ZERO) > 0) {
            return price.divide(livingAreaSqm, 2, java.math.RoundingMode.HALF_UP);
        }

        return null;
    }

    /**
     * Get total monthly costs (for rental properties).
     *
     * @return total monthly costs
     */
    public BigDecimal getTotalMonthlyCosts() {
        if (totalMonthlyCosts != null) {
            return totalMonthlyCosts;
        }

        if (listingType != ListingType.RENT && listingType != ListingType.LEASE) {
            return null;
        }

        BigDecimal total = price != null ? price : BigDecimal.ZERO;

        if (additionalCosts != null) {
            total = total.add(additionalCosts);
        }

        if (heatingCosts != null) {
            total = total.add(heatingCosts);
        }

        return total.compareTo(BigDecimal.ZERO) > 0 ? total : null;
    }

    /**
     * Get image count.
     *
     * @return number of images
     */
    public Integer getImageCount() {
        if (imageCount != null) {
            return imageCount;
        }
        return images != null ? images.size() : 0;
    }

    /**
     * Get feature count.
     *
     * @return number of features enabled
     */
    public Integer getFeatureCount() {
        if (featureCount != null) {
            return featureCount;
        }

        int count = 0;
        if (Boolean.TRUE.equals(hasElevator)) count++;
        if (Boolean.TRUE.equals(hasBalcony)) count++;
        if (Boolean.TRUE.equals(hasTerrace)) count++;
        if (Boolean.TRUE.equals(hasGarden)) count++;
        if (Boolean.TRUE.equals(hasGarage)) count++;
        if (Boolean.TRUE.equals(hasParking)) count++;
        if (Boolean.TRUE.equals(hasBasement)) count++;
        if (Boolean.TRUE.equals(hasAttic)) count++;
        if (Boolean.TRUE.equals(isBarrierFree)) count++;
        if (Boolean.TRUE.equals(petsAllowed)) count++;
        if (Boolean.TRUE.equals(furnished)) count++;

        return count;
    }

    /**
     * Get property age in years.
     *
     * @return property age or null if construction year is not set
     */
    public Integer getPropertyAge() {
        if (propertyAge != null) {
            return propertyAge;
        }

        if (constructionYear != null) {
            return LocalDate.now().getYear() - constructionYear;
        }

        return null;
    }

    /**
     * Get years since last renovation.
     *
     * @return years since renovation or null if not renovated
     */
    public Integer getYearsSinceRenovation() {
        if (yearsSinceRenovation != null) {
            return yearsSinceRenovation;
        }

        if (lastRenovationYear != null) {
            return LocalDate.now().getYear() - lastRenovationYear;
        }

        return null;
    }

    /**
     * Get days on market.
     *
     * @return days since creation
     */
    public Integer getDaysOnMarket() {
        if (daysOnMarket != null) {
            return daysOnMarket;
        }

        if (createdAt != null) {
            return (int) java.time.temporal.ChronoUnit.DAYS.between(
                createdAt.toLocalDate(),
                LocalDate.now()
            );
        }

        return null;
    }

    /**
     * Check if property has valid GDPR consent.
     *
     * @return true if consent is valid
     */
    public Boolean getHasValidConsent() {
        if (hasValidConsent != null) {
            return hasValidConsent;
        }
        return Boolean.TRUE.equals(dataProcessingConsent) && consentDate != null;
    }

    /**
     * Check if property is available.
     *
     * @return true if status is AVAILABLE
     */
    public boolean isAvailable() {
        return status == PropertyStatus.AVAILABLE;
    }

    /**
     * Check if property is for sale.
     *
     * @return true if listing type is SALE
     */
    public boolean isForSale() {
        return listingType == ListingType.SALE;
    }

    /**
     * Check if property is for rent.
     *
     * @return true if listing type is RENT or LEASE
     */
    public boolean isForRent() {
        return listingType == ListingType.RENT || listingType == ListingType.LEASE;
    }
}
