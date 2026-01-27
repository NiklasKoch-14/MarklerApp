package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.*;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.mapper.ClientMapper;
import com.marklerapp.crm.mapper.PropertyMapper;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

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
    private final PropertyMapper propertyMapper;
    private final ClientMapper clientMapper;

    // Default tolerance values
    private static final BigDecimal BUDGET_FLEXIBILITY_MULTIPLIER = new BigDecimal("1.10"); // 10% over budget
    private static final BigDecimal AREA_TOLERANCE_PERCENTAGE = new BigDecimal("0.15"); // 15% tolerance
    private static final int POSTAL_CODE_PROXIMITY_RANGE = 50; // Postal code range for nearby matching

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

        log.debug("Found {} properties to evaluate", availableProperties.size());

        // Score each property against the criteria
        List<PropertyMatchResponse.PropertyMatchResult> matchResults = availableProperties.stream()
                .map(property -> scoreProperty(property, criteria, request))
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

        // Score each client based on how well the property matches their criteria
        List<PropertyMatchResponse.ClientMatchResult> matchResults = clientsWithCriteria.stream()
                .filter(client -> client.getSearchCriteria() != null)
                .map(client -> scoreClient(client, property, request))
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

        log.debug("Found {} properties to evaluate", availableProperties.size());

        // Score each property against the criteria
        List<PropertyMatchResponse.PropertyMatchResult> matchResults = availableProperties.stream()
                .map(property -> scoreProperty(property, criteria, request))
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
     * @return PropertyMatchResult with score and breakdown
     */
    private PropertyMatchResponse.PropertyMatchResult scoreProperty(
            Property property, PropertySearchCriteriaDto criteria, PropertyMatchRequest request) {

        List<String> matchReasons = new ArrayList<>();
        List<String> mismatchReasons = new ArrayList<>();

        // Calculate individual scores
        int priceScore = calculatePriceScore(property, criteria, request, matchReasons, mismatchReasons);
        int locationScore = calculateLocationScore(property, criteria, request, matchReasons, mismatchReasons);
        int areaScore = calculateAreaScore(property, criteria, request, matchReasons, mismatchReasons);
        int roomScore = calculateRoomScore(property, criteria, request, matchReasons, mismatchReasons);
        int featureScore = calculateFeatureScore(property, criteria, request, matchReasons, mismatchReasons);

        // Get normalized weights
        double[] weights = request.getNormalizedWeights();

        // Calculate weighted overall score
        int overallScore = (int) Math.round(
                priceScore * weights[0] +
                locationScore * weights[1] +
                areaScore * weights[2] +
                roomScore * weights[3] +
                featureScore * weights[4]
        );

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

        // Convert property entity to DTO
        PropertyDto propertyDto = propertyMapper.toDto(property);

        return PropertyMatchResponse.PropertyMatchResult.builder()
                .property(propertyDto)
                .matchScore(overallScore)
                .scoreBreakdown(breakdown)
                .matchReasons(matchReasons)
                .mismatchReasons(mismatchReasons)
                .build();
    }

    /**
     * Score a client based on how well a property matches their criteria.
     *
     * @param client the client with search criteria
     * @param property the property to match
     * @param request the matching request with weights and options
     * @return ClientMatchResult with score and breakdown
     */
    private PropertyMatchResponse.ClientMatchResult scoreClient(
            Client client, PropertyDto property, PropertyMatchRequest request) {

        PropertySearchCriteriaDto criteria = convertCriteriaToDto(client.getSearchCriteria());
        List<String> matchReasons = new ArrayList<>();
        List<String> mismatchReasons = new ArrayList<>();

        // Convert DTO to entity for scoring (reuse existing logic)
        Property propertyEntity = convertToEntity(property);

        // Calculate scores using the same logic
        int priceScore = calculatePriceScore(propertyEntity, criteria, request, matchReasons, mismatchReasons);
        int locationScore = calculateLocationScore(propertyEntity, criteria, request, matchReasons, mismatchReasons);
        int areaScore = calculateAreaScore(propertyEntity, criteria, request, matchReasons, mismatchReasons);
        int roomScore = calculateRoomScore(propertyEntity, criteria, request, matchReasons, mismatchReasons);
        int featureScore = calculateFeatureScore(propertyEntity, criteria, request, matchReasons, mismatchReasons);

        // Get normalized weights
        double[] weights = request.getNormalizedWeights();

        // Calculate weighted overall score
        int overallScore = (int) Math.round(
                priceScore * weights[0] +
                locationScore * weights[1] +
                areaScore * weights[2] +
                roomScore * weights[3] +
                featureScore * weights[4]
        );

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
    private int calculatePriceScore(Property property, PropertySearchCriteriaDto criteria,
                                    PropertyMatchRequest request, List<String> matchReasons,
                                    List<String> mismatchReasons) {
        if (property.getPrice() == null) {
            matchReasons.add("Price not specified for this property");
            return 50; // Neutral score for missing price
        }

        BigDecimal price = property.getPrice();
        BigDecimal minBudget = criteria.getMinBudget();
        BigDecimal maxBudget = criteria.getMaxBudget();

        // If no budget constraints, perfect score
        if (minBudget == null && maxBudget == null) {
            matchReasons.add("No budget constraints specified");
            return 100;
        }

        // Apply budget flexibility if allowed
        BigDecimal effectiveMaxBudget = maxBudget;
        if (Boolean.TRUE.equals(request.getAllowBudgetFlexibility()) && maxBudget != null) {
            effectiveMaxBudget = maxBudget.multiply(BUDGET_FLEXIBILITY_MULTIPLIER);
        }

        // Check if price is within budget
        boolean withinMin = minBudget == null || price.compareTo(minBudget) >= 0;
        boolean withinMax = maxBudget == null || price.compareTo(maxBudget) <= 0;

        if (withinMin && withinMax) {
            matchReasons.add(String.format("Price €%,d is within budget range", price.intValue()));
            return 100;
        }

        // Check if within flexible budget
        boolean withinFlexibleMax = effectiveMaxBudget == null || price.compareTo(effectiveMaxBudget) <= 0;
        if (withinMin && withinFlexibleMax) {
            matchReasons.add(String.format("Price €%,d is slightly over budget but within 10%% tolerance", price.intValue()));
            return 85;
        }

        // Calculate distance from budget range
        if (maxBudget != null && price.compareTo(maxBudget) > 0) {
            BigDecimal percentOver = price.subtract(maxBudget)
                    .divide(maxBudget, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));

            if (percentOver.compareTo(BigDecimal.valueOf(20)) <= 0) {
                mismatchReasons.add(String.format("Price €%,d is %.1f%% over budget",
                        price.intValue(), percentOver.doubleValue()));
                return Math.max(50, 100 - percentOver.intValue());
            } else {
                mismatchReasons.add(String.format("Price €%,d significantly exceeds budget (%.1f%% over)",
                        price.intValue(), percentOver.doubleValue()));
                return Math.max(0, 50 - (percentOver.intValue() - 20));
            }
        }

        if (minBudget != null && price.compareTo(minBudget) < 0) {
            mismatchReasons.add(String.format("Price €%,d is below minimum budget", price.intValue()));
            return 30; // Property is too cheap
        }

        return 50;
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
    private int calculateLocationScore(Property property, PropertySearchCriteriaDto criteria,
                                       PropertyMatchRequest request, List<String> matchReasons,
                                       List<String> mismatchReasons) {
        List<String> preferredLocations = criteria.getPreferredLocations();

        if (preferredLocations == null || preferredLocations.isEmpty()) {
            matchReasons.add("No location preferences specified");
            return 100;
        }

        String propertyCity = property.getAddressCity();
        String propertyPostalCode = property.getAddressPostalCode();

        if (propertyCity == null && propertyPostalCode == null) {
            matchReasons.add("Property location not fully specified");
            return 50;
        }

        // Check for exact city match
        for (String location : preferredLocations) {
            if (propertyCity != null && propertyCity.equalsIgnoreCase(location.trim())) {
                matchReasons.add(String.format("Property is in preferred city: %s", propertyCity));
                return 100;
            }

            // Check for postal code match
            if (propertyPostalCode != null && location.trim().matches("\\d{5}")) {
                if (propertyPostalCode.equals(location.trim())) {
                    matchReasons.add(String.format("Property postal code %s matches exactly", propertyPostalCode));
                    return 100;
                }

                // Check postal code proximity (within range)
                if (!Boolean.TRUE.equals(request.getExactLocationMatch())) {
                    try {
                        int propertyCode = Integer.parseInt(propertyPostalCode);
                        int preferredCode = Integer.parseInt(location.trim());
                        int difference = Math.abs(propertyCode - preferredCode);

                        if (difference <= POSTAL_CODE_PROXIMITY_RANGE) {
                            matchReasons.add(String.format("Property postal code %s is near preferred location (within %d)",
                                    propertyPostalCode, POSTAL_CODE_PROXIMITY_RANGE));
                            return 80;
                        }
                    } catch (NumberFormatException e) {
                        log.debug("Could not parse postal codes for proximity check");
                    }
                }
            }
        }

        mismatchReasons.add(String.format("Property location %s does not match preferred locations", propertyCity));
        return 0;
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
    private int calculateAreaScore(Property property, PropertySearchCriteriaDto criteria,
                                   PropertyMatchRequest request, List<String> matchReasons,
                                   List<String> mismatchReasons) {
        if (property.getLivingAreaSqm() == null) {
            matchReasons.add("Living area not specified for this property");
            return 50;
        }

        BigDecimal area = property.getLivingAreaSqm();
        Integer minArea = criteria.getMinSquareMeters();
        Integer maxArea = criteria.getMaxSquareMeters();

        // If no area constraints, perfect score
        if (minArea == null && maxArea == null) {
            matchReasons.add("No area constraints specified");
            return 100;
        }

        BigDecimal minAreaDecimal = minArea != null ? BigDecimal.valueOf(minArea) : null;
        BigDecimal maxAreaDecimal = maxArea != null ? BigDecimal.valueOf(maxArea) : null;

        // Check if area is within range
        boolean withinMin = minAreaDecimal == null || area.compareTo(minAreaDecimal) >= 0;
        boolean withinMax = maxAreaDecimal == null || area.compareTo(maxAreaDecimal) <= 0;

        if (withinMin && withinMax) {
            matchReasons.add(String.format("Living area %.0f m² is within desired range", area.doubleValue()));
            return 100;
        }

        // Apply tolerance (15% by default)
        if (maxAreaDecimal != null && area.compareTo(maxAreaDecimal) > 0) {
            BigDecimal tolerance = maxAreaDecimal.multiply(AREA_TOLERANCE_PERCENTAGE);
            BigDecimal maxWithTolerance = maxAreaDecimal.add(tolerance);

            if (area.compareTo(maxWithTolerance) <= 0) {
                matchReasons.add(String.format("Living area %.0f m² is slightly larger than preferred (within 15%% tolerance)",
                        area.doubleValue()));
                return 85;
            }

            BigDecimal percentOver = area.subtract(maxAreaDecimal)
                    .divide(maxAreaDecimal, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            mismatchReasons.add(String.format("Living area %.0f m² is %.1f%% larger than preferred maximum",
                    area.doubleValue(), percentOver.doubleValue()));
            return Math.max(0, 100 - percentOver.intValue());
        }

        if (minAreaDecimal != null && area.compareTo(minAreaDecimal) < 0) {
            BigDecimal percentUnder = minAreaDecimal.subtract(area)
                    .divide(minAreaDecimal, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            mismatchReasons.add(String.format("Living area %.0f m² is %.1f%% smaller than preferred minimum",
                    area.doubleValue(), percentUnder.doubleValue()));
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
    private int calculateRoomScore(Property property, PropertySearchCriteriaDto criteria,
                                   PropertyMatchRequest request, List<String> matchReasons,
                                   List<String> mismatchReasons) {
        if (property.getRooms() == null) {
            matchReasons.add("Room count not specified for this property");
            return 50;
        }

        BigDecimal rooms = property.getRooms();
        Integer minRooms = criteria.getMinRooms();
        Integer maxRooms = criteria.getMaxRooms();

        // If no room constraints, perfect score
        if (minRooms == null && maxRooms == null) {
            matchReasons.add("No room count constraints specified");
            return 100;
        }

        BigDecimal minRoomsDecimal = minRooms != null ? BigDecimal.valueOf(minRooms) : null;
        BigDecimal maxRoomsDecimal = maxRooms != null ? BigDecimal.valueOf(maxRooms) : null;

        // Check if rooms is within range
        boolean withinMin = minRoomsDecimal == null || rooms.compareTo(minRoomsDecimal) >= 0;
        boolean withinMax = maxRoomsDecimal == null || rooms.compareTo(maxRoomsDecimal) <= 0;

        if (withinMin && withinMax) {
            matchReasons.add(String.format("%.1f rooms is within desired range", rooms.doubleValue()));
            return 100;
        }

        // Calculate room difference
        BigDecimal difference;
        if (maxRoomsDecimal != null && rooms.compareTo(maxRoomsDecimal) > 0) {
            difference = rooms.subtract(maxRoomsDecimal);
            if (difference.compareTo(BigDecimal.ONE) <= 0) {
                matchReasons.add(String.format("%.1f rooms is 1 room more than preferred", rooms.doubleValue()));
                return 75;
            } else if (difference.compareTo(BigDecimal.valueOf(2)) <= 0) {
                mismatchReasons.add(String.format("%.1f rooms is 2 rooms more than preferred", rooms.doubleValue()));
                return 50;
            } else {
                mismatchReasons.add(String.format("%.1f rooms is significantly more than preferred", rooms.doubleValue()));
                return Math.max(0, 50 - (difference.intValue() - 2) * 10);
            }
        }

        if (minRoomsDecimal != null && rooms.compareTo(minRoomsDecimal) < 0) {
            difference = minRoomsDecimal.subtract(rooms);
            if (difference.compareTo(BigDecimal.ONE) <= 0) {
                matchReasons.add(String.format("%.1f rooms is 1 room less than preferred", rooms.doubleValue()));
                return 75;
            } else if (difference.compareTo(BigDecimal.valueOf(2)) <= 0) {
                mismatchReasons.add(String.format("%.1f rooms is 2 rooms less than preferred", rooms.doubleValue()));
                return 50;
            } else {
                mismatchReasons.add(String.format("%.1f rooms is significantly less than preferred", rooms.doubleValue()));
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
    private int calculateFeatureScore(Property property, PropertySearchCriteriaDto criteria,
                                      PropertyMatchRequest request, List<String> matchReasons,
                                      List<String> mismatchReasons) {
        List<String> preferredTypes = criteria.getPropertyTypes();

        if (preferredTypes == null || preferredTypes.isEmpty()) {
            matchReasons.add("No specific property type preferences");
            return 100;
        }

        if (property.getPropertyType() == null) {
            matchReasons.add("Property type not specified");
            return 50;
        }

        // Check if property type matches any preferred type
        String propertyTypeName = property.getPropertyType().name();
        for (String preferredType : preferredTypes) {
            if (propertyTypeName.equalsIgnoreCase(preferredType.trim())) {
                matchReasons.add(String.format("Property type %s matches preferences",
                        property.getPropertyType().getEnglishName()));
                return 100;
            }
        }

        mismatchReasons.add(String.format("Property type %s does not match preferred types",
                property.getPropertyType().getEnglishName()));
        return 0;
    }

    // ========================================
    // Private Helper Methods - Conversions
    // ========================================

    /**
     * Convert PropertySearchCriteria entity to DTO.
     */
    private PropertySearchCriteriaDto convertCriteriaToDto(com.marklerapp.crm.entity.PropertySearchCriteria criteria) {
        if (criteria == null) {
            return null;
        }

        return PropertySearchCriteriaDto.builder()
                .id(criteria.getId())
                .minSquareMeters(criteria.getMinSquareMeters())
                .maxSquareMeters(criteria.getMaxSquareMeters())
                .minRooms(criteria.getMinRooms())
                .maxRooms(criteria.getMaxRooms())
                .minBudget(criteria.getMinBudget())
                .maxBudget(criteria.getMaxBudget())
                .preferredLocations(criteria.getPreferredLocations() != null ?
                        Arrays.asList(criteria.getPreferredLocationsArray()) : null)
                .propertyTypes(criteria.getPropertyTypes() != null ?
                        Arrays.asList(criteria.getPropertyTypesArray()) : null)
                .additionalRequirements(criteria.getAdditionalRequirements())
                .build();
    }

    /**
     * Convert PropertyDto to Property entity (lightweight conversion for scoring).
     */
    private Property convertToEntity(PropertyDto dto) {
        Property property = new Property();
        property.setId(dto.getId());
        property.setPrice(dto.getPrice());
        property.setLivingAreaSqm(dto.getLivingAreaSqm());
        property.setRooms(dto.getRooms());
        property.setAddressCity(dto.getAddressCity());
        property.setAddressPostalCode(dto.getAddressPostalCode());
        property.setPropertyType(dto.getPropertyType());
        property.setListingType(dto.getListingType());
        property.setStatus(dto.getStatus());
        return property;
    }
}
