package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.PropertyMatchRequest;
import com.marklerapp.crm.dto.PropertyMatchResponse;
import com.marklerapp.crm.dto.PropertySearchCriteriaDto;
import com.marklerapp.crm.security.CustomUserDetails;
import com.marklerapp.crm.service.PropertyMatchingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for intelligent property-client matching operations.
 *
 * <p>This controller provides sophisticated matching algorithms that score properties
 * and clients based on how well they match each other's criteria. The matching system
 * considers multiple factors with configurable weights:</p>
 *
 * <ul>
 *   <li><b>Price Match:</b> How close the property price is to the client's budget</li>
 *   <li><b>Location Match:</b> City, postal code, and district matching</li>
 *   <li><b>Area Match:</b> Living area matching client preferences</li>
 *   <li><b>Room Match:</b> Number of rooms, bedrooms, bathrooms</li>
 *   <li><b>Features Match:</b> Elevator, balcony, garden, parking, etc.</li>
 * </ul>
 *
 * <p>The controller supports three main matching operations:</p>
 * <ul>
 *   <li>Find properties matching a client's saved search criteria</li>
 *   <li>Find clients interested in a specific property</li>
 *   <li>Find properties matching custom criteria (ad-hoc search)</li>
 * </ul>
 *
 * <p>All matches include detailed scoring breakdowns and reasons for matches/mismatches,
 * providing transparency to agents about why properties were recommended.</p>
 *
 * <p>Security: All operations automatically extract the authenticated agent from
 * the JWT token and ensure proper data isolation. Agents can only match their own
 * properties and clients.</p>
 *
 * @see PropertyMatchingService
 * @see PropertyMatchRequest
 * @see PropertyMatchResponse
 */
@Slf4j
@RestController
@RequestMapping("/properties/match")
@RequiredArgsConstructor
@Tag(name = "Property Matching", description = "APIs for intelligent property-client matching with scoring algorithms")
public class PropertyMatchingController {

    private final PropertyMatchingService propertyMatchingService;

    // ========================================
    // Matching Operations
    // ========================================

    /**
     * Find properties matching a client's search criteria.
     *
     * <p>This endpoint retrieves the client's saved PropertySearchCriteria and finds
     * all available properties that match these criteria, scored by relevance.</p>
     *
     * <p>Match scores range from 0-100, where:
     * <ul>
     *   <li>90-100: Excellent match - highly recommended</li>
     *   <li>75-89: Good match - suitable for client</li>
     *   <li>60-74: Fair match - may be of interest</li>
     *   <li>Below 60: Poor match - not recommended</li>
     * </ul>
     * </p>
     *
     * @param clientId the UUID of the client
     * @param request optional matching parameters (threshold, weights, max results)
     * @param authentication the authenticated user (agent)
     * @return PropertyMatchResponse containing matched properties with scores and reasons
     */
    @PostMapping("/client/{clientId}")
    @Operation(summary = "Match properties for client",
               description = "Find properties that match a client's saved search criteria. Returns scored matches with detailed explanations.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Matching completed successfully",
                     content = @Content(schema = @Schema(implementation = PropertyMatchResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid request - client has no search criteria or invalid parameters"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Client not found or access denied")
    })
    public ResponseEntity<PropertyMatchResponse> matchPropertiesForClient(
            @Parameter(description = "Client ID", required = true)
            @PathVariable UUID clientId,
            @Parameter(description = "Matching request with optional parameters (threshold, weights, etc.)")
            @Valid @RequestBody(required = false) PropertyMatchRequest request,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Matching properties for client: {} by agent: {}", clientId, agentId);

        // Use default request if not provided
        if (request == null) {
            request = PropertyMatchRequest.builder().build();
        }

        // Validate that clientId is the only matching mode
        if (request.getPropertyId() != null || request.getCustomCriteria() != null) {
            throw new IllegalArgumentException(
                "When using client-based matching, do not provide propertyId or customCriteria in the request body");
        }

        PropertyMatchResponse response = propertyMatchingService.matchPropertiesForClient(
            clientId, agentId, request);

        log.info("Found {} matching properties for client: {} (execution time: {}ms)",
            response.getTotalMatches(), clientId, response.getExecutionTimeMs());

        return ResponseEntity.ok(response);
    }

