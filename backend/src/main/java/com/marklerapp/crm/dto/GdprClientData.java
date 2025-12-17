package com.marklerapp.crm.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO representing client data for GDPR export.
 * Includes all personal information and associated search criteria.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GdprClientData {

    // Client basic information
    private UUID id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phone;

    // Address information
    private String addressStreet;
    private String addressCity;
    private String addressPostalCode;
    private String addressCountry;
    private String formattedAddress;

    // GDPR consent information
    private boolean gdprConsentGiven;
    private LocalDateTime gdprConsentDate;

    // Search criteria (nested object)
    private GdprSearchCriteriaData searchCriteria;

    // Audit information
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Nested DTO for search criteria
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GdprSearchCriteriaData {
        private UUID id;
        private Integer minSquareMeters;
        private Integer maxSquareMeters;
        private Integer minRooms;
        private Integer maxRooms;
        private String minBudget;
        private String maxBudget;
        private String preferredLocations;
        private String propertyTypes;
        private String additionalRequirements;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
