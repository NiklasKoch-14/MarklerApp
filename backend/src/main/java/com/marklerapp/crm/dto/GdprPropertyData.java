package com.marklerapp.crm.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO representing property data for GDPR export.
 * Includes all property information and associated images.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GdprPropertyData {

    // Basic information
    private UUID id;
    private String title;
    private String description;
    private String propertyType;
    private String listingType;
    private String status;

    // Location information
    private String addressStreet;
    private String addressHouseNumber;
    private String addressCity;
    private String addressPostalCode;
    private String addressState;
    private String addressCountry;
    private String addressDistrict;
    private String formattedAddress;

    // Property specifications
    private String livingAreaSqm;
    private String totalAreaSqm;
    private String plotAreaSqm;
    private String rooms;
    private Integer bedrooms;
    private Integer bathrooms;
    private Integer floors;
    private Integer floorNumber;
    private Integer constructionYear;
    private Integer lastRenovationYear;

    // Financial information
    private String price;
    private String pricePerSqm;
    private String additionalCosts;
    private String heatingCosts;
    private String commission;

    // Features and amenities
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

    // Energy efficiency
    private String energyEfficiencyClass;
    private String energyConsumptionKwh;
    private String heatingType;

    // Additional information
    private LocalDate availableFrom;
    private String contactPhone;
    private String contactEmail;
    private String virtualTourUrl;
    private String notes;

    // GDPR compliance
    private Boolean dataProcessingConsent;
    private LocalDate consentDate;

    // Property images
    private List<GdprPropertyImageData> images;

    // Audit information
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Nested DTO for property images
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GdprPropertyImageData {
        private UUID id;
        private String filename;
        private String originalFilename;
        private String filePath;
        private String contentType;
        private Long fileSize;
        private String formattedFileSize;
        private String title;
        private String description;
        private String altText;
        private Integer width;
        private Integer height;
        private Boolean isPrimary;
        private Integer sortOrder;
        private String imageType;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