    /**
     * Find clients interested in a specific property.
     *
     * <p>This endpoint analyzes which clients have search criteria that match
     * the specified property, helping agents identify potential buyers/renters.</p>
     *
     * <p>This is the inverse of the client matching endpoint - instead of finding
     * properties for a client, it finds clients for a property.</p>
     *
     * @param propertyId the UUID of the property
     * @param request optional matching parameters (threshold, weights, max results)
     * @param authentication the authenticated user (agent)
     * @return PropertyMatchResponse containing matched clients with scores and reasons
     */
    @PostMapping("/property/{propertyId}")
    @Operation(summary = "Match clients for property",
               description = "Find clients whose search criteria match a specific property. Helps identify potential buyers/renters.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Matching completed successfully",
                     content = @Content(schema = @Schema(implementation = PropertyMatchResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid request parameters"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<PropertyMatchResponse> matchClientsForProperty(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID propertyId,
            @Parameter(description = "Matching request with optional parameters (threshold, weights, etc.)")
            @Valid @RequestBody(required = false) PropertyMatchRequest request,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Matching clients for property: {} by agent: {}", propertyId, agentId);

        // Use default request if not provided
        if (request == null) {
            request = PropertyMatchRequest.builder().build();
        }

        // Validate that propertyId is the only matching mode
        if (request.getClientId() != null || request.getCustomCriteria() != null) {
            throw new IllegalArgumentException(
                "When using property-based matching, do not provide clientId or customCriteria in the request body");
        }

        PropertyMatchResponse response = propertyMatchingService.matchClientsForProperty(
            propertyId, agentId, request);

        log.info("Found {} matching clients for property: {} (execution time: {}ms)",
            response.getTotalMatches(), propertyId, response.getExecutionTimeMs());

        return ResponseEntity.ok(response);
    }

    /**
     * Find properties matching custom search criteria.
     *
     * <p>This endpoint allows ad-hoc property searches without requiring a saved
     * client search criteria. Useful for exploratory searches and agent-driven
     * property recommendations.</p>
     *
     * <p>The custom criteria can include all standard search parameters:
     * <ul>
     *   <li>Budget range (min/max price)</li>
     *   <li>Area range (min/max square meters)</li>
     *   <li>Room count (min/max rooms)</li>
     *   <li>Preferred locations (cities or postal codes)</li>
     *   <li>Property types</li>
     *   <li>Additional requirements</li>
     * </ul>
     * </p>
     *
     * @param customCriteria the custom search criteria to match against
     * @param matchThreshold optional match threshold
     * @param maxResults optional maximum results
     * @param priceWeight optional price weight
     * @param locationWeight optional location weight
     * @param areaWeight optional area weight
     * @param roomWeight optional room weight
     * @param featureWeight optional feature weight
     * @param includeUnavailable whether to include unavailable properties
     * @param authentication the authenticated user (agent)
     * @return PropertyMatchResponse containing matched properties with scores and reasons
     */
    @PostMapping("/custom")
    @Operation(summary = "Match properties with custom criteria",
               description = "Find properties matching custom search criteria without requiring a saved client profile. Useful for ad-hoc searches.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Matching completed successfully",
                     content = @Content(schema = @Schema(implementation = PropertyMatchResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid request - missing or invalid criteria"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<PropertyMatchResponse> matchPropertiesWithCustomCriteria(
            @Parameter(description = "Custom search criteria to match properties against", required = true)
            @Valid @RequestBody PropertySearchCriteriaDto customCriteria,
            @Parameter(description = "Minimum match score threshold (0-100)")
            @RequestParam(required = false) Integer matchThreshold,
            @Parameter(description = "Maximum number of results")
            @RequestParam(required = false) Integer maxResults,
            @Parameter(description = "Weight for price matching (0-100)")
            @RequestParam(required = false) Integer priceWeight,
            @Parameter(description = "Weight for location matching (0-100)")
            @RequestParam(required = false) Integer locationWeight,
            @Parameter(description = "Weight for area matching (0-100)")
            @RequestParam(required = false) Integer areaWeight,
            @Parameter(description = "Weight for room count matching (0-100)")
            @RequestParam(required = false) Integer roomWeight,
            @Parameter(description = "Weight for feature matching (0-100)")
            @RequestParam(required = false) Integer featureWeight,
            @Parameter(description = "Include unavailable properties (SOLD, RENTED)")
            @RequestParam(required = false, defaultValue = "false") Boolean includeUnavailable,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Matching properties with custom criteria for agent: {}", agentId);

        if (customCriteria == null) {
            throw new IllegalArgumentException("Custom search criteria is required");
        }

        // Build matching request with query parameters
        PropertyMatchRequest.PropertyMatchRequestBuilder requestBuilder = PropertyMatchRequest.builder()
            .customCriteria(customCriteria)
            .includeUnavailable(includeUnavailable);

        if (matchThreshold != null) requestBuilder.matchThreshold(matchThreshold);
        if (maxResults != null) requestBuilder.maxResults(maxResults);
        if (priceWeight != null) requestBuilder.priceWeight(priceWeight);
        if (locationWeight != null) requestBuilder.locationWeight(locationWeight);
        if (areaWeight != null) requestBuilder.areaWeight(areaWeight);
        if (roomWeight != null) requestBuilder.roomWeight(roomWeight);
        if (featureWeight != null) requestBuilder.featureWeight(featureWeight);

        PropertyMatchRequest request = requestBuilder.build();

        PropertyMatchResponse response = propertyMatchingService.matchPropertiesWithCustomCriteria(
            customCriteria, agentId, request);

        log.info("Found {} matching properties with custom criteria (execution time: {}ms)",
            response.getTotalMatches(), response.getExecutionTimeMs());

        return ResponseEntity.ok(response);
    }

    // ========================================
    // Convenience Endpoints
    // ========================================

    /**
     * Quick match for client (simplified endpoint without request body).
     *
     * <p>This is a simplified version of the client matching endpoint that uses
     * default matching parameters. Useful for quick property recommendations.</p>
     *
     * @param clientId the UUID of the client
     * @param matchThreshold optional match threshold (default: 70)
     * @param maxResults optional maximum results (default: 50)
     * @param authentication the authenticated user (agent)
     * @return PropertyMatchResponse containing matched properties
     */
    @GetMapping("/client/{clientId}")
    @Operation(summary = "Quick match properties for client",
               description = "Find properties for a client using default matching parameters. Simplified endpoint without request body.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Matching completed successfully",
                     content = @Content(schema = @Schema(implementation = PropertyMatchResponse.class))),
        @ApiResponse(responseCode = "400", description = "Client has no search criteria"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Client not found or access denied")
    })
    public ResponseEntity<PropertyMatchResponse> quickMatchForClient(
            @Parameter(description = "Client ID", required = true)
            @PathVariable UUID clientId,
            @Parameter(description = "Minimum match score threshold (0-100)", example = "70")
            @RequestParam(required = false, defaultValue = "70") Integer matchThreshold,
            @Parameter(description = "Maximum number of results", example = "20")
            @RequestParam(required = false, defaultValue = "20") Integer maxResults,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Quick match for client: {} by agent: {}", clientId, agentId);

        PropertyMatchRequest request = PropertyMatchRequest.builder()
            .matchThreshold(matchThreshold)
            .maxResults(maxResults)
            .build();

        PropertyMatchResponse response = propertyMatchingService.matchPropertiesForClient(
            clientId, agentId, request);

        return ResponseEntity.ok(response);
    }

    /**
     * Quick match for property (simplified endpoint without request body).
     *
     * <p>This is a simplified version of the property matching endpoint that uses
     * default matching parameters. Useful for quickly finding interested clients.</p>
     *
     * @param propertyId the UUID of the property
     * @param matchThreshold optional match threshold (default: 70)
     * @param maxResults optional maximum results (default: 50)
     * @param authentication the authenticated user (agent)
     * @return PropertyMatchResponse containing matched clients
     */
    @GetMapping("/property/{propertyId}")
    @Operation(summary = "Quick match clients for property",
               description = "Find clients for a property using default matching parameters. Simplified endpoint without request body.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Matching completed successfully",
                     content = @Content(schema = @Schema(implementation = PropertyMatchResponse.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<PropertyMatchResponse> quickMatchForProperty(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID propertyId,
            @Parameter(description = "Minimum match score threshold (0-100)", example = "70")
            @RequestParam(required = false, defaultValue = "70") Integer matchThreshold,
            @Parameter(description = "Maximum number of results", example = "20")
            @RequestParam(required = false, defaultValue = "20") Integer maxResults,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Quick match for property: {} by agent: {}", propertyId, agentId);

        PropertyMatchRequest request = PropertyMatchRequest.builder()
            .matchThreshold(matchThreshold)
            .maxResults(maxResults)
            .build();

        PropertyMatchResponse response = propertyMatchingService.matchClientsForProperty(
            propertyId, agentId, request);

        return ResponseEntity.ok(response);
    }

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Extract agent ID from authentication context.
     *
     * @param authentication the authentication object from Spring Security
     * @return the agent's UUID
     */
    private UUID getAgentIdFromAuth(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getAgent().getId();
    }
}
