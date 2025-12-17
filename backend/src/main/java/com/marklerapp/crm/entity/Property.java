package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Entity representing a property in the real estate CRM system.
 * Supports German real estate market requirements and standards.
 */
@Entity
@Table(name = "properties")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Property extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private Agent agent;

    @Column(name = "title", nullable = false)
    @NotBlank(message = "Property title is required")
    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    @Column(name = "property_type", nullable = false)
    @Enumerated(EnumType.STRING)
    @NotNull(message = "Property type is required")
    private PropertyType propertyType;

    @Column(name = "listing_type", nullable = false)
    @Enumerated(EnumType.STRING)
    @NotNull(message = "Listing type is required")
    private ListingType listingType;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PropertyStatus status = PropertyStatus.AVAILABLE;

    // Location fields
    @Column(name = "address_street", nullable = false)
    @NotBlank(message = "Street address is required")
    @Size(max = 200, message = "Street address must not exceed 200 characters")
    private String addressStreet;

    @Column(name = "address_house_number")
    @Size(max = 20, message = "House number must not exceed 20 characters")
    private String addressHouseNumber;

    @Column(name = "address_city", nullable = false)
    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String addressCity;

    @Column(name = "address_postal_code", nullable = false)
    @NotBlank(message = "Postal code is required")
    @Pattern(regexp = "^[0-9]{5}$", message = "Postal code must be 5 digits")
    private String addressPostalCode;

    @Column(name = "address_state")
    @Size(max = 100, message = "State must not exceed 100 characters")
    private String addressState;

    @Column(name = "address_country")
    @Builder.Default
    private String addressCountry = "Germany";

    @Column(name = "address_district")
    @Size(max = 100, message = "District must not exceed 100 characters")
    private String addressDistrict;

    // Property specifications
    @Column(name = "living_area_sqm")
    @DecimalMin(value = "0.0", message = "Living area must be positive")
    @DecimalMax(value = "10000.0", message = "Living area must not exceed 10,000 sqm")
    private BigDecimal livingAreaSqm;

    @Column(name = "total_area_sqm")
    @DecimalMin(value = "0.0", message = "Total area must be positive")
    @DecimalMax(value = "100000.0", message = "Total area must not exceed 100,000 sqm")
    private BigDecimal totalAreaSqm;

    @Column(name = "plot_area_sqm")
    @DecimalMin(value = "0.0", message = "Plot area must be positive")
    @DecimalMax(value = "1000000.0", message = "Plot area must not exceed 1,000,000 sqm")
    private BigDecimal plotAreaSqm;

    @Column(name = "rooms")
    @DecimalMin(value = "0.5", message = "Rooms must be at least 0.5")
    @DecimalMax(value = "50.0", message = "Rooms must not exceed 50")
    private BigDecimal rooms;

    @Column(name = "bedrooms")
    @Min(value = 0, message = "Bedrooms must be non-negative")
    @Max(value = 20, message = "Bedrooms must not exceed 20")
    private Integer bedrooms;

    @Column(name = "bathrooms")
    @Min(value = 0, message = "Bathrooms must be non-negative")
    @Max(value = 20, message = "Bathrooms must not exceed 20")
    private Integer bathrooms;

    @Column(name = "floors")
    @Min(value = 1, message = "Floors must be at least 1")
    @Max(value = 100, message = "Floors must not exceed 100")
    private Integer floors;

    @Column(name = "floor_number")
    @Min(value = -5, message = "Floor number must be at least -5 (basement)")
    @Max(value = 100, message = "Floor number must not exceed 100")
    private Integer floorNumber;

    @Column(name = "construction_year")
    @Min(value = 1000, message = "Construction year must be at least 1000")
    @Max(value = 3000, message = "Construction year must not exceed 3000")
    private Integer constructionYear;

    @Column(name = "last_renovation_year")
    @Min(value = 1000, message = "Last renovation year must be at least 1000")
    @Max(value = 3000, message = "Last renovation year must not exceed 3000")
    private Integer lastRenovationYear;

    // Financial information
    @Column(name = "price", precision = 12, scale = 2)
    @DecimalMin(value = "0.0", message = "Price must be non-negative")
    @DecimalMax(value = "99999999.99", message = "Price exceeds maximum allowed value")
    private BigDecimal price;

    @Column(name = "price_per_sqm", precision = 8, scale = 2)
    @DecimalMin(value = "0.0", message = "Price per sqm must be non-negative")
    private BigDecimal pricePerSqm;

    @Column(name = "additional_costs", precision = 10, scale = 2)
    @DecimalMin(value = "0.0", message = "Additional costs must be non-negative")
    private BigDecimal additionalCosts;

    @Column(name = "heating_costs", precision = 8, scale = 2)
    @DecimalMin(value = "0.0", message = "Heating costs must be non-negative")
    private BigDecimal heatingCosts;

    @Column(name = "commission", precision = 8, scale = 2)
    @DecimalMin(value = "0.0", message = "Commission must be non-negative")
    private BigDecimal commission;

    // Features and amenities
    @Column(name = "has_elevator")
    @Builder.Default
    private Boolean hasElevator = false;

    @Column(name = "has_balcony")
    @Builder.Default
    private Boolean hasBalcony = false;

    @Column(name = "has_terrace")
    @Builder.Default
    private Boolean hasTerrace = false;

    @Column(name = "has_garden")
    @Builder.Default
    private Boolean hasGarden = false;

    @Column(name = "has_garage")
    @Builder.Default
    private Boolean hasGarage = false;

    @Column(name = "has_parking")
    @Builder.Default
    private Boolean hasParking = false;

    @Column(name = "has_basement")
    @Builder.Default
    private Boolean hasBasement = false;

    @Column(name = "has_attic")
    @Builder.Default
    private Boolean hasAttic = false;

    @Column(name = "is_barrier_free")
    @Builder.Default
    private Boolean isBarrierFree = false;

    @Column(name = "pets_allowed")
    @Builder.Default
    private Boolean petsAllowed = false;

    @Column(name = "furnished")
    @Builder.Default
    private Boolean furnished = false;

    // Energy efficiency (German EneV requirements)
    @Column(name = "energy_efficiency_class")
    @Size(max = 10, message = "Energy efficiency class must not exceed 10 characters")
    private String energyEfficiencyClass;

    @Column(name = "energy_consumption_kwh")
    @DecimalMin(value = "0.0", message = "Energy consumption must be non-negative")
    @DecimalMax(value = "1000.0", message = "Energy consumption must not exceed 1000 kWh/m²a")
    private BigDecimal energyConsumptionKwh;

    @Column(name = "heating_type")
    @Enumerated(EnumType.STRING)
    private HeatingType heatingType;

    // Additional fields
    @Column(name = "available_from")
    private LocalDate availableFrom;

    @Column(name = "contact_phone")
    @Pattern(regexp = "^[+]?[0-9\\s\\-()]*$", message = "Phone number format is invalid")
    @Size(max = 20, message = "Contact phone must not exceed 20 characters")
    private String contactPhone;

    @Column(name = "contact_email")
    @Email(message = "Contact email should be valid")
    private String contactEmail;

    @Column(name = "virtual_tour_url")
    @Size(max = 500, message = "Virtual tour URL must not exceed 500 characters")
    private String virtualTourUrl;

    @Column(name = "notes", columnDefinition = "TEXT")
    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;

    // GDPR Compliance
    @Column(name = "data_processing_consent", nullable = false)
    @Builder.Default
    private Boolean dataProcessingConsent = false;

    @Column(name = "consent_date")
    private LocalDate consentDate;

    // One-to-many relationship with property images
    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @OrderBy("sortOrder ASC, createdAt ASC")
    private List<PropertyImage> images;

    /**
     * Get formatted address
     */
    public String getFormattedAddress() {
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
     * Calculate price per square meter if not set
     */
    public BigDecimal calculatePricePerSqm() {
        if (pricePerSqm != null) {
            return pricePerSqm;
        }

        if (price != null && livingAreaSqm != null && livingAreaSqm.compareTo(BigDecimal.ZERO) > 0) {
            return price.divide(livingAreaSqm, 2, java.math.RoundingMode.HALF_UP);
        }

        return null;
    }

    /**
     * Check if property matches basic search criteria
     */
    public boolean matchesBasicCriteria(BigDecimal minPrice, BigDecimal maxPrice,
                                       BigDecimal minArea, BigDecimal maxArea,
                                       BigDecimal minRooms, BigDecimal maxRooms) {
        if (minPrice != null && price != null && price.compareTo(minPrice) < 0) return false;
        if (maxPrice != null && price != null && price.compareTo(maxPrice) > 0) return false;
        if (minArea != null && livingAreaSqm != null && livingAreaSqm.compareTo(minArea) < 0) return false;
        if (maxArea != null && livingAreaSqm != null && livingAreaSqm.compareTo(maxArea) > 0) return false;
        if (minRooms != null && rooms != null && rooms.compareTo(minRooms) < 0) return false;
        if (maxRooms != null && rooms != null && rooms.compareTo(maxRooms) > 0) return false;

        return true;
    }

    /**
     * Check if GDPR consent is valid
     */
    public boolean hasValidConsent() {
        return Boolean.TRUE.equals(dataProcessingConsent) && consentDate != null;
    }

    /**
     * Helper method to add an image to the property
     * Maintains bidirectional relationship
     */
    public void addImage(PropertyImage image) {
        if (images == null) {
            images = new java.util.ArrayList<>();
        }
        images.add(image);
        image.setProperty(this);
    }

    /**
     * Helper method to remove an image from the property
     * Maintains bidirectional relationship
     */
    public void removeImage(PropertyImage image) {
        if (images != null) {
            images.remove(image);
            image.setProperty(null);
        }
    }

    /**
     * Get the primary/main image for the property
     */
    public PropertyImage getMainImage() {
        if (images == null || images.isEmpty()) {
            return null;
        }
        return images.stream()
                .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                .findFirst()
                .orElse(images.get(0));
    }

    @Override
    public String toString() {
        return "Property{" +
                "id=" + getId() +
                ", title='" + title + '\'' +
                ", propertyType=" + propertyType +
                ", listingType=" + listingType +
                ", status=" + status +
                ", price=" + price +
                ", addressCity='" + addressCity + '\'' +
                '}';
    }
}