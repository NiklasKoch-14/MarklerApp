package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for property-client matching requests.
 *
 * <p>This DTO is used to find properties that match a client's search criteria
 * or to find clients that would be interested in a specific property.</p>
 *
 * <p>Matching algorithms use:
 * <ul>
 *   <li>Exact matches for property type, listing type, and location</li>
 *   <li>Range matching for price, area, and rooms</li>
 *   <li>Feature matching with configurable importance weights</li>
 *   <li>Configurable matching threshold (0-100)</li>
 * </ul>
 * </p>
 *
 * <p>Usage examples:
 * <ul>
 *   <li>Find properties for a specific client by clientId</li>
 *   <li>Find clients for a specific property by propertyId</li>
 *   <li>Find properties matching custom criteria</li>
 * </ul>
 * </p>
 *
 * @see PropertyDto
 * @see ClientDto
 * @see PropertySearchCriteriaDto
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertyMatchRequest {

    // ========================================
    // Matching Mode
    // ========================================

    /**
     * Client ID for finding matching properties.
     * If set, the system will use the client's search criteria.
     * Mutually exclusive with propertyId and customCriteria.
     */
    private UUID clientId;

    /**
     * Property ID for finding interested clients.
     * If set, the system will find clients whose criteria match this property.
     * Mutually exclusive with clientId and customCriteria.
     */
    private UUID propertyId;

    /**
     * Custom search criteria for finding properties.
     * If set, the system will use these criteria instead of a client's saved criteria.
     * Mutually exclusive with clientId (but can be combined with propertyId for reverse matching).
     */
    @Valid
    private PropertySearchCriteriaDto customCriteria;

    // ========================================
    // Matching Parameters
    // ========================================

    /**
     * Minimum match score threshold (0-100).
     * Only results with a match score equal to or above this threshold will be returned.
     * Default: 70
     */
    @Min(value = 0, message = "Match threshold must be between 0 and 100")
    @Max(value = 100, message = "Match threshold must be between 0 and 100")
    @Builder.Default
    private Integer matchThreshold = 70;

    /**
     * Maximum number of results to return.
     * Default: 50
     */
    @Min(value = 1, message = "Max results must be at least 1")
    @Max(value = 500, message = "Max results must not exceed 500")
    @Builder.Default
    private Integer maxResults = 50;

    /**
     * Whether to include only exact location matches.
     * If true, only properties in the exact city/postal code will be included.
     * Default: false
     */
    @Builder.Default
    private Boolean exactLocationMatch = false;

    /**
     * Whether to include properties slightly outside the budget range.
     * If true, includes properties up to 10% above the maximum price.
     * Default: true
     */
    @Builder.Default
    private Boolean allowBudgetFlexibility = true;

    /**
     * Whether to include properties with fewer features than requested.
     * If false, only properties with ALL requested features will be included.
     * Default: true
     */
    @Builder.Default
    private Boolean allowFeatureFlexibility = true;

    // ========================================
    // Weighting Configuration (Optional)
    // ========================================

    /**
     * Weight for price matching (0-100).
     * Higher values give more importance to price in the match score.
     * Default: 30
     */
    @Min(value = 0, message = "Price weight must be between 0 and 100")
    @Max(value = 100, message = "Price weight must be between 0 and 100")
    @Builder.Default
    private Integer priceWeight = 30;

    /**
     * Weight for location matching (0-100).
     * Higher values give more importance to location in the match score.
     * Default: 25
     */
    @Min(value = 0, message = "Location weight must be between 0 and 100")
    @Max(value = 100, message = "Location weight must be between 0 and 100")
    @Builder.Default
    private Integer locationWeight = 25;

    /**
     * Weight for area matching (0-100).
     * Higher values give more importance to area in the match score.
     * Default: 20
     */
    @Min(value = 0, message = "Area weight must be between 0 and 100")
    @Max(value = 100, message = "Area weight must be between 0 and 100")
    @Builder.Default
    private Integer areaWeight = 20;

    /**
     * Weight for room count matching (0-100).
     * Higher values give more importance to room count in the match score.
     * Default: 15
     */
    @Min(value = 0, message = "Room weight must be between 0 and 100")
    @Max(value = 100, message = "Room weight must be between 0 and 100")
    @Builder.Default
    private Integer roomWeight = 15;

    /**
     * Weight for feature matching (0-100).
     * Higher values give more importance to features in the match score.
     * Default: 10
     */
    @Min(value = 0, message = "Feature weight must be between 0 and 100")
    @Max(value = 100, message = "Feature weight must be between 0 and 100")
    @Builder.Default
    private Integer featureWeight = 10;

    // ========================================
    // Sorting and Filtering
    // ========================================

    /**
     * Sort results by match score, price, or date.
     * Valid values: "matchScore", "price", "createdAt"
     * Default: "matchScore"
     */
    @Pattern(regexp = "^(matchScore|price|createdAt|livingAreaSqm|rooms)$|^$",
             message = "Sort by must be one of: matchScore, price, createdAt, livingAreaSqm, rooms")
    @Builder.Default
    private String sortBy = "matchScore";

    /**
     * Sort direction ("ASC" or "DESC").
     * Default: "DESC" (highest match scores first)
     */
    @Pattern(regexp = "^(ASC|DESC|asc|desc)$|^$", message = "Sort direction must be ASC or DESC")
    @Builder.Default
    private String sortDirection = "DESC";

    /**
     * Whether to include properties/clients that have already been contacted.
     * Default: true
     */
    @Builder.Default
    private Boolean includeContacted = true;

    /**
     * Whether to include properties that are no longer available (SOLD, RENTED).
     * Default: false
     */
    @Builder.Default
    private Boolean includeUnavailable = false;

    // ========================================
    // Validation Methods
    // ========================================

    /**
     * Validate that only one matching mode is specified.
     *
     * @return true if exactly one matching mode is specified
     */
    public boolean hasValidMatchingMode() {
        int modeCount = 0;
        if (clientId != null) modeCount++;
        if (propertyId != null) modeCount++;
        if (customCriteria != null) modeCount++;
        return modeCount == 1;
    }

    /**
     * Check if weights sum to approximately 100.
     * This is a soft validation - weights will be normalized if they don't sum to 100.
     *
     * @return true if weights sum to 100 (±5)
     */
    public boolean hasValidWeights() {
        int totalWeight = (priceWeight != null ? priceWeight : 0) +
                         (locationWeight != null ? locationWeight : 0) +
                         (areaWeight != null ? areaWeight : 0) +
                         (roomWeight != null ? roomWeight : 0) +
                         (featureWeight != null ? featureWeight : 0);
        return Math.abs(totalWeight - 100) <= 5;
    }

    /**
     * Get normalized weight values that sum to 100.
     * Used internally by the matching algorithm.
     *
     * @return array of normalized weights [price, location, area, room, feature]
     */
    public double[] getNormalizedWeights() {
        int totalWeight = (priceWeight != null ? priceWeight : 0) +
                         (locationWeight != null ? locationWeight : 0) +
                         (areaWeight != null ? areaWeight : 0) +
                         (roomWeight != null ? roomWeight : 0) +
                         (featureWeight != null ? featureWeight : 0);

        if (totalWeight == 0) {
            // Use default weights
            return new double[]{0.30, 0.25, 0.20, 0.15, 0.10};
        }

        // Normalize to sum to 1.0
        return new double[]{
            (priceWeight != null ? priceWeight : 0) / (double) totalWeight,
            (locationWeight != null ? locationWeight : 0) / (double) totalWeight,
            (areaWeight != null ? areaWeight : 0) / (double) totalWeight,
            (roomWeight != null ? roomWeight : 0) / (double) totalWeight,
            (featureWeight != null ? featureWeight : 0) / (double) totalWeight
        };
    }

    /**
     * Calculate the budget flexibility multiplier.
     * If allowBudgetFlexibility is true, returns 1.10 (10% increase), otherwise 1.0.
     *
     * @return budget flexibility multiplier
     */
    public BigDecimal getBudgetFlexibilityMultiplier() {
        return allowBudgetFlexibility
            ? new BigDecimal("1.10")
            : BigDecimal.ONE;
    }

    /**
     * Get the effective match threshold.
     * Returns the specified threshold or the default value of 70.
     *
     * @return effective match threshold
     */
    public int getEffectiveMatchThreshold() {
        return matchThreshold != null ? matchThreshold : 70;
    }

    /**
     * Get the effective maximum results.
     * Returns the specified max results or the default value of 50.
     *
     * @return effective maximum results
     */
    public int getEffectiveMaxResults() {
        return maxResults != null ? maxResults : 50;
    }

    /**
     * Check if this is a client-to-properties matching request.
     *
     * @return true if clientId is set
     */
    public boolean isClientToPropertiesMatch() {
        return clientId != null;
    }

    /**
     * Check if this is a property-to-clients matching request.
     *
     * @return true if propertyId is set
     */
    public boolean isPropertyToClientsMatch() {
        return propertyId != null;
    }

    /**
     * Check if this is a custom criteria matching request.
     *
     * @return true if customCriteria is set
     */
    public boolean isCustomCriteriaMatch() {
        return customCriteria != null;
    }
}
