package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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

    /**
     * The normalized weights the overall scores were actually calculated with.
     * Echoed back so clients can show how a score is composed without assuming defaults.
     */
    private MatchWeights appliedWeights;

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
        private List<MatchReasonDto> matchReasons;

        /**
         * Reasons why this property doesn't fully match
         */
        private List<MatchReasonDto> mismatchReasons;

        /**
         * Whether this property has been previously contacted
         */
        private Boolean previouslyContacted;

        /**
         * Number of times this property has been shown to the client
         */
        private Integer viewCount;

        /**
         * Last contact date for this property (i.e. most recent viewing with the client)
         */
        private String lastContactDate;
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
        private List<MatchReasonDto> matchReasons;

        /**
         * Reasons why this client doesn't fully match
         */
        private List<MatchReasonDto> mismatchReasons;

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
         * Property-type match score (0-100).
         * Carried under the "feature" name because it is weighted by featureWeight.
         */
        private Integer featureScore;
    }

    /**
     * The normalized weights (percentages summing to 100) used to combine the
     * individual category scores into the overall match score.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class MatchWeights {

        private Integer priceWeight;
        private Integer locationWeight;
        private Integer areaWeight;
        private Integer roomWeight;
        private Integer featureWeight;
    }
}
