package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.*;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.mapper.ClientMapper;
import com.marklerapp.crm.mapper.PropertyMapper;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import com.marklerapp.crm.repository.ViewingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static com.marklerapp.crm.dto.MatchReasonDto.CATEGORY_AREA;
import static com.marklerapp.crm.dto.MatchReasonDto.CATEGORY_LOCATION;
import static com.marklerapp.crm.dto.MatchReasonDto.CATEGORY_PRICE;
import static com.marklerapp.crm.dto.MatchReasonDto.CATEGORY_ROOM;
import static com.marklerapp.crm.dto.MatchReasonDto.CATEGORY_TYPE;

/**
 * Service for intelligent property-client matching operations.
 *
 * <p>This service provides sophisticated matching algorithms that score properties
 * based on how well they match client search criteria. The matching algorithm
 * considers multiple factors with configurable weights:</p>
 *
 * <ul>
 *   <li><b>Price Match (30% default weight):</b> How close the property price is to the client's budget</li>
 *   <li><b>Location Match (25% default weight):</b> City, postal code, and district matching</li>
 *   <li><b>Area Match (20% default weight):</b> Living area matching client preferences</li>
 *   <li><b>Room Match (15% default weight):</b> Number of rooms, bedrooms, bathrooms</li>
 *   <li><b>Features Match (10% default weight):</b> Elevator, balcony, garden, parking, etc.</li>
 * </ul>
 *
 * <p>The service supports three main matching operations:</p>
 * <ul>
 *   <li>Find properties matching a client's saved search criteria</li>
 *   <li>Find clients interested in a specific property</li>
 *   <li>Find properties matching custom criteria (ad-hoc search)</li>
 * </ul>
 *
 * <p>All matches include detailed scoring breakdowns and reasons for matches/mismatches,
 * providing transparency to agents about why properties were recommended.</p>
 *
 * @see PropertyMatchRequest
 * @see PropertyMatchResponse
 * @see PropertySearchCriteria
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PropertyMatchingService {

    private final PropertyRepository propertyRepository;
    private final ClientRepository clientRepository;
    private final ViewingRepository viewingRepository;
    private final PropertyMapper propertyMapper;
    private final ClientMapper clientMapper;
    private final com.marklerapp.crm.mapper.PropertySearchCriteriaMapper searchCriteriaMapper;
    private final ClientService clientService;
    private final PropertyService propertyService;

    // Default tolerance values
    private static final BigDecimal BUDGET_FLEXIBILITY_MULTIPLIER = new BigDecimal("1.10"); // 10% over budget
    private static final BigDecimal AREA_TOLERANCE_PERCENTAGE = new BigDecimal("0.15"); // 15% tolerance
    private static final int POSTAL_CODE_PROXIMITY_RANGE = 50; // Postal code range for nearby matching

    // Which monetary figure a price reason refers to — the frontend translates these
    private static final String PRICE_KIND_PURCHASE = "PURCHASE_PRICE";
    private static final String PRICE_KIND_WARM_RENT = "WARM_RENT";
    private static final String PRICE_KIND_COLD_RENT = "COLD_RENT";
    private static final String PRICE_KIND_RENT = "RENT";

    /**
     * Find properties matching a client's search criteria.
     *
     * <p>This method retrieves the client's saved PropertySearchCriteria and finds
     * all available properties that match these criteria, scored by relevance.</p>
     *
     * @param clientId the UUID of the client
     * @param agentId the UUID of the agent (for authorization)
     * @param request the matching request with configuration parameters
     * @return PropertyMatchResponse containing matched properties with scores
     * @throws IllegalArgumentException if client not found or has no search criteria
     */
    public PropertyMatchResponse matchPropertiesForClient(UUID clientId, UUID agentId, PropertyMatchRequest request) {
        long startTime = System.currentTimeMillis();
        log.info("Starting property matching for client: {}, agent: {}", clientId, agentId);

        // Validate and retrieve client
        ClientDto client = clientService.getClientById(clientId, agentId);
        if (client.getSearchCriteria() == null) {
            throw new IllegalArgumentException("Client does not have search criteria configured");
        }

        PropertySearchCriteriaDto criteria = client.getSearchCriteria();
        log.debug("Client search criteria: minBudget={}, maxBudget={}, minRooms={}, maxRooms={}, locations={}",
                criteria.getMinBudget(), criteria.getMaxBudget(), criteria.getMinRooms(),
                criteria.getMaxRooms(), criteria.getPreferredLocations());

        // Get all available properties for the agent
        List<Property> availableProperties = propertyRepository.findByAgentId(agentId, null).getContent();

        // Filter by status (only AVAILABLE unless includeUnavailable is true)
        if (!Boolean.TRUE.equals(request.getIncludeUnavailable())) {
            availableProperties = availableProperties.stream()
                    .filter(p -> p.getStatus() == PropertyStatus.AVAILABLE)
                    .collect(Collectors.toList());
        }

        // Only suggest properties that match what the client is actually looking for
        // (buyers shouldn't see rentals and vice versa). SELLER clients have no implied
        // listing type here, so they aren't restricted.
        ListingType desiredListingType = desiredListingTypeFor(client.getClientType());
        if (desiredListingType != null) {
            availableProperties = availableProperties.stream()
                    .filter(p -> p.getListingType() == desiredListingType)
                    .collect(Collectors.toList());
        }

        // Hard-filter to the client's search radius when restrictToSearchRadius is
        // enabled (default) and both sides are geocoded — see passesLocationGate.
        availableProperties = availableProperties.stream()
                .filter(p -> passesLocationGate(p.getLatitude(), p.getLongitude(), criteria))
                .collect(Collectors.toList());

        log.debug("Found {} properties to evaluate", availableProperties.size());

        // Cross-reference against existing viewings for this client in one query, so the
        // frontend can flag properties already proposed to this client.
        Map<UUID, List<Viewing>> viewingsByPropertyId = viewingRepository.findByClient_Id(clientId).stream()
                .collect(Collectors.groupingBy(v -> v.getProperty().getId()));

        // Score each property against the criteria. Scoring works on the DTO so that
        // there is no lossy entity<->DTO hand-copy between the two matching directions.
        List<PropertyMatchResponse.PropertyMatchResult> matchResults = availableProperties.stream()
                .map(propertyMapper::toDto)
                .map(property -> scoreProperty(property, criteria, request,
                        viewingsByPropertyId.getOrDefault(property.getId(), List.of())))
                .filter(result -> result.getMatchScore() >= request.getEffectiveMatchThreshold())
                .sorted(Comparator.comparingInt(PropertyMatchResponse.PropertyMatchResult::getMatchScore).reversed())
                .limit(request.getEffectiveMaxResults())
                .collect(Collectors.toList());

        long executionTime = System.currentTimeMillis() - startTime;
        log.info("Property matching completed: {} matches found in {}ms", matchResults.size(), executionTime);

        return PropertyMatchResponse.builder()
                .properties(matchResults)
                .totalMatches(matchResults.size())
                .returnedMatches(matchResults.size())
                .matchThreshold(request.getEffectiveMatchThreshold())
                .executionTimeMs(executionTime)
                .appliedWeights(appliedWeights(request))
                .build();
    }

    /**
     * Find clients interested in a specific property.
     *
     * <p>This method analyzes which clients have search criteria that match
     * the specified property, helping agents identify potential buyers/renters.</p>
     *
     * @param propertyId the UUID of the property
     * @param agentId the UUID of the agent (for authorization)
     * @param request the matching request with configuration parameters
     * @return PropertyMatchResponse containing matched clients with scores
     * @throws IllegalArgumentException if property not found
     */
    public PropertyMatchResponse matchClientsForProperty(UUID propertyId, UUID agentId, PropertyMatchRequest request) {
        long startTime = System.currentTimeMillis();
        log.info("Starting client matching for property: {}, agent: {}", propertyId, agentId);

        // Validate and retrieve property
        PropertyDto property = propertyService.getProperty(propertyId, agentId);

        // Get all clients with search criteria for the agent
        Agent agent = new Agent();
        agent.setId(agentId);
        List<Client> clientsWithCriteria = clientRepository.findByAgentWithSearchCriteria(agent);

        log.debug("Found {} clients with search criteria to evaluate", clientsWithCriteria.size());

        // Cross-reference against existing viewings for this property in one query, so the
        // frontend can flag "already contacted" clients instead of letting an agent propose
        // the same property to the same person twice from two different match lists.
        Map<UUID, List<Viewing>> viewingsByClientId = viewingRepository.findByProperty_Id(propertyId).stream()
                .collect(Collectors.groupingBy(v -> v.getClient().getId()));

        // Score each client based on how well the property matches their criteria
        List<PropertyMatchResponse.ClientMatchResult> matchResults = clientsWithCriteria.stream()
                .filter(client -> client.getSearchCriteria() != null)
                .filter(client -> client.getPipelineStage() != Client.PipelineStage.WON
                        && client.getPipelineStage() != Client.PipelineStage.LOST)
                .filter(client -> matchesDesiredListingType(client.getClientType(), property.getListingType()))
                .filter(client -> passesLocationGate(property.getLatitude(), property.getLongitude(),
                        convertCriteriaToDto(client.getSearchCriteria())))
                .map(client -> scoreClient(client, property, request,
                        viewingsByClientId.getOrDefault(client.getId(), List.of())))
                .filter(result -> result.getMatchScore() >= request.getEffectiveMatchThreshold())
                .sorted(Comparator.comparingInt(PropertyMatchResponse.ClientMatchResult::getMatchScore).reversed())
                .limit(request.getEffectiveMaxResults())
                .collect(Collectors.toList());

        long executionTime = System.currentTimeMillis() - startTime;
        log.info("Client matching completed: {} matches found in {}ms", matchResults.size(), executionTime);

        return PropertyMatchResponse.builder()
                .clients(matchResults)
                .totalMatches(matchResults.size())
                .returnedMatches(matchResults.size())
                .matchThreshold(request.getEffectiveMatchThreshold())
                .executionTimeMs(executionTime)
                .appliedWeights(appliedWeights(request))
                .build();
    }

    /**
     * Find properties matching custom search criteria.
     *
     * <p>This method allows ad-hoc property searches without requiring a saved
     * client search criteria. Useful for exploratory searches and agent-driven
     * property recommendations.</p>
     *
     * @param criteria the custom search criteria
     * @param agentId the UUID of the agent (for authorization)
     * @param request the matching request with configuration parameters
     * @return PropertyMatchResponse containing matched properties with scores
     * @throws IllegalArgumentException if criteria is null
     */
    public PropertyMatchResponse matchPropertiesWithCustomCriteria(
            PropertySearchCriteriaDto criteria, UUID agentId, PropertyMatchRequest request) {
        long startTime = System.currentTimeMillis();
        log.info("Starting property matching with custom criteria for agent: {}", agentId);

        if (criteria == null) {
            throw new IllegalArgumentException("Custom search criteria cannot be null");
        }

        log.debug("Custom criteria: minBudget={}, maxBudget={}, minRooms={}, maxRooms={}, locations={}",
                criteria.getMinBudget(), criteria.getMaxBudget(), criteria.getMinRooms(),
                criteria.getMaxRooms(), criteria.getPreferredLocations());

        // Get all available properties for the agent
        List<Property> availableProperties = propertyRepository.findByAgentId(agentId, null).getContent();

        // Filter by status
        if (!Boolean.TRUE.equals(request.getIncludeUnavailable())) {
            availableProperties = availableProperties.stream()
                    .filter(p -> p.getStatus() == PropertyStatus.AVAILABLE)
                    .collect(Collectors.toList());
        }

        // No client is attached to an ad-hoc search, so infer the intended listing type from
        // which budget fields were actually filled in. Ambiguous/empty criteria match any type,
        // same as before this filter existed.
        ListingType impliedListingType = impliedListingTypeFor(criteria);
        if (impliedListingType != null) {
            availableProperties = availableProperties.stream()
                    .filter(p -> p.getListingType() == impliedListingType)
                    .collect(Collectors.toList());
        }

        availableProperties = availableProperties.stream()
                .filter(p -> passesLocationGate(p.getLatitude(), p.getLongitude(), criteria))
                .collect(Collectors.toList());

        log.debug("Found {} properties to evaluate", availableProperties.size());

        // Score each property against the criteria (no client attached to an ad-hoc search,
        // so there is nothing to cross-reference against past viewings)
        List<PropertyMatchResponse.PropertyMatchResult> matchResults = availableProperties.stream()
                .map(propertyMapper::toDto)
                .map(property -> scoreProperty(property, criteria, request, List.of()))
                .filter(result -> result.getMatchScore() >= request.getEffectiveMatchThreshold())
                .sorted(Comparator.comparingInt(PropertyMatchResponse.PropertyMatchResult::getMatchScore).reversed())
                .limit(request.getEffectiveMaxResults())
                .collect(Collectors.toList());

        long executionTime = System.currentTimeMillis() - startTime;
        log.info("Property matching with custom criteria completed: {} matches found in {}ms",
                matchResults.size(), executionTime);

        return PropertyMatchResponse.builder()
                .properties(matchResults)
                .totalMatches(matchResults.size())
                .returnedMatches(matchResults.size())
                .matchThreshold(request.getEffectiveMatchThreshold())
                .executionTimeMs(executionTime)
                .appliedWeights(appliedWeights(request))
                .build();
    }

    // ========================================
    // Private Helper Methods - Property Scoring
    // ========================================

    /**
     * Score a property against client search criteria.
     *
     * @param property the property to score
     * @param criteria the search criteria to match against
     * @param request the matching request with weights and options
     * @param priorViewings existing viewings linking this property to the client this match is
     *                      being scored for (empty when there is no specific client, e.g. an
     *                      ad-hoc custom-criteria search)
     * @return PropertyMatchResult with score and breakdown
     */
    private PropertyMatchResponse.PropertyMatchResult scoreProperty(
            PropertyDto property, PropertySearchCriteriaDto criteria, PropertyMatchRequest request,
            List<Viewing> priorViewings) {

        List<MatchReasonDto> matchReasons = new ArrayList<>();
        List<MatchReasonDto> mismatchReasons = new ArrayList<>();

        // Calculate individual scores
        int priceScore = calculatePriceScore(property, criteria, request, matchReasons, mismatchReasons);
        int locationScore = calculateLocationScore(property, criteria, request, matchReasons, mismatchReasons);
        int areaScore = calculateAreaScore(property, criteria, request, matchReasons, mismatchReasons);
        int roomScore = calculateRoomScore(property, criteria, request, matchReasons, mismatchReasons);
        int featureScore = calculateFeatureScore(property, criteria, request, matchReasons, mismatchReasons);

        int overallScore = weightedOverallScore(
                request, priceScore, locationScore, areaScore, roomScore, featureScore);

        log.debug("Property {} scored: overall={}, price={}, location={}, area={}, room={}, feature={}",
                property.getId(), overallScore, priceScore, locationScore, areaScore, roomScore, featureScore);

        // Build score breakdown
        PropertyMatchResponse.MatchScoreBreakdown breakdown = PropertyMatchResponse.MatchScoreBreakdown.builder()
                .priceScore(priceScore)
                .locationScore(locationScore)
                .areaScore(areaScore)
                .roomScore(roomScore)
                .featureScore(featureScore)
                .build();

        return PropertyMatchResponse.PropertyMatchResult.builder()
                .property(property)
                .matchScore(overallScore)
                .scoreBreakdown(breakdown)
                .matchReasons(matchReasons)
                .mismatchReasons(mismatchReasons)
                .previouslyContacted(!priorViewings.isEmpty())
                .viewCount(priorViewings.size())
                .lastContactDate(latestViewingDate(priorViewings))
                .build();
    }

    /**
     * Latest viewing date across a set of prior viewings, as an ISO string for the DTO — or
     * null if there is no viewing history.
     */
    private static String latestViewingDate(List<Viewing> viewings) {
        return viewings.stream()
                .map(Viewing::getViewingDate)
                .max(Comparator.naturalOrder())
                .map(Object::toString)
                .orElse(null);
    }

    /**
     * Score a client based on how well a property matches their criteria.
     *
     * @param client the client with search criteria
     * @param property the property to match
     * @param request the matching request with weights and options
     * @param priorViewings existing viewings linking this client to this property
     * @return ClientMatchResult with score and breakdown
     */
    private PropertyMatchResponse.ClientMatchResult scoreClient(
            Client client, PropertyDto property, PropertyMatchRequest request, List<Viewing> priorViewings) {

        PropertySearchCriteriaDto criteria = convertCriteriaToDto(client.getSearchCriteria());
        List<MatchReasonDto> matchReasons = new ArrayList<>();
        List<MatchReasonDto> mismatchReasons = new ArrayList<>();

        // Calculate scores using the same logic as the property direction — scoring
        // operates on the DTO directly, so every property field is available.
        int priceScore = calculatePriceScore(property, criteria, request, matchReasons, mismatchReasons);
        int locationScore = calculateLocationScore(property, criteria, request, matchReasons, mismatchReasons);
        int areaScore = calculateAreaScore(property, criteria, request, matchReasons, mismatchReasons);
        int roomScore = calculateRoomScore(property, criteria, request, matchReasons, mismatchReasons);
        int featureScore = calculateFeatureScore(property, criteria, request, matchReasons, mismatchReasons);

        int overallScore = weightedOverallScore(
                request, priceScore, locationScore, areaScore, roomScore, featureScore);

        log.debug("Client {} scored: overall={}, price={}, location={}, area={}, room={}, feature={}",
                client.getId(), overallScore, priceScore, locationScore, areaScore, roomScore, featureScore);

        // Build score breakdown
        PropertyMatchResponse.MatchScoreBreakdown breakdown = PropertyMatchResponse.MatchScoreBreakdown.builder()
                .priceScore(priceScore)
                .locationScore(locationScore)
                .areaScore(areaScore)
                .roomScore(roomScore)
                .featureScore(featureScore)
                .build();

        // Convert client entity to DTO
        ClientDto clientDto = clientMapper.toDto(client);

        return PropertyMatchResponse.ClientMatchResult.builder()
                .client(clientDto)
                .matchScore(overallScore)
                .scoreBreakdown(breakdown)
                .matchReasons(matchReasons)
                .mismatchReasons(mismatchReasons)
                .previouslyContacted(!priorViewings.isEmpty())
                .viewCount(priorViewings.size())
                .lastContactDate(latestViewingDate(priorViewings))
                .build();
    }

    // ========================================
    // Private Helper Methods - Weighting
    // ========================================

    /**
     * Combine the five category scores into the overall score using whole-percentage
     * weights. The UI shows each category's contribution as {@code score × weight / 100};
     * computing the total the same way keeps the parts adding up to the number shown.
     */
    private int weightedOverallScore(PropertyMatchRequest request, int priceScore, int locationScore,
                                     int areaScore, int roomScore, int featureScore) {
        int[] weights = request.getNormalizedWeightPercentages();
        return (int) Math.round(
                (priceScore * weights[0]
                        + locationScore * weights[1]
                        + areaScore * weights[2]
                        + roomScore * weights[3]
                        + featureScore * weights[4]) / 100.0
        );
    }

    /**
     * The weights actually applied, echoed back so the frontend never has to assume defaults.
     */
    private PropertyMatchResponse.MatchWeights appliedWeights(PropertyMatchRequest request) {
        int[] weights = request.getNormalizedWeightPercentages();
        return PropertyMatchResponse.MatchWeights.builder()
                .priceWeight(weights[0])
                .locationWeight(weights[1])
                .areaWeight(weights[2])
                .roomWeight(weights[3])
                .featureWeight(weights[4])
                .build();
    }

    // ========================================
    // Private Helper Methods - Individual Score Calculations
    // ========================================

    /**
     * Calculate price match score (0-100).
     *
     * <p>Scoring logic:</p>
     * <ul>
     *   <li>100 points: Price within budget range</li>
     *   <li>80-99 points: Price slightly over budget (if flexibility allowed)</li>
     *   <li>50-79 points: Price within 20% of budget</li>
     *   <li>0-49 points: Price significantly outside budget</li>
     * </ul>
     */
    private int calculatePriceScore(PropertyDto property, PropertySearchCriteriaDto criteria,
                                    PropertyMatchRequest request, List<MatchReasonDto> matchReasons,
                                    List<MatchReasonDto> mismatchReasons) {
        if (property.getPrice() == null) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_PRICE, "priceNotSpecified"));
            return 50; // Neutral score for missing price
        }

        boolean allowFlexibility = Boolean.TRUE.equals(request.getAllowBudgetFlexibility());

        if (property.getListingType() == ListingType.SALE) {
            return scoreValueAgainstRange(property.getPrice(), criteria.getMinBudget(), criteria.getMaxBudget(),
                    allowFlexibility, PRICE_KIND_PURCHASE, matchReasons, mismatchReasons);
        }

        // RENT / LEASE: price is the cold rent; warm rent adds additional/heating costs.
        // Prefer whichever of warm/cold rent the client actually specified; fall back to the
        // legacy generic budget fields for search criteria saved before this distinction existed.
        BigDecimal coldRent = property.getPrice();
        BigDecimal warmRent = coldRent
                .add(property.getAdditionalCosts() != null ? property.getAdditionalCosts() : BigDecimal.ZERO)
                .add(property.getHeatingCosts() != null ? property.getHeatingCosts() : BigDecimal.ZERO);

        if (criteria.getMinWarmRent() != null || criteria.getMaxWarmRent() != null) {
            return scoreValueAgainstRange(warmRent, criteria.getMinWarmRent(), criteria.getMaxWarmRent(),
                    allowFlexibility, PRICE_KIND_WARM_RENT, matchReasons, mismatchReasons);
        }
        if (criteria.getMinColdRent() != null || criteria.getMaxColdRent() != null) {
            return scoreValueAgainstRange(coldRent, criteria.getMinColdRent(), criteria.getMaxColdRent(),
                    allowFlexibility, PRICE_KIND_COLD_RENT, matchReasons, mismatchReasons);
        }
        return scoreValueAgainstRange(coldRent, criteria.getMinBudget(), criteria.getMaxBudget(),
                allowFlexibility, PRICE_KIND_RENT, matchReasons, mismatchReasons);
    }

    /**
     * Score a monetary value against a min/max range (0-100). Shared by purchase price,
     * cold rent, and warm rent scoring — the curve is identical, only the value and range differ.
     *
     * <p>Scoring logic:</p>
     * <ul>
     *   <li>100 points: value within range</li>
     *   <li>80-99 points: value slightly over max (if flexibility allowed)</li>
     *   <li>50-79 points: value within 20% of max</li>
     *   <li>0-49 points: value significantly outside range</li>
     * </ul>
     */
    private int scoreValueAgainstRange(BigDecimal value, BigDecimal min, BigDecimal max,
                                       boolean allowFlexibility, String priceKind,
                                       List<MatchReasonDto> matchReasons, List<MatchReasonDto> mismatchReasons) {
        if (min == null && max == null) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_PRICE, "noPriceConstraints", "priceKind", priceKind));
            return 100;
        }

        BigDecimal effectiveMax = max;
        if (allowFlexibility && max != null) {
            effectiveMax = max.multiply(BUDGET_FLEXIBILITY_MULTIPLIER);
        }

        boolean withinMin = min == null || value.compareTo(min) >= 0;
        boolean withinMax = max == null || value.compareTo(max) <= 0;

        if (withinMin && withinMax) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_PRICE, "priceWithinRange",
                    "priceKind", priceKind, "value", value));
            return 100;
        }

        boolean withinFlexibleMax = effectiveMax == null || value.compareTo(effectiveMax) <= 0;
        if (withinMin && withinFlexibleMax) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_PRICE, "priceSlightlyOverBudget",
                    "priceKind", priceKind, "value", value, "limit", max));
            return 85;
        }

        if (max != null && value.compareTo(max) > 0) {
            BigDecimal percentOver = value.subtract(max)
                    .divide(max, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));

            if (percentOver.compareTo(BigDecimal.valueOf(20)) <= 0) {
                mismatchReasons.add(MatchReasonDto.of(CATEGORY_PRICE, "priceOverBudget",
                        "priceKind", priceKind, "value", value, "limit", max, "percent", percent(percentOver)));
                return Math.max(50, 100 - percentOver.intValue());
            } else {
                mismatchReasons.add(MatchReasonDto.of(CATEGORY_PRICE, "priceFarOverBudget",
                        "priceKind", priceKind, "value", value, "limit", max, "percent", percent(percentOver)));
                return Math.max(0, 50 - (percentOver.intValue() - 20));
            }
        }

        if (min != null && value.compareTo(min) < 0) {
            mismatchReasons.add(MatchReasonDto.of(CATEGORY_PRICE, "priceBelowMinimum",
                    "priceKind", priceKind, "value", value, "limit", min));
            return 30;
        }

        return 50;
    }

    /**
     * Percentages are rounded once here so every client renders the same number.
     */
    private static BigDecimal percent(BigDecimal raw) {
        return raw.setScale(1, RoundingMode.HALF_UP);
    }

    /**
     * Map a client's stated intent to the listing type they should be shown.
     * SELLER has no implied listing type (they aren't searching for a property here).
     */
    private ListingType desiredListingTypeFor(Client.ClientType clientType) {
        if (clientType == Client.ClientType.BUYER) {
            return ListingType.SALE;
        }
        if (clientType == Client.ClientType.RENTER) {
            return ListingType.RENT;
        }
        return null;
    }

    private boolean matchesDesiredListingType(Client.ClientType clientType, ListingType propertyListingType) {
        ListingType desired = desiredListingTypeFor(clientType);
        return desired == null || desired == propertyListingType;
    }

    /**
     * Ad-hoc searches have no client to read intent from, so infer it from which budget
     * fields were actually filled in. Returns null (no filter) when ambiguous or empty.
     */
    private ListingType impliedListingTypeFor(PropertySearchCriteriaDto criteria) {
        boolean hasRentSignal = criteria.getMinColdRent() != null || criteria.getMaxColdRent() != null
                || criteria.getMinWarmRent() != null || criteria.getMaxWarmRent() != null;
        boolean hasSaleSignal = criteria.getMinBudget() != null || criteria.getMaxBudget() != null;

        if (hasRentSignal && !hasSaleSignal) {
            return ListingType.RENT;
        }
        if (hasSaleSignal && !hasRentSignal) {
            return ListingType.SALE;
        }
        return null;
    }

    /**
     * Calculate location match score (0-100).
     *
     * <p>Scoring logic:</p>
     * <ul>
     *   <li>100 points: Exact city match</li>
     *   <li>80 points: Postal code proximity match</li>
     *   <li>60 points: State/region match</li>
     *   <li>0 points: No location match</li>
     * </ul>
     */
    private int calculateLocationScore(PropertyDto property, PropertySearchCriteriaDto criteria,
                                       PropertyMatchRequest request, List<MatchReasonDto> matchReasons,
                                       List<MatchReasonDto> mismatchReasons) {
        // Prefer real distance once both sides are geocoded — falls through to the
        // city/postal-code text logic below whenever either side lacks coordinates
        // (legacy criteria without a map pin, or a property not yet geocoded).
        if (criteria.getLatitude() != null && criteria.getLongitude() != null && criteria.getSearchRadiusKm() != null
                && property.getLatitude() != null && property.getLongitude() != null) {
            return calculateDistanceScore(property, criteria, matchReasons, mismatchReasons);
        }

        List<String> preferredLocations = criteria.getPreferredLocations();

        if (preferredLocations == null || preferredLocations.isEmpty()) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_LOCATION, "noLocationPreferences"));
            return 100;
        }

        String propertyCity = property.getAddressCity();
        String propertyPostalCode = property.getAddressPostalCode();

        if (propertyCity == null && propertyPostalCode == null) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_LOCATION, "locationNotSpecified"));
            return 50;
        }

        // Check for exact city match
        for (String location : preferredLocations) {
            if (propertyCity != null && propertyCity.equalsIgnoreCase(location.trim())) {
                matchReasons.add(MatchReasonDto.of(CATEGORY_LOCATION, "locationCityMatch", "city", propertyCity));
                return 100;
            }

            // Check for postal code match
            if (propertyPostalCode != null && location.trim().matches("\\d{5}")) {
                if (propertyPostalCode.equals(location.trim())) {
                    matchReasons.add(MatchReasonDto.of(CATEGORY_LOCATION, "locationPostalCodeExact",
                            "postalCode", propertyPostalCode));
                    return 100;
                }

                // Check postal code proximity (within range)
                if (!Boolean.TRUE.equals(request.getExactLocationMatch())) {
                    try {
                        int propertyCode = Integer.parseInt(propertyPostalCode);
                        int preferredCode = Integer.parseInt(location.trim());
                        int difference = Math.abs(propertyCode - preferredCode);

                        if (difference <= POSTAL_CODE_PROXIMITY_RANGE) {
                            matchReasons.add(MatchReasonDto.of(CATEGORY_LOCATION, "locationPostalCodeNear",
                                    "postalCode", propertyPostalCode, "preferredPostalCode", location.trim()));
                            return 80;
                        }
                    } catch (NumberFormatException e) {
                        log.debug("Could not parse postal codes for proximity check");
                    }
                }
            }
        }

        // City can be blank while the postal code is set — fall back so the reason never renders "null"
        mismatchReasons.add(MatchReasonDto.of(CATEGORY_LOCATION, "locationNoMatch",
                "city", propertyCity != null ? propertyCity : propertyPostalCode));
        return 0;
    }

    /**
     * Distance-based location score once both criteria and property are geocoded.
     * 100 points at the pin, decaying to ~70 at the radius edge. Properties beyond the
     * radius only ever reach this method when restrictToSearchRadius is disabled
     * (otherwise passesLocationGate already filtered them out before scoring), so the
     * curve keeps decaying past the edge instead of assuming everything here is in-range.
     */
    private int calculateDistanceScore(PropertyDto property, PropertySearchCriteriaDto criteria,
                                       List<MatchReasonDto> matchReasons, List<MatchReasonDto> mismatchReasons) {
        double distance = distanceKm(criteria.getLatitude(), criteria.getLongitude(),
                property.getLatitude(), property.getLongitude());
        int radiusKm = criteria.getSearchRadiusKm();

        if (distance <= radiusKm) {
            int score = (int) Math.round(100 - (distance / radiusKm) * 30);
            matchReasons.add(MatchReasonDto.of(CATEGORY_LOCATION, "locationWithinRadius",
                    "distanceKm", roundToOneDecimal(distance), "radiusKm", radiusKm));
            return Math.max(70, score);
        }

        double overKm = distance - radiusKm;
        int score = (int) Math.round(70 - overKm * 5);
        mismatchReasons.add(MatchReasonDto.of(CATEGORY_LOCATION, "locationOutsideRadius",
                "overKm", roundToOneDecimal(overKm), "radiusKm", radiusKm));
        return Math.max(0, score);
    }

    private static BigDecimal roundToOneDecimal(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP);
    }

    /**
     * Great-circle distance between two coordinates in kilometers (haversine formula).
     */
    private static double distanceKm(BigDecimal lat1, BigDecimal lng1, BigDecimal lat2, BigDecimal lng2) {
        final double earthRadiusKm = 6371.0;
        double phi1 = Math.toRadians(lat1.doubleValue());
        double phi2 = Math.toRadians(lat2.doubleValue());
        double deltaPhi = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double deltaLambda = Math.toRadians(lng2.doubleValue() - lng1.doubleValue());

        double a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2)
                + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    /**
     * Hard pre-filter applied before scoring: excludes properties outside a client's
     * search radius when restrictToSearchRadius is enabled (the default). A data gap
     * on either side — criteria without a pin, or a property not yet geocoded — always
     * passes the gate rather than silently hiding an otherwise valid match; scoring
     * falls back to city/postal-code text matching for those instead.
     */
    private boolean passesLocationGate(BigDecimal propertyLatitude, BigDecimal propertyLongitude,
                                        PropertySearchCriteriaDto criteria) {
        if (criteria == null || !Boolean.TRUE.equals(criteria.getRestrictToSearchRadius())) {
            return true;
        }
        if (criteria.getLatitude() == null || criteria.getLongitude() == null || criteria.getSearchRadiusKm() == null) {
            return true;
        }
        if (propertyLatitude == null || propertyLongitude == null) {
            return true;
        }
        double distance = distanceKm(criteria.getLatitude(), criteria.getLongitude(), propertyLatitude, propertyLongitude);
        return distance <= criteria.getSearchRadiusKm();
    }

    /**
     * Calculate area match score (0-100).
     *
     * <p>Scoring logic:</p>
     * <ul>
     *   <li>100 points: Living area within specified range</li>
     *   <li>80-99 points: Living area within 15% tolerance</li>
     *   <li>50-79 points: Living area within 30% tolerance</li>
     *   <li>0-49 points: Living area significantly outside range</li>
     * </ul>
     */
    private int calculateAreaScore(PropertyDto property, PropertySearchCriteriaDto criteria,
                                   PropertyMatchRequest request, List<MatchReasonDto> matchReasons,
                                   List<MatchReasonDto> mismatchReasons) {
        if (property.getLivingAreaSqm() == null) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_AREA, "areaNotSpecified"));
            return 50;
        }

        BigDecimal area = property.getLivingAreaSqm();
        Integer minArea = criteria.getMinSquareMeters();
        Integer maxArea = criteria.getMaxSquareMeters();

        // If no area constraints, perfect score
        if (minArea == null && maxArea == null) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_AREA, "noAreaConstraints"));
            return 100;
        }

        BigDecimal minAreaDecimal = minArea != null ? BigDecimal.valueOf(minArea) : null;
        BigDecimal maxAreaDecimal = maxArea != null ? BigDecimal.valueOf(maxArea) : null;

        // Check if area is within range
        boolean withinMin = minAreaDecimal == null || area.compareTo(minAreaDecimal) >= 0;
        boolean withinMax = maxAreaDecimal == null || area.compareTo(maxAreaDecimal) <= 0;

        if (withinMin && withinMax) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_AREA, "areaWithinRange", "area", area));
            return 100;
        }

        // Apply tolerance (15% by default)
        if (maxAreaDecimal != null && area.compareTo(maxAreaDecimal) > 0) {
            BigDecimal tolerance = maxAreaDecimal.multiply(AREA_TOLERANCE_PERCENTAGE);
            BigDecimal maxWithTolerance = maxAreaDecimal.add(tolerance);

            if (area.compareTo(maxWithTolerance) <= 0) {
                matchReasons.add(MatchReasonDto.of(CATEGORY_AREA, "areaSlightlyAboveMax",
                        "area", area, "limit", maxAreaDecimal));
                return 85;
            }

            BigDecimal percentOver = area.subtract(maxAreaDecimal)
                    .divide(maxAreaDecimal, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            mismatchReasons.add(MatchReasonDto.of(CATEGORY_AREA, "areaAboveMax",
                    "area", area, "limit", maxAreaDecimal, "percent", percent(percentOver)));
            return Math.max(0, 100 - percentOver.intValue());
        }

        if (minAreaDecimal != null && area.compareTo(minAreaDecimal) < 0) {
            BigDecimal percentUnder = minAreaDecimal.subtract(area)
                    .divide(minAreaDecimal, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            mismatchReasons.add(MatchReasonDto.of(CATEGORY_AREA, "areaBelowMin",
                    "area", area, "limit", minAreaDecimal, "percent", percent(percentUnder)));
            return Math.max(0, 100 - percentUnder.intValue());
        }

        return 50;
    }

    /**
     * Calculate room count match score (0-100).
     *
     * <p>Scoring logic:</p>
     * <ul>
     *   <li>100 points: Room count within specified range</li>
     *   <li>75 points: Room count 1 room outside range</li>
     *   <li>50 points: Room count 2 rooms outside range</li>
     *   <li>0 points: Room count significantly different</li>
     * </ul>
     */
    private int calculateRoomScore(PropertyDto property, PropertySearchCriteriaDto criteria,
                                   PropertyMatchRequest request, List<MatchReasonDto> matchReasons,
                                   List<MatchReasonDto> mismatchReasons) {
        if (property.getRooms() == null) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_ROOM, "roomsNotSpecified"));
            return 50;
        }

        BigDecimal rooms = property.getRooms();
        Integer minRooms = criteria.getMinRooms();
        Integer maxRooms = criteria.getMaxRooms();

        // If no room constraints, perfect score
        if (minRooms == null && maxRooms == null) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_ROOM, "noRoomConstraints"));
            return 100;
        }

        BigDecimal minRoomsDecimal = minRooms != null ? BigDecimal.valueOf(minRooms) : null;
        BigDecimal maxRoomsDecimal = maxRooms != null ? BigDecimal.valueOf(maxRooms) : null;

        // Check if rooms is within range
        boolean withinMin = minRoomsDecimal == null || rooms.compareTo(minRoomsDecimal) >= 0;
        boolean withinMax = maxRoomsDecimal == null || rooms.compareTo(maxRoomsDecimal) <= 0;

        if (withinMin && withinMax) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_ROOM, "roomsWithinRange", "rooms", rooms));
            return 100;
        }

        // Calculate room difference
        BigDecimal difference;
        if (maxRoomsDecimal != null && rooms.compareTo(maxRoomsDecimal) > 0) {
            difference = rooms.subtract(maxRoomsDecimal);
            if (difference.compareTo(BigDecimal.ONE) <= 0) {
                matchReasons.add(MatchReasonDto.of(CATEGORY_ROOM, "roomsSlightlyAboveMax",
                        "rooms", rooms, "limit", maxRoomsDecimal));
                return 75;
            } else if (difference.compareTo(BigDecimal.valueOf(2)) <= 0) {
                mismatchReasons.add(MatchReasonDto.of(CATEGORY_ROOM, "roomsAboveMax",
                        "rooms", rooms, "limit", maxRoomsDecimal, "difference", difference));
                return 50;
            } else {
                mismatchReasons.add(MatchReasonDto.of(CATEGORY_ROOM, "roomsFarAboveMax",
                        "rooms", rooms, "limit", maxRoomsDecimal, "difference", difference));
                return Math.max(0, 50 - (difference.intValue() - 2) * 10);
            }
        }

        if (minRoomsDecimal != null && rooms.compareTo(minRoomsDecimal) < 0) {
            difference = minRoomsDecimal.subtract(rooms);
            if (difference.compareTo(BigDecimal.ONE) <= 0) {
                matchReasons.add(MatchReasonDto.of(CATEGORY_ROOM, "roomsSlightlyBelowMin",
                        "rooms", rooms, "limit", minRoomsDecimal));
                return 75;
            } else if (difference.compareTo(BigDecimal.valueOf(2)) <= 0) {
                mismatchReasons.add(MatchReasonDto.of(CATEGORY_ROOM, "roomsBelowMin",
                        "rooms", rooms, "limit", minRoomsDecimal, "difference", difference));
                return 50;
            } else {
                mismatchReasons.add(MatchReasonDto.of(CATEGORY_ROOM, "roomsFarBelowMin",
                        "rooms", rooms, "limit", minRoomsDecimal, "difference", difference));
                return Math.max(0, 50 - (difference.intValue() - 2) * 10);
            }
        }

        return 50;
    }

    /**
     * Calculate feature match score (0-100).
     *
     * <p>This is a simplified scoring based on property type matching.
     * In a full implementation, this would check specific features like
     * elevator, balcony, garden, parking, etc.</p>
     *
     * <p>Scoring logic:</p>
     * <ul>
     *   <li>100 points: Property type matches client preferences</li>
     *   <li>50 points: No specific type preferences or partial match</li>
     *   <li>0 points: Property type explicitly excluded</li>
     * </ul>
     */
    private int calculateFeatureScore(PropertyDto property, PropertySearchCriteriaDto criteria,
                                      PropertyMatchRequest request, List<MatchReasonDto> matchReasons,
                                      List<MatchReasonDto> mismatchReasons) {
        List<String> preferredTypes = criteria.getPropertyTypes();

        if (preferredTypes == null || preferredTypes.isEmpty()) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_TYPE, "noTypePreferences"));
            return 100;
        }

        if (property.getPropertyType() == null) {
            matchReasons.add(MatchReasonDto.of(CATEGORY_TYPE, "typeNotSpecified"));
            return 50;
        }

        // Property type travels as the raw enum name so the frontend can translate it
        String propertyTypeName = property.getPropertyType().name();
        for (String preferredType : preferredTypes) {
            if (propertyTypeName.equalsIgnoreCase(preferredType.trim())) {
                matchReasons.add(MatchReasonDto.of(CATEGORY_TYPE, "typeMatches", "propertyType", propertyTypeName));
                return 100;
            }
        }

        mismatchReasons.add(MatchReasonDto.of(CATEGORY_TYPE, "typeNoMatch", "propertyType", propertyTypeName));
        return 0;
    }

    // ========================================
    // Private Helper Methods - Conversions
    // ========================================

    /**
     * Convert PropertySearchCriteria entity to DTO via the shared MapStruct mapper —
     * hand-copying fields here caused silently incomplete matching in the past.
     */
    private PropertySearchCriteriaDto convertCriteriaToDto(com.marklerapp.crm.entity.PropertySearchCriteria criteria) {
        return criteria == null ? null : searchCriteriaMapper.toDto(criteria);
    }
}
