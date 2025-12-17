package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * DTO for property-client matching response.
 *
 * <p>This DTO encapsulates the results of a property matching operation,
 * including matched properties or clients with their respective match scores
 * and detailed breakdown of scoring factors.</p>
 *
 * @see PropertyMatchRequest
 * @see PropertyDto
 * @see ClientDto
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertyMatchResponse {

    /**
     * List of matched properties (for client-to-properties matching)
     */
    private List<PropertyMatchResult> properties;

    /**
     * List of matched clients (for property-to-clients matching)
     */
    private List<ClientMatchResult> clients;

    /**
     * Total number of matches found (before pagination)
     */
    private Integer totalMatches;

    /**
     * Number of results returned in this response
     */
    private Integer returnedMatches;

    /**
     * Match threshold used for filtering
     */
    private Integer matchThreshold;

    /**
     * Execution time in milliseconds
     */
    private Long executionTimeMs;

    // ========================================
    // Nested Classes
    // ========================================

    /**
     * Represents a matched property with scoring details.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PropertyMatchResult {

        /**
         * The matched property
         */
        private PropertyDto property;

        /**
         * Overall match score (0-100)
         */
        private Integer matchScore;

        /**
         * Breakdown of match scores by category
         */
        private MatchScoreBreakdown scoreBreakdown;

        /**
         * Reasons why this property matches
         */
        private List<String> matchReasons;

        /**
         * Reasons why this property doesn't fully match
         */
        private List<String> mismatchReasons;

        /**
         * Whether this property has been previously contacted
         */
        private Boolean previouslyContacted;

        /**
         * Number of times this property has been shown to the client
         */
        private Integer viewCount;
    }

    /**
     * Represents a matched client with scoring details.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ClientMatchResult {

        /**
         * The matched client
         */
        private ClientDto client;

        /**
         * Overall match score (0-100)
         */
        private Integer matchScore;

        /**
         * Breakdown of match scores by category
         */
        private MatchScoreBreakdown scoreBreakdown;

        /**
         * Reasons why this client matches
         */
        private List<String> matchReasons;

        /**
         * Reasons why this client doesn't fully match
         */
        private List<String> mismatchReasons;

        /**
         * Whether this client has been previously contacted about this property
         */
        private Boolean previouslyContacted;

        /**
         * Number of times this client has viewed this property
         */
        private Integer viewCount;

        /**
         * Last contact date with this client about this property
         */
        private String lastContactDate;
    }

    /**
     * Detailed breakdown of match scores by category.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class MatchScoreBreakdown {

        /**
         * Price match score (0-100)
         */
        private Integer priceScore;

        /**
         * Location match score (0-100)
         */
        private Integer locationScore;

        /**
         * Area match score (0-100)
         */
        private Integer areaScore;

        /**
         * Room count match score (0-100)
         */
        private Integer roomScore;

        /**
         * Feature match score (0-100)
         */
        private Integer featureScore;

        /**
         * Type match score (0-100)
         * Includes property type and listing type matching
         */
        private Integer typeScore;

        /**
         * Additional factors affecting the score
         */
        private Map<String, Integer> additionalFactors;

        /**
         * Get the average score across all categories.
         *
         * @return average score
         */
        public double getAverageScore() {
            int count = 0;
            int sum = 0;

            if (priceScore != null) { sum += priceScore; count++; }
            if (locationScore != null) { sum += locationScore; count++; }
            if (areaScore != null) { sum += areaScore; count++; }
            if (roomScore != null) { sum += roomScore; count++; }
            if (featureScore != null) { sum += featureScore; count++; }
            if (typeScore != null) { sum += typeScore; count++; }

            return count > 0 ? (double) sum / count : 0.0;
        }

        /**
         * Get the lowest score across all categories.
         *
         * @return lowest score
         */
        public Integer getLowestScore() {
            Integer lowest = null;

            if (priceScore != null) lowest = (lowest == null) ? priceScore : Math.min(lowest, priceScore);
            if (locationScore != null) lowest = (lowest == null) ? locationScore : Math.min(lowest, locationScore);
            if (areaScore != null) lowest = (lowest == null) ? areaScore : Math.min(lowest, areaScore);
            if (roomScore != null) lowest = (lowest == null) ? roomScore : Math.min(lowest, roomScore);
            if (featureScore != null) lowest = (lowest == null) ? featureScore : Math.min(lowest, featureScore);
            if (typeScore != null) lowest = (lowest == null) ? typeScore : Math.min(lowest, typeScore);

            return lowest;
        }

        /**
         * Get the highest score across all categories.
         *
         * @return highest score
         */
        public Integer getHighestScore() {
            Integer highest = null;

            if (priceScore != null) highest = (highest == null) ? priceScore : Math.max(highest, priceScore);
            if (locationScore != null) highest = (highest == null) ? locationScore : Math.max(highest, locationScore);
            if (areaScore != null) highest = (highest == null) ? areaScore : Math.max(highest, areaScore);
            if (roomScore != null) highest = (highest == null) ? roomScore : Math.max(highest, roomScore);
            if (featureScore != null) highest = (highest == null) ? featureScore : Math.max(highest, featureScore);
            if (typeScore != null) highest = (highest == null) ? typeScore : Math.max(highest, typeScore);

            return highest;
        }
    }
}
