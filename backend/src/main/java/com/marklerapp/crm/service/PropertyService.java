package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.PropertyDto;
import com.marklerapp.crm.dto.PropertyImageDto;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing property operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final PropertyImageRepository propertyImageRepository;
    private final AgentRepository agentRepository;

    /**
     * Get all properties for an agent with pagination
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getPropertiesByAgent(UUID agentId, Pageable pageable) {
        log.debug("Getting properties for agent: {}", agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgent(agent, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Search properties by term for an agent
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> searchProperties(UUID agentId, String searchTerm, Pageable pageable) {
        log.debug("Searching properties for agent: {} with term: {}", agentId, searchTerm);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndSearchTerm(agent, searchTerm, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Get property by ID
     */
    @Transactional(readOnly = true)
    public PropertyDto getPropertyById(UUID propertyId, UUID agentId) {
        log.debug("Getting property: {} for agent: {}", propertyId, agentId);

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        // Check ownership
        if (!property.getAgent().getId().equals(agentId)) {
            throw new ResourceNotFoundException("Property not found or access denied");
        }

        return convertToDtoWithImages(property);
    }

    /**
     * Create new property
     */
    @Transactional
    public PropertyDto createProperty(PropertyDto propertyDto, UUID agentId) {
        log.debug("Creating new property for agent: {}", agentId);

        Agent agent = getAgentById(agentId);

        Property property = convertToEntity(propertyDto);
        property.setAgent(agent);
        property.setStatus(PropertyStatus.AVAILABLE);

        Property savedProperty = propertyRepository.save(property);
        log.info("Created property: {} for agent: {}", savedProperty.getId(), agentId);

        return convertToDto(savedProperty);
    }

    /**
     * Update existing property
     */
    @Transactional
    public PropertyDto updateProperty(UUID propertyId, PropertyDto propertyDto, UUID agentId) {
        log.debug("Updating property: {} for agent: {}", propertyId, agentId);

        Property existingProperty = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        // Check ownership
        if (!existingProperty.getAgent().getId().equals(agentId)) {
            throw new ResourceNotFoundException("Property not found or access denied");
        }

        // Update fields
        updatePropertyFields(existingProperty, propertyDto);

        Property updatedProperty = propertyRepository.save(existingProperty);
        log.info("Updated property: {} for agent: {}", propertyId, agentId);

        return convertToDto(updatedProperty);
    }

    /**
     * Delete property
     */
    @Transactional
    public void deleteProperty(UUID propertyId, UUID agentId) {
        log.debug("Deleting property: {} for agent: {}", propertyId, agentId);

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        // Check ownership
        if (!property.getAgent().getId().equals(agentId)) {
            throw new ResourceNotFoundException("Property not found or access denied");
        }

        // Delete associated images first
        propertyImageRepository.deleteByProperty(property);

        propertyRepository.delete(property);
        log.info("Deleted property: {} for agent: {}", propertyId, agentId);
    }

    /**
     * Get properties by status
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getPropertiesByStatus(UUID agentId, PropertyStatus status, Pageable pageable) {
        log.debug("Getting properties by status: {} for agent: {}", status, agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndStatus(agent, status, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Get properties by type
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getPropertiesByType(UUID agentId, PropertyType propertyType, Pageable pageable) {
        log.debug("Getting properties by type: {} for agent: {}", propertyType, agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndPropertyType(agent, propertyType, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Get properties by listing type
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getPropertiesByListingType(UUID agentId, ListingType listingType, Pageable pageable) {
        log.debug("Getting properties by listing type: {} for agent: {}", listingType, agentId);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findByAgentAndListingType(agent, listingType, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Advanced property search with filters
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> searchPropertiesAdvanced(UUID agentId, PropertySearchFilter filter, Pageable pageable) {
        log.debug("Advanced property search for agent: {} with filter: {}", agentId, filter);

        Agent agent = getAgentById(agentId);

        Page<Property> properties = propertyRepository.findByAdvancedCriteria(
                agent,
                filter.getStatus(),
                filter.getPropertyType(),
                filter.getListingType(),
                filter.getCity(),
                filter.getMinPrice(),
                filter.getMaxPrice(),
                filter.getMinArea(),
                filter.getMaxArea(),
                filter.getMinRooms(),
                filter.getMaxRooms(),
                pageable
        );

        return properties.map(this::convertToDto);
    }

    /**
     * Find matching properties for client criteria
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> findMatchingProperties(UUID agentId, PropertySearchCriteria searchCriteria, Pageable pageable) {
        log.debug("Finding matching properties for agent: {} with criteria: {}", agentId, searchCriteria);

        Agent agent = getAgentById(agentId);

        List<PropertyType> propertyTypes = null;
        String[] propertyTypeArray = searchCriteria.getPropertyTypesArray();
        if (propertyTypeArray != null && propertyTypeArray.length > 0) {
            propertyTypes = new ArrayList<>();
            for (String typeString : propertyTypeArray) {
                try {
                    propertyTypes.add(PropertyType.valueOf(typeString.trim().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid property type in search criteria: {}", typeString);
                    // Skip invalid property types instead of failing
                }
            }
            // If no valid property types were found, set to null
            if (propertyTypes.isEmpty()) {
                propertyTypes = null;
            }
        }

        Page<Property> properties = propertyRepository.findMatchingProperties(
                agent,
                searchCriteria.getMinBudget(),
                searchCriteria.getMaxBudget(),
                searchCriteria.getMinSquareMeters() != null ? BigDecimal.valueOf(searchCriteria.getMinSquareMeters()) : null,
                searchCriteria.getMaxSquareMeters() != null ? BigDecimal.valueOf(searchCriteria.getMaxSquareMeters()) : null,
                searchCriteria.getMinRooms() != null ? BigDecimal.valueOf(searchCriteria.getMinRooms()) : null,
                searchCriteria.getMaxRooms() != null ? BigDecimal.valueOf(searchCriteria.getMaxRooms()) : null,
                propertyTypes,
                pageable
        );

        return properties.map(this::convertToDto);
    }

    /**
     * Get recent properties
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
     * Get available properties
     */
    @Transactional(readOnly = true)
    public Page<PropertyDto> getAvailableProperties(UUID agentId, LocalDate availableFrom, Pageable pageable) {
        log.debug("Getting available properties for agent: {} from: {}", agentId, availableFrom);

        Agent agent = getAgentById(agentId);
        Page<Property> properties = propertyRepository.findAvailableProperties(agent, availableFrom, pageable);

        return properties.map(this::convertToDto);
    }

    /**
     * Count properties by agent
     */
    @Transactional(readOnly = true)
    public long countPropertiesByAgent(UUID agentId) {
        log.debug("Counting properties for agent: {}", agentId);
        return propertyRepository.countByAgentId(agentId);
    }

    /**
     * Count properties by status
     */
    @Transactional(readOnly = true)
    public long countPropertiesByStatus(UUID agentId, PropertyStatus status) {
        log.debug("Counting properties by status: {} for agent: {}", status, agentId);

        Agent agent = getAgentById(agentId);
        return propertyRepository.countByAgentAndStatus(agent, status);
    }

    /**
     * Get property statistics
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
     * Get agent by ID
     */
    private Agent getAgentById(UUID agentId) {
        return agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));
    }

    /**
     * Convert Property entity to DTO
     */
    private PropertyDto convertToDto(Property property) {
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
                .images(imageDtos)
                .createdAt(property.getCreatedAt())
                .updatedAt(property.getUpdatedAt())
                .build();

        // Set computed fields
        dto.setFormattedAddress(property.getFormattedAddress());
        dto.setCalculatedPricePerSqm(property.calculatePricePerSqm());

        return dto;
    }

    /**
     * Convert Property entity to DTO with images loaded
     */
    private PropertyDto convertToDtoWithImages(Property property) {
        PropertyDto dto = convertToDto(property);

        // Load images explicitly if not already loaded
        if (dto.getImages() == null) {
            List<PropertyImage> images = propertyImageRepository.findByPropertyOrderBySortOrderAsc(property);
            List<PropertyImageDto> imageDtos = images.stream()
                    .map(this::convertImageToDto)
                    .collect(Collectors.toList());
            dto.setImages(imageDtos);
        }

        return dto;
    }

    /**
     * Convert PropertyImage entity to DTO
     */
    private PropertyImageDto convertImageToDto(PropertyImage image) {
        return PropertyImageDto.builder()
                .id(image.getId())
                .propertyId(image.getProperty().getId())
                .filename(image.getFilename())
                .originalFilename(image.getOriginalFilename())
                .contentType(image.getContentType())
                .fileSize(image.getFileSize())
                .title(image.getTitle())
                .description(image.getDescription())
                .isPrimary(image.getIsPrimary())
                .sortOrder(image.getSortOrder())
                .imageType(image.getImageType())
                .createdAt(image.getCreatedAt())
                .updatedAt(image.getUpdatedAt())
                .build();
    }

    /**
     * Convert DTO to Property entity
     */
    private Property convertToEntity(PropertyDto dto) {
        return Property.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .propertyType(dto.getPropertyType())
                .listingType(dto.getListingType())
                .status(dto.getStatus() != null ? dto.getStatus() : PropertyStatus.AVAILABLE)
                .addressStreet(dto.getAddressStreet())
                .addressHouseNumber(dto.getAddressHouseNumber())
                .addressCity(dto.getAddressCity())
                .addressPostalCode(dto.getAddressPostalCode())
                .addressState(dto.getAddressState())
                .addressCountry(dto.getAddressCountry() != null ? dto.getAddressCountry() : "Germany")
                .addressDistrict(dto.getAddressDistrict())
                .livingAreaSqm(dto.getLivingAreaSqm())
                .totalAreaSqm(dto.getTotalAreaSqm())
                .plotAreaSqm(dto.getPlotAreaSqm())
                .rooms(dto.getRooms())
                .bedrooms(dto.getBedrooms())
                .bathrooms(dto.getBathrooms())
                .floors(dto.getFloors())
                .floorNumber(dto.getFloorNumber())
                .constructionYear(dto.getConstructionYear())
                .lastRenovationYear(dto.getLastRenovationYear())
                .price(dto.getPrice())
                .pricePerSqm(dto.getPricePerSqm())
                .additionalCosts(dto.getAdditionalCosts())
                .heatingCosts(dto.getHeatingCosts())
                .commission(dto.getCommission())
                .hasElevator(dto.getHasElevator() != null ? dto.getHasElevator() : false)
                .hasBalcony(dto.getHasBalcony() != null ? dto.getHasBalcony() : false)
                .hasTerrace(dto.getHasTerrace() != null ? dto.getHasTerrace() : false)
                .hasGarden(dto.getHasGarden() != null ? dto.getHasGarden() : false)
                .hasGarage(dto.getHasGarage() != null ? dto.getHasGarage() : false)
                .hasParking(dto.getHasParking() != null ? dto.getHasParking() : false)
                .hasBasement(dto.getHasBasement() != null ? dto.getHasBasement() : false)
                .hasAttic(dto.getHasAttic() != null ? dto.getHasAttic() : false)
                .isBarrierFree(dto.getIsBarrierFree() != null ? dto.getIsBarrierFree() : false)
                .petsAllowed(dto.getPetsAllowed() != null ? dto.getPetsAllowed() : false)
                .furnished(dto.getFurnished() != null ? dto.getFurnished() : false)
                .energyEfficiencyClass(dto.getEnergyEfficiencyClass())
                .energyConsumptionKwh(dto.getEnergyConsumptionKwh())
                .heatingType(dto.getHeatingType())
                .availableFrom(dto.getAvailableFrom())
                .contactPhone(dto.getContactPhone())
                .contactEmail(dto.getContactEmail())
                .virtualTourUrl(dto.getVirtualTourUrl())
                .notes(dto.getNotes())
                .build();
    }

    /**
     * Update property fields from DTO
     */
    private void updatePropertyFields(Property property, PropertyDto dto) {
        if (dto.getTitle() != null) property.setTitle(dto.getTitle());
        if (dto.getDescription() != null) property.setDescription(dto.getDescription());
        if (dto.getPropertyType() != null) property.setPropertyType(dto.getPropertyType());
        if (dto.getListingType() != null) property.setListingType(dto.getListingType());
        if (dto.getStatus() != null) property.setStatus(dto.getStatus());

        // Address fields
        if (dto.getAddressStreet() != null) property.setAddressStreet(dto.getAddressStreet());
        if (dto.getAddressHouseNumber() != null) property.setAddressHouseNumber(dto.getAddressHouseNumber());
        if (dto.getAddressCity() != null) property.setAddressCity(dto.getAddressCity());
        if (dto.getAddressPostalCode() != null) property.setAddressPostalCode(dto.getAddressPostalCode());
        if (dto.getAddressState() != null) property.setAddressState(dto.getAddressState());
        if (dto.getAddressCountry() != null) property.setAddressCountry(dto.getAddressCountry());
        if (dto.getAddressDistrict() != null) property.setAddressDistrict(dto.getAddressDistrict());

        // Property specifications
        if (dto.getLivingAreaSqm() != null) property.setLivingAreaSqm(dto.getLivingAreaSqm());
        if (dto.getTotalAreaSqm() != null) property.setTotalAreaSqm(dto.getTotalAreaSqm());
        if (dto.getPlotAreaSqm() != null) property.setPlotAreaSqm(dto.getPlotAreaSqm());
        if (dto.getRooms() != null) property.setRooms(dto.getRooms());
        if (dto.getBedrooms() != null) property.setBedrooms(dto.getBedrooms());
        if (dto.getBathrooms() != null) property.setBathrooms(dto.getBathrooms());
        if (dto.getFloors() != null) property.setFloors(dto.getFloors());
        if (dto.getFloorNumber() != null) property.setFloorNumber(dto.getFloorNumber());
        if (dto.getConstructionYear() != null) property.setConstructionYear(dto.getConstructionYear());
        if (dto.getLastRenovationYear() != null) property.setLastRenovationYear(dto.getLastRenovationYear());

        // Financial information
        if (dto.getPrice() != null) property.setPrice(dto.getPrice());
        if (dto.getPricePerSqm() != null) property.setPricePerSqm(dto.getPricePerSqm());
        if (dto.getAdditionalCosts() != null) property.setAdditionalCosts(dto.getAdditionalCosts());
        if (dto.getHeatingCosts() != null) property.setHeatingCosts(dto.getHeatingCosts());
        if (dto.getCommission() != null) property.setCommission(dto.getCommission());

        // Features
        if (dto.getHasElevator() != null) property.setHasElevator(dto.getHasElevator());
        if (dto.getHasBalcony() != null) property.setHasBalcony(dto.getHasBalcony());
        if (dto.getHasTerrace() != null) property.setHasTerrace(dto.getHasTerrace());
        if (dto.getHasGarden() != null) property.setHasGarden(dto.getHasGarden());
        if (dto.getHasGarage() != null) property.setHasGarage(dto.getHasGarage());
        if (dto.getHasParking() != null) property.setHasParking(dto.getHasParking());
        if (dto.getHasBasement() != null) property.setHasBasement(dto.getHasBasement());
        if (dto.getHasAttic() != null) property.setHasAttic(dto.getHasAttic());
        if (dto.getIsBarrierFree() != null) property.setIsBarrierFree(dto.getIsBarrierFree());
        if (dto.getPetsAllowed() != null) property.setPetsAllowed(dto.getPetsAllowed());
        if (dto.getFurnished() != null) property.setFurnished(dto.getFurnished());

        // Energy efficiency
        if (dto.getEnergyEfficiencyClass() != null) property.setEnergyEfficiencyClass(dto.getEnergyEfficiencyClass());
        if (dto.getEnergyConsumptionKwh() != null) property.setEnergyConsumptionKwh(dto.getEnergyConsumptionKwh());
        if (dto.getHeatingType() != null) property.setHeatingType(dto.getHeatingType());

        // Additional fields
        if (dto.getAvailableFrom() != null) property.setAvailableFrom(dto.getAvailableFrom());
        if (dto.getContactPhone() != null) property.setContactPhone(dto.getContactPhone());
        if (dto.getContactEmail() != null) property.setContactEmail(dto.getContactEmail());
        if (dto.getVirtualTourUrl() != null) property.setVirtualTourUrl(dto.getVirtualTourUrl());
        if (dto.getNotes() != null) property.setNotes(dto.getNotes());
    }

    // Supporting classes
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
}