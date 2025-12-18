package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.*;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import com.marklerapp.crm.repository.PropertyImageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing property operations with comprehensive business logic.
 *
 * <p>This service provides full CRUD operations for properties, including:
 * <ul>
 *   <li>Property creation, retrieval, update, and deletion</li>
 *   <li>Advanced search and filtering capabilities</li>
 *   <li>Agent ownership validation</li>
 *   <li>GDPR compliance checks</li>
 *   <li>Calculated field management (e.g., price per sqm)</li>
 *   <li>Property statistics and analytics</li>
 * </ul>
 * </p>
 *
 * <p>All operations are restricted to the authenticated agent's own properties,
 * ensuring proper data isolation and security.</p>
 *
 * @see Property
 * @see PropertyDto
 * @see CreatePropertyRequest
 * @see UpdatePropertyRequest
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final PropertyImageRepository propertyImageRepository;
    private final AgentRepository agentRepository;

    /**
     * Create a new property with GDPR validation.
     *
     * @param request the property creation request
     * @param agentId the ID of the agent creating the property
     * @return the created property as DTO
     * @throws ResourceNotFoundException if agent is not found
     * @throws IllegalArgumentException if GDPR consent is not given
     */
    @Transactional
    public PropertyDto createProperty(CreatePropertyRequest request, UUID agentId) {
        log.debug("Creating new property for agent: {}", agentId);

        // Validate agent exists
        Agent agent = getAgentById(agentId);

        // Validate GDPR consent
        if (!Boolean.TRUE.equals(request.getDataProcessingConsent())) {
            throw new IllegalArgumentException("Data processing consent is required to create a property");
        }

        // Convert request to entity
        Property property = convertCreateRequestToEntity(request);
        property.setAgent(agent);
        property.setStatus(PropertyStatus.AVAILABLE);
        property.setConsentDate(LocalDate.now());

        // Calculate price per sqm if not provided
        if (property.getPricePerSqm() == null && property.getPrice() != null &&
            property.getLivingAreaSqm() != null && property.getLivingAreaSqm().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal pricePerSqm = property.getPrice()
                .divide(property.getLivingAreaSqm(), 2, RoundingMode.HALF_UP);
            property.setPricePerSqm(pricePerSqm);
        }

        // Save property
        Property savedProperty = propertyRepository.save(property);
        log.info("Created property: {} for agent: {}", savedProperty.getId(), agentId);

        return convertToDto(savedProperty);
    }

    /**
     * Update an existing property with ownership and GDPR validation.
     *
     * @param propertyId the ID of the property to update
     * @param request the property update request
     * @param agentId the ID of the agent updating the property
     * @return the updated property as DTO
     * @throws ResourceNotFoundException if property is not found or access denied
     */
    @Transactional
    public PropertyDto updateProperty(UUID propertyId, UpdatePropertyRequest request, UUID agentId) {
        log.debug("Updating property: {} for agent: {}", propertyId, agentId);

        // Fetch and validate property
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        // Update fields from request (only non-null values)
        updatePropertyFields(property, request);

        // Recalculate price per sqm if price or area changed
        if ((request.getPrice() != null || request.getLivingAreaSqm() != null) &&
            property.getPrice() != null && property.getLivingAreaSqm() != null &&
            property.getLivingAreaSqm().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal pricePerSqm = property.getPrice()
                .divide(property.getLivingAreaSqm(), 2, RoundingMode.HALF_UP);
            property.setPricePerSqm(pricePerSqm);
        }

        // Save updated property
        Property updatedProperty = propertyRepository.save(property);
        log.info("Updated property: {} for agent: {}", propertyId, agentId);

        return convertToDto(updatedProperty);
    }

    /**
     * Get a single property by ID with ownership validation.
     *
     * @param propertyId the ID of the property
     * @param agentId the ID of the agent requesting the property
     * @return the property as DTO
     * @throws ResourceNotFoundException if property is not found or access denied
     */
    @Transactional(readOnly = true)
    public PropertyDto getProperty(UUID propertyId, UUID agentId) {
        log.debug("Getting property: {} for agent: {}", propertyId, agentId);

        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        return convertToDtoWithImages(property);
    }

    /**
     * Get all properties for an agent with pagination.
     *
     * @param agentId the ID of the agent
     * @param pageable pagination parameters
     * @return page of properties as DTOs
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getAllProperties(UUID agentId, Pageable pageable) {
        log.debug("Getting all properties for agent: {}", agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgent(agent, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Delete a property with ownership validation.
     * Cascades to delete associated images.
     *
     * @param propertyId the ID of the property to delete
     * @param agentId the ID of the agent deleting the property
     * @throws ResourceNotFoundException if property is not found or access denied
     */
    @Transactional
    public void deleteProperty(UUID propertyId, UUID agentId) {
        log.debug("Deleting property: {} for agent: {}", propertyId, agentId);

        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        // Delete associated images (cascade will handle this, but explicit for clarity)
        propertyImageRepository.deleteByProperty(property);

        // Delete property
        propertyRepository.delete(property);
        log.info("Deleted property: {} for agent: {}", propertyId, agentId);
    }

    /**
     * Advanced property search with multiple criteria.
     *
     * @param criteria the search criteria
     * @param agentId the ID of the agent
     * @param pageable pagination parameters
     * @return page of matching properties as DTOs
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> searchProperties(PropertySearchFilter criteria, UUID agentId, Pageable pageable) {
        log.debug("Advanced property search for agent: {} with criteria: {}", agentId, criteria);

        Agent agent = getAgentById(agentId);

        Page<Property> properties = propertyRepository.findByAdvancedCriteria(
            agent,
            criteria.getStatus(),
            criteria.getPropertyType(),
            criteria.getListingType(),
            criteria.getCity(),
            criteria.getMinPrice(),
            criteria.getMaxPrice(),
            criteria.getMinArea(),
            criteria.getMaxArea(),
            criteria.getMinRooms(),
            criteria.getMaxRooms(),
            pageable
        );

        return properties.map(this::convertToDto);
    }

    /**
     * Get properties filtered by status.
     *
     * @param status the property status
     * @param agentId the ID of the agent
     * @param pageable pagination parameters
     * @return page of properties with the specified status
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getPropertiesByStatus(PropertyStatus status, UUID agentId, Pageable pageable) {
        log.debug("Getting properties by status: {} for agent: {}", status, agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndStatus(agent, status, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Get properties filtered by property type.
     *
     * @param propertyType the property type
     * @param agentId the ID of the agent
     * @param pageable pagination parameters
     * @return page of properties with the specified type
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getPropertiesByType(PropertyType propertyType, UUID agentId, Pageable pageable) {
        log.debug("Getting properties by type: {} for agent: {}", propertyType, agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndPropertyType(agent, propertyType, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Get properties filtered by city.
     *
     * @param city the city name
     * @param agentId the ID of the agent
     * @param pageable pagination parameters
     * @return page of properties in the specified city
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getPropertiesByCity(String city, UUID agentId, Pageable pageable) {
        log.debug("Getting properties by city: {} for agent: {}", city, agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndAddressCity(agent, city, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Get properties filtered by price range.
     *
     * @param minPrice minimum price (inclusive), null for no minimum
     * @param maxPrice maximum price (inclusive), null for no maximum
     * @param agentId the ID of the agent
     * @param pageable pagination parameters
     * @return page of properties within the price range
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getPropertiesByPriceRange(BigDecimal minPrice, BigDecimal maxPrice,
                                                       UUID agentId, Pageable pageable) {
        log.debug("Getting properties by price range: {}-{} for agent: {}", minPrice, maxPrice, agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndPriceRange(agent, minPrice, maxPrice, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Get properties by listing type.
     *
     * @param listingType the listing type (SALE, RENT)
     * @param agentId the ID of the agent
     * @param pageable pagination parameters
     * @return page of properties with the specified listing type
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getPropertiesByListingType(ListingType listingType, UUID agentId, Pageable pageable) {
        log.debug("Getting properties by listing type: {} for agent: {}", listingType, agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndListingType(agent, listingType, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Find properties matching client search criteria.
     *
     * @param searchCriteria the client's search criteria
     * @param agentId the ID of the agent
     * @param pageable pagination parameters
     * @return page of matching properties
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> findMatchingProperties(com.marklerapp.crm.entity.PropertySearchCriteria searchCriteria,
                                                    UUID agentId, Pageable pageable) {
        log.debug("Finding matching properties for agent: {} with criteria: {}", agentId, searchCriteria);

        Agent agent = getAgentById(agentId);

        // Parse property types from array
        List<PropertyType> propertyTypes = null;
        String[] propertyTypeArray = searchCriteria.getPropertyTypesArray();
        if (propertyTypeArray != null && propertyTypeArray.length > 0) {
            propertyTypes = new ArrayList<>();
            for (String typeString : propertyTypeArray) {
                try {
                    propertyTypes.add(PropertyType.valueOf(typeString.trim().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid property type in search criteria: {}", typeString);
                }
            }
            if (propertyTypes.isEmpty()) {
                propertyTypes = null;
            }
        }

        Page<Property> properties = propertyRepository.findMatchingProperties(
            agent,
            searchCriteria.getMinBudget(),
            searchCriteria.getMaxBudget(),
            searchCriteria.getMinSquareMeters() != null ?
                BigDecimal.valueOf(searchCriteria.getMinSquareMeters()) : null,
            searchCriteria.getMaxSquareMeters() != null ?
                BigDecimal.valueOf(searchCriteria.getMaxSquareMeters()) : null,
            searchCriteria.getMinRooms() != null ?
                BigDecimal.valueOf(searchCriteria.getMinRooms()) : null,
            searchCriteria.getMaxRooms() != null ?
                BigDecimal.valueOf(searchCriteria.getMaxRooms()) : null,
            propertyTypes,
            pageable
        );

        return properties.map(this::convertToDto);
    }

    /**
     * Get recent properties added within specified days.
     *
     * @param agentId the ID of the agent
     * @param days number of days to look back
     * @return list of recent properties
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public List<PropertyDto> getRecentProperties(UUID agentId, int days) {
        log.debug("Getting recent properties for agent: {} in last {} days", agentId, days);

        Agent agent = getAgentById(agentId);
        LocalDateTime since = LocalDateTime.now().minusDays(days);

        List<Property> properties = propertyRepository.findRecentPropertiesByAgent(agent, since);

        return properties.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    /**
     * Get available properties from a specific date.
     *
     * @param agentId the ID of the agent
     * @param availableFrom the availability date
     * @param pageable pagination parameters
     * @return page of available properties
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getAvailableProperties(UUID agentId, LocalDate availableFrom, Pageable pageable) {
        log.debug("Getting available properties for agent: {} from: {}", agentId, availableFrom);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findAvailableProperties(agent, availableFrom, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Count total properties for an agent.
     *
     * @param agentId the ID of the agent
     * @return total number of properties
     */
    @Transactional(readOnly = true)
    public long countPropertiesByAgent(UUID agentId) {
        log.debug("Counting properties for agent: {}", agentId);
        return propertyRepository.countByAgentId(agentId);
    }

    /**
     * Count properties by status for an agent.
     *
     * @param agentId the ID of the agent
     * @param status the property status
     * @return number of properties with the specified status
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public long countPropertiesByStatus(UUID agentId, PropertyStatus status) {
        log.debug("Counting properties by status: {} for agent: {}", status, agentId);

        Agent agent = getAgentById(agentId);
        return propertyRepository.countByAgentAndStatus(agent, status);
    }

    /**
     * Get comprehensive property statistics for an agent.
     *
     * @param agentId the ID of the agent
     * @return property statistics
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public PropertyStatsDto getPropertyStats(UUID agentId) {
        log.debug("Getting property statistics for agent: {}", agentId);

        Agent agent = getAgentById(agentId);

        long totalProperties = propertyRepository.countByAgent(agent);
        long availableProperties = propertyRepository.countByAgentAndStatus(agent, PropertyStatus.AVAILABLE);
        long soldProperties = propertyRepository.countByAgentAndStatus(agent, PropertyStatus.SOLD);
        long rentedProperties = propertyRepository.countByAgentAndStatus(agent, PropertyStatus.RENTED);
        long saleProperties = propertyRepository.countByAgentAndListingType(agent, ListingType.SALE);
        long rentalProperties = propertyRepository.countByAgentAndListingType(agent, ListingType.RENT);

        return PropertyStatsDto.builder()
            .totalProperties(totalProperties)
            .availableProperties(availableProperties)
            .soldProperties(soldProperties)
            .rentedProperties(rentedProperties)
            .saleProperties(saleProperties)
            .rentalProperties(rentalProperties)
            .build();
    }

    /**
     * Search properties by text (title, description, address).
     *
     * @param agentId the ID of the agent
     * @param searchTerm the search term
     * @param pageable pagination parameters
     * @return page of matching properties
     * @throws ResourceNotFoundException if agent is not found
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> searchPropertiesByText(UUID agentId, String searchTerm, Pageable pageable) {
        log.debug("Searching properties for agent: {} with term: {}", agentId, searchTerm);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndSearchTerm(agent, searchTerm, pageable);

        return properties.map(this::convertToDto);
    }

    // ========================================
    // Private Helper Methods
    // ========================================

    /**
     * Get agent by ID with validation.
     *
     * @param agentId the agent ID
     * @return the agent entity
     * @throws ResourceNotFoundException if agent is not found
     */
    private Agent getAgentById(UUID agentId) {
        return agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));
    }

    /**
     * Get property by ID and validate agent ownership.
     *
     * @param propertyId the property ID
     * @param agentId the agent ID
     * @return the property entity
     * @throws ResourceNotFoundException if property is not found or access denied
     */
    private Property getPropertyByIdAndValidateOwnership(UUID propertyId, UUID agentId) {
        Property property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));

        // Validate ownership
        if (!property.getAgent().getId().equals(agentId)) {
            log.warn("Agent {} attempted to access property {} owned by agent {}",
                agentId, propertyId, property.getAgent().getId());
            throw new ResourceNotFoundException("Property not found or access denied");
        }

        return property;
    }

    /**
     * Convert CreatePropertyRequest to Property entity.
     *
     * @param request the creation request
     * @return the property entity
     */
    private Property convertCreateRequestToEntity(CreatePropertyRequest request) {
        return Property.builder()
            .title(request.getTitle())
            .description(request.getDescription())
            .propertyType(request.getPropertyType())
            .listingType(request.getListingType())
            .addressStreet(request.getAddressStreet())
            .addressHouseNumber(request.getAddressHouseNumber())
            .addressCity(request.getAddressCity())
            .addressPostalCode(request.getAddressPostalCode())
            .addressState(request.getAddressState())
            .addressCountry("Germany")
            .addressDistrict(request.getAddressDistrict())
            .livingAreaSqm(request.getLivingAreaSqm())
            .totalAreaSqm(request.getTotalAreaSqm())
            .plotAreaSqm(request.getPlotAreaSqm())
            .rooms(request.getRooms())
            .bedrooms(request.getBedrooms())
            .bathrooms(request.getBathrooms())
            .floors(request.getFloors())
            .floorNumber(request.getFloorNumber())
            .constructionYear(request.getConstructionYear())
            .lastRenovationYear(request.getLastRenovationYear())
            .price(request.getPrice())
            .pricePerSqm(request.getPricePerSqm())
            .additionalCosts(request.getAdditionalCosts())
            .heatingCosts(request.getHeatingCosts())
            .commission(request.getCommission())
            .hasElevator(request.getHasElevator() != null ? request.getHasElevator() : false)
            .hasBalcony(request.getHasBalcony() != null ? request.getHasBalcony() : false)
            .hasTerrace(request.getHasTerrace() != null ? request.getHasTerrace() : false)
            .hasGarden(request.getHasGarden() != null ? request.getHasGarden() : false)
            .hasGarage(request.getHasGarage() != null ? request.getHasGarage() : false)
            .hasParking(request.getHasParking() != null ? request.getHasParking() : false)
            .hasBasement(request.getHasBasement() != null ? request.getHasBasement() : false)
            .hasAttic(request.getHasAttic() != null ? request.getHasAttic() : false)
            .isBarrierFree(request.getIsBarrierFree() != null ? request.getIsBarrierFree() : false)
            .petsAllowed(request.getPetsAllowed() != null ? request.getPetsAllowed() : false)
            .furnished(request.getFurnished() != null ? request.getFurnished() : false)
            .energyEfficiencyClass(request.getEnergyEfficiencyClass())
            .energyConsumptionKwh(request.getEnergyConsumptionKwh())
            .heatingType(request.getHeatingType())
            .availableFrom(request.getAvailableFrom())
            .contactPhone(request.getContactPhone())
            .contactEmail(request.getContactEmail())
            .virtualTourUrl(request.getVirtualTourUrl())
            .notes(request.getNotes())
            .dataProcessingConsent(request.getDataProcessingConsent())
            .build();
    }

    /**
     * Update property fields from UpdatePropertyRequest.
     * Only updates non-null fields.
     *
     * @param property the property entity to update
     * @param request the update request
     */
    private void updatePropertyFields(Property property, UpdatePropertyRequest request) {
        if (request.getTitle() != null) property.setTitle(request.getTitle());
        if (request.getDescription() != null) property.setDescription(request.getDescription());
        if (request.getPropertyType() != null) property.setPropertyType(request.getPropertyType());
        if (request.getListingType() != null) property.setListingType(request.getListingType());
        if (request.getStatus() != null) property.setStatus(request.getStatus());

        // Address fields
        if (request.getAddressStreet() != null) property.setAddressStreet(request.getAddressStreet());
        if (request.getAddressHouseNumber() != null) property.setAddressHouseNumber(request.getAddressHouseNumber());
        if (request.getAddressCity() != null) property.setAddressCity(request.getAddressCity());
        if (request.getAddressPostalCode() != null) property.setAddressPostalCode(request.getAddressPostalCode());
        if (request.getAddressState() != null) property.setAddressState(request.getAddressState());
        if (request.getAddressDistrict() != null) property.setAddressDistrict(request.getAddressDistrict());

        // Property specifications
        if (request.getLivingAreaSqm() != null) property.setLivingAreaSqm(request.getLivingAreaSqm());
        if (request.getTotalAreaSqm() != null) property.setTotalAreaSqm(request.getTotalAreaSqm());
        if (request.getPlotAreaSqm() != null) property.setPlotAreaSqm(request.getPlotAreaSqm());
        if (request.getRooms() != null) property.setRooms(request.getRooms());
        if (request.getBedrooms() != null) property.setBedrooms(request.getBedrooms());
        if (request.getBathrooms() != null) property.setBathrooms(request.getBathrooms());
        if (request.getFloors() != null) property.setFloors(request.getFloors());
        if (request.getFloorNumber() != null) property.setFloorNumber(request.getFloorNumber());
        if (request.getConstructionYear() != null) property.setConstructionYear(request.getConstructionYear());
        if (request.getLastRenovationYear() != null) property.setLastRenovationYear(request.getLastRenovationYear());

        // Financial information
        if (request.getPrice() != null) property.setPrice(request.getPrice());
        if (request.getPricePerSqm() != null) property.setPricePerSqm(request.getPricePerSqm());
        if (request.getAdditionalCosts() != null) property.setAdditionalCosts(request.getAdditionalCosts());
        if (request.getHeatingCosts() != null) property.setHeatingCosts(request.getHeatingCosts());
        if (request.getCommission() != null) property.setCommission(request.getCommission());

        // Features
        if (request.getHasElevator() != null) property.setHasElevator(request.getHasElevator());
        if (request.getHasBalcony() != null) property.setHasBalcony(request.getHasBalcony());
        if (request.getHasTerrace() != null) property.setHasTerrace(request.getHasTerrace());
        if (request.getHasGarden() != null) property.setHasGarden(request.getHasGarden());
        if (request.getHasGarage() != null) property.setHasGarage(request.getHasGarage());
        if (request.getHasParking() != null) property.setHasParking(request.getHasParking());
        if (request.getHasBasement() != null) property.setHasBasement(request.getHasBasement());
        if (request.getHasAttic() != null) property.setHasAttic(request.getHasAttic());
        if (request.getIsBarrierFree() != null) property.setIsBarrierFree(request.getIsBarrierFree());
        if (request.getPetsAllowed() != null) property.setPetsAllowed(request.getPetsAllowed());
        if (request.getFurnished() != null) property.setFurnished(request.getFurnished());

        // Energy efficiency
        if (request.getEnergyEfficiencyClass() != null) {
            property.setEnergyEfficiencyClass(request.getEnergyEfficiencyClass());
        }
        if (request.getEnergyConsumptionKwh() != null) {
            property.setEnergyConsumptionKwh(request.getEnergyConsumptionKwh());
        }
        if (request.getHeatingType() != null) property.setHeatingType(request.getHeatingType());

        // Additional fields
        if (request.getAvailableFrom() != null) property.setAvailableFrom(request.getAvailableFrom());
        if (request.getContactPhone() != null) property.setContactPhone(request.getContactPhone());
        if (request.getContactEmail() != null) property.setContactEmail(request.getContactEmail());
        if (request.getVirtualTourUrl() != null) property.setVirtualTourUrl(request.getVirtualTourUrl());
        if (request.getNotes() != null) property.setNotes(request.getNotes());
    }

    /**
     * Convert Property entity to DTO.
     *
     * @param property the property entity
     * @return the property DTO
     */
    public PropertyDto convertToDto(Property property) {
        List<PropertyImageDto> imageDtos = null;
        if (property.getImages() != null) {
            imageDtos = property.getImages().stream()
                .map(this::convertImageToDto)
                .collect(Collectors.toList());
        }

        PropertyDto dto = PropertyDto.builder()
            .id(property.getId())
            .agentId(property.getAgent().getId())
            .title(property.getTitle())
            .description(property.getDescription())
            .propertyType(property.getPropertyType())
            .listingType(property.getListingType())
            .status(property.getStatus())
            .addressStreet(property.getAddressStreet())
            .addressHouseNumber(property.getAddressHouseNumber())
            .addressCity(property.getAddressCity())
            .addressPostalCode(property.getAddressPostalCode())
            .addressState(property.getAddressState())
            .addressCountry(property.getAddressCountry())
            .addressDistrict(property.getAddressDistrict())
            .livingAreaSqm(property.getLivingAreaSqm())
            .totalAreaSqm(property.getTotalAreaSqm())
            .plotAreaSqm(property.getPlotAreaSqm())
            .rooms(property.getRooms())
            .bedrooms(property.getBedrooms())
            .bathrooms(property.getBathrooms())
            .floors(property.getFloors())
            .floorNumber(property.getFloorNumber())
            .constructionYear(property.getConstructionYear())
            .lastRenovationYear(property.getLastRenovationYear())
            .price(property.getPrice())
            .pricePerSqm(property.getPricePerSqm())
            .additionalCosts(property.getAdditionalCosts())
            .heatingCosts(property.getHeatingCosts())
            .commission(property.getCommission())
            .hasElevator(property.getHasElevator())
            .hasBalcony(property.getHasBalcony())
            .hasTerrace(property.getHasTerrace())
            .hasGarden(property.getHasGarden())
            .hasGarage(property.getHasGarage())
            .hasParking(property.getHasParking())
            .hasBasement(property.getHasBasement())
            .hasAttic(property.getHasAttic())
            .isBarrierFree(property.getIsBarrierFree())
            .petsAllowed(property.getPetsAllowed())
            .furnished(property.getFurnished())
            .energyEfficiencyClass(property.getEnergyEfficiencyClass())
            .energyConsumptionKwh(property.getEnergyConsumptionKwh())
            .heatingType(property.getHeatingType())
            .availableFrom(property.getAvailableFrom())
            .contactPhone(property.getContactPhone())
            .contactEmail(property.getContactEmail())
            .virtualTourUrl(property.getVirtualTourUrl())
            .notes(property.getNotes())
            .dataProcessingConsent(property.getDataProcessingConsent())
            .consentDate(property.getConsentDate())
            .images(imageDtos)
            .exposeFileName(property.getExposeFileName())
            .exposeFileSize(property.getExposeFileSize())
            .exposeUploadedAt(property.getExposeUploadedAt())
            .createdAt(property.getCreatedAt())
            .updatedAt(property.getUpdatedAt())
            .build();

        // Set computed fields
        dto.setFormattedAddress(property.getFormattedAddress());
        dto.setCalculatedPricePerSqm(property.calculatePricePerSqm());

        return dto;
    }

    /**
     * Convert Property entity to DTO with images explicitly loaded.
     *
     * @param property the property entity
     * @return the property DTO with images
     */
    private PropertyDto convertToDtoWithImages(Property property) {
        PropertyDto dto = convertToDto(property);

        // Load images explicitly if not already loaded
        if (dto.getImages() == null || dto.getImages().isEmpty()) {
            List<PropertyImage> images = propertyImageRepository.findByPropertyOrderBySortOrderAsc(property);
            List<PropertyImageDto> imageDtos = images.stream()
                .map(this::convertImageToDto)
                .collect(Collectors.toList());
            dto.setImages(imageDtos);
        }

        return dto;
    }

    /**
     * Convert PropertyImage entity to DTO.
     *
     * @param image the property image entity
     * @return the property image DTO
     */
    private PropertyImageDto convertImageToDto(PropertyImage image) {
        PropertyImageDto dto = PropertyImageDto.builder()
            .id(image.getId())
            .propertyId(image.getProperty().getId())
            .filename(image.getFilename())
            .originalFilename(image.getOriginalFilename())
            .filePath(image.getFilePath())
            .contentType(image.getContentType())
            .fileSize(image.getFileSize())
            .title(image.getTitle())
            .description(image.getDescription())
            .altText(image.getAltText())
            .width(image.getWidth())
            .height(image.getHeight())
            .isPrimary(image.getIsPrimary())
            .sortOrder(image.getSortOrder())
            .imageType(image.getImageType())
            .createdAt(image.getCreatedAt())
            .updatedAt(image.getUpdatedAt())
            .build();

        // Set computed fields
        dto.setFileExtension(image.getFileExtension());
        dto.setFormattedFileSize(image.getFormattedFileSize());
        dto.setAspectRatio(image.getAspectRatio());

        // Set Base64 data URLs for direct display in browser
        if (image.getImageData() != null) {
            String dataUrl = "data:" + image.getContentType() + ";base64," + image.getImageData();
            dto.setImageUrl(dataUrl);
        }

        if (image.getThumbnailData() != null) {
            String thumbnailDataUrl = "data:" + image.getContentType() + ";base64," + image.getThumbnailData();
            dto.setThumbnailUrl(thumbnailDataUrl);
        }

        return dto;
    }

    // ========================================
    // Supporting Classes
    // ========================================

    /**
     * Filter criteria for advanced property search.
     */
    public static class PropertySearchFilter {
        private PropertyStatus status;
        private PropertyType propertyType;
        private ListingType listingType;
        private String city;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
        private BigDecimal minArea;
        private BigDecimal maxArea;
        private BigDecimal minRooms;
        private BigDecimal maxRooms;

        // Getters and setters
        public PropertyStatus getStatus() { return status; }
        public void setStatus(PropertyStatus status) { this.status = status; }

        public PropertyType getPropertyType() { return propertyType; }
        public void setPropertyType(PropertyType propertyType) { this.propertyType = propertyType; }

        public ListingType getListingType() { return listingType; }
        public void setListingType(ListingType listingType) { this.listingType = listingType; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }

        public BigDecimal getMinPrice() { return minPrice; }
        public void setMinPrice(BigDecimal minPrice) { this.minPrice = minPrice; }

        public BigDecimal getMaxPrice() { return maxPrice; }
        public void setMaxPrice(BigDecimal maxPrice) { this.maxPrice = maxPrice; }

        public BigDecimal getMinArea() { return minArea; }
        public void setMinArea(BigDecimal minArea) { this.minArea = minArea; }

        public BigDecimal getMaxArea() { return maxArea; }
        public void setMaxArea(BigDecimal maxArea) { this.maxArea = maxArea; }

        public BigDecimal getMinRooms() { return minRooms; }
        public void setMinRooms(BigDecimal minRooms) { this.minRooms = minRooms; }

        public BigDecimal getMaxRooms() { return maxRooms; }
        public void setMaxRooms(BigDecimal maxRooms) { this.maxRooms = maxRooms; }
    }

    /**
     * DTO for property statistics.
     */
    public static class PropertyStatsDto {
        public long totalProperties;
        public long availableProperties;
        public long soldProperties;
        public long rentedProperties;
        public long saleProperties;
        public long rentalProperties;

        public static PropertyStatsDtoBuilder builder() {
            return new PropertyStatsDtoBuilder();
        }

        public static class PropertyStatsDtoBuilder {
            private long totalProperties;
            private long availableProperties;
            private long soldProperties;
            private long rentedProperties;
            private long saleProperties;
            private long rentalProperties;

            public PropertyStatsDtoBuilder totalProperties(long totalProperties) {
                this.totalProperties = totalProperties;
                return this;
            }

            public PropertyStatsDtoBuilder availableProperties(long availableProperties) {
                this.availableProperties = availableProperties;
                return this;
            }

            public PropertyStatsDtoBuilder soldProperties(long soldProperties) {
                this.soldProperties = soldProperties;
                return this;
            }

            public PropertyStatsDtoBuilder rentedProperties(long rentedProperties) {
                this.rentedProperties = rentedProperties;
                return this;
            }

            public PropertyStatsDtoBuilder saleProperties(long saleProperties) {
                this.saleProperties = saleProperties;
                return this;
            }

            public PropertyStatsDtoBuilder rentalProperties(long rentalProperties) {
                this.rentalProperties = rentalProperties;
                return this;
            }

            public PropertyStatsDto build() {
                PropertyStatsDto dto = new PropertyStatsDto();
                dto.totalProperties = this.totalProperties;
                dto.availableProperties = this.availableProperties;
                dto.soldProperties = this.soldProperties;
                dto.rentedProperties = this.rentedProperties;
                dto.saleProperties = this.saleProperties;
                dto.rentalProperties = this.rentalProperties;
                return dto;
            }
        }
    }

    // ========================================
    // Property Expose/Brochure Management
    // ========================================

    /**
     * Upload property expose (PDF brochure)
     */
    @Transactional
    public PropertyExposeDto uploadExpose(UUID agentId, UUID propertyId, PropertyExposeDto exposeDto) {
        log.info("Uploading expose for property: {} by agent: {}", propertyId, agentId);

        Property property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        // Verify agent ownership
        if (!property.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Property does not belong to the specified agent");
        }

        // Validate PDF
        validatePdfExpose(exposeDto);

        // Set expose data
        property.setExposeFileName(exposeDto.getFileName());
        property.setExposeFileData(exposeDto.getFileData());
        property.setExposeFileSize(exposeDto.getFileSize());
        property.setExposeUploadedAt(LocalDateTime.now());

        propertyRepository.save(property);

        log.info("Successfully uploaded expose for property: {}", propertyId);

        return PropertyExposeDto.builder()
            .propertyId(propertyId)
            .fileName(property.getExposeFileName())
            .fileSize(property.getExposeFileSize())
            .uploadedAt(property.getExposeUploadedAt())
            .build();
    }

    /**
     * Download property expose (PDF brochure)
     */
    @Transactional(readOnly = true)
    public PropertyExposeDto downloadExpose(UUID agentId, UUID propertyId) {
        log.debug("Downloading expose for property: {} by agent: {}", propertyId, agentId);

        Property property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        // Verify agent ownership
        if (!property.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Property does not belong to the specified agent");
        }

        // Check if expose exists
        if (property.getExposeFileName() == null || property.getExposeFileData() == null) {
            throw new ResourceNotFoundException("No expose found for property: " + propertyId);
        }

        return PropertyExposeDto.builder()
            .propertyId(propertyId)
            .fileName(property.getExposeFileName())
            .fileData(property.getExposeFileData())
            .fileSize(property.getExposeFileSize())
            .uploadedAt(property.getExposeUploadedAt())
            .build();
    }

    /**
     * Delete property expose (PDF brochure)
     */
    @Transactional
    public void deleteExpose(UUID agentId, UUID propertyId) {
        log.info("Deleting expose for property: {} by agent: {}", propertyId, agentId);

        Property property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        // Verify agent ownership
        if (!property.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Property does not belong to the specified agent");
        }

        // Clear expose data
        property.setExposeFileName(null);
        property.setExposeFileData(null);
        property.setExposeFileSize(null);
        property.setExposeUploadedAt(null);

        propertyRepository.save(property);

        log.info("Successfully deleted expose for property: {}", propertyId);
    }

    /**
     * Check if property has an expose
     */
    @Transactional(readOnly = true)
    public boolean hasExpose(UUID agentId, UUID propertyId) {
        Property property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        // Verify agent ownership
        if (!property.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Property does not belong to the specified agent");
        }

        return property.getExposeFileName() != null && property.getExposeFileData() != null;
    }

    /**
     * Validate PDF expose
     */
    private void validatePdfExpose(PropertyExposeDto exposeDto) {
        // Validate filename
        if (exposeDto.getFileName() == null || !exposeDto.getFileName().toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("File must be a PDF");
        }

        // Validate file size (max 50MB)
        long maxSize = 52428800L; // 50MB in bytes
        if (exposeDto.getFileSize() == null || exposeDto.getFileSize() > maxSize) {
            throw new IllegalArgumentException("File size must not exceed 50MB");
        }

        // Validate file data
        if (exposeDto.getFileData() == null || exposeDto.getFileData().trim().isEmpty()) {
            throw new IllegalArgumentException("File data is required");
        }

        // Validate Base64 format
        try {
            // Try to decode to validate Base64 format
            java.util.Base64.getDecoder().decode(exposeDto.getFileData());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid file data format. Must be Base64 encoded.");
        }

        // Validate PDF signature (first bytes should be %PDF)
        try {
            byte[] decodedBytes = java.util.Base64.getDecoder().decode(exposeDto.getFileData());
            if (decodedBytes.length < 4) {
                throw new IllegalArgumentException("Invalid PDF file");
            }
            String header = new String(decodedBytes, 0, Math.min(4, decodedBytes.length));
            if (!header.startsWith("%PDF")) {
                throw new IllegalArgumentException("Invalid PDF file format");
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid PDF file: " + e.getMessage());
        }
    }
}
