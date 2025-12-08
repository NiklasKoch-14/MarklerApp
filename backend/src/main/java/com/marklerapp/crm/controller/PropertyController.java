package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.PropertyDto;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.security.CustomUserDetails;
import com.marklerapp.crm.service.PropertyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for property management operations.
 */
@Slf4j
@RestController
@RequestMapping("/properties")
@RequiredArgsConstructor
@Tag(name = "Property Management", description = "APIs for managing real estate properties")
public class PropertyController {

    private final PropertyService propertyService;
    private final ClientRepository clientRepository;

    /**
     * Get all properties for the authenticated agent
     */
    @GetMapping
    @Operation(summary = "Get all properties", description = "Retrieve all properties for the authenticated agent with pagination")
    public ResponseEntity<Page<PropertyDto>> getAllProperties(
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<PropertyDto> properties = propertyService.getPropertiesByAgent(agentId, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Search properties by term
     */
    @GetMapping("/search")
    @Operation(summary = "Search properties", description = "Search properties by title, description, or address")
    public ResponseEntity<Page<PropertyDto>> searchProperties(
            @Parameter(description = "Search term") @RequestParam String q,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<PropertyDto> properties = propertyService.searchProperties(agentId, q, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Advanced property search with filters
     */
    @GetMapping("/search/advanced")
    @Operation(summary = "Advanced property search", description = "Search properties with multiple filter criteria")
    public ResponseEntity<Page<PropertyDto>> searchPropertiesAdvanced(
            @Parameter(description = "Property status") @RequestParam(required = false) PropertyStatus status,
            @Parameter(description = "Property type") @RequestParam(required = false) PropertyType propertyType,
            @Parameter(description = "Listing type") @RequestParam(required = false) ListingType listingType,
            @Parameter(description = "City") @RequestParam(required = false) String city,
            @Parameter(description = "Minimum price") @RequestParam(required = false) BigDecimal minPrice,
            @Parameter(description = "Maximum price") @RequestParam(required = false) BigDecimal maxPrice,
            @Parameter(description = "Minimum living area (sqm)") @RequestParam(required = false) BigDecimal minArea,
            @Parameter(description = "Maximum living area (sqm)") @RequestParam(required = false) BigDecimal maxArea,
            @Parameter(description = "Minimum rooms") @RequestParam(required = false) BigDecimal minRooms,
            @Parameter(description = "Maximum rooms") @RequestParam(required = false) BigDecimal maxRooms,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        PropertyService.PropertySearchFilter filter = new PropertyService.PropertySearchFilter();
        filter.setStatus(status);
        filter.setPropertyType(propertyType);
        filter.setListingType(listingType);
        filter.setCity(city);
        filter.setMinPrice(minPrice);
        filter.setMaxPrice(maxPrice);
        filter.setMinArea(minArea);
        filter.setMaxArea(maxArea);
        filter.setMinRooms(minRooms);
        filter.setMaxRooms(maxRooms);

        Page<PropertyDto> properties = propertyService.searchPropertiesAdvanced(agentId, filter, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Get property by ID
     */
    @GetMapping("/{propertyId}")
    @Operation(summary = "Get property by ID", description = "Retrieve a specific property by ID")
    public ResponseEntity<PropertyDto> getProperty(
            @Parameter(description = "Property ID") @PathVariable UUID propertyId,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        PropertyDto property = propertyService.getPropertyById(propertyId, agentId);

        return ResponseEntity.ok(property);
    }

    /**
     * Create a new property
     */
    @PostMapping
    @Operation(summary = "Create property", description = "Create a new property")
    public ResponseEntity<PropertyDto> createProperty(
            @Parameter(description = "Property data") @Valid @RequestBody PropertyDto propertyDto,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        PropertyDto createdProperty = propertyService.createProperty(propertyDto, agentId);

        return ResponseEntity.status(HttpStatus.CREATED).body(createdProperty);
    }

    /**
     * Update an existing property
     */
    @PutMapping("/{propertyId}")
    @Operation(summary = "Update property", description = "Update an existing property")
    public ResponseEntity<PropertyDto> updateProperty(
            @Parameter(description = "Property ID") @PathVariable UUID propertyId,
            @Parameter(description = "Updated property data") @Valid @RequestBody PropertyDto propertyDto,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        PropertyDto updatedProperty = propertyService.updateProperty(propertyId, propertyDto, agentId);

        return ResponseEntity.ok(updatedProperty);
    }

    /**
     * Delete a property
     */
    @DeleteMapping("/{propertyId}")
    @Operation(summary = "Delete property", description = "Delete a property by ID")
    public ResponseEntity<Void> deleteProperty(
            @Parameter(description = "Property ID") @PathVariable UUID propertyId,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        propertyService.deleteProperty(propertyId, agentId);

        return ResponseEntity.noContent().build();
    }

    /**
     * Get recent properties
     */
    @GetMapping("/recent")
    @Operation(summary = "Get recent properties", description = "Get recently created properties")
    public ResponseEntity<List<PropertyDto>> getRecentProperties(
            @Parameter(description = "Number of days") @RequestParam(defaultValue = "30") int days,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        List<PropertyDto> recentProperties = propertyService.getRecentProperties(agentId, days);

        return ResponseEntity.ok(recentProperties);
    }

    /**
     * Get property statistics
     */
    @GetMapping("/stats")
    @Operation(summary = "Get property statistics", description = "Get property count and statistics")
    public ResponseEntity<PropertyService.PropertyStatsDto> getPropertyStats(Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        PropertyService.PropertyStatsDto stats = propertyService.getPropertyStats(agentId);

        return ResponseEntity.ok(stats);
    }

    /**
     * Get available properties
     */
    @GetMapping("/available")
    @Operation(summary = "Get available properties", description = "Get properties that are currently available")
    public ResponseEntity<Page<PropertyDto>> getAvailableProperties(
            @Parameter(description = "Available from date (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate availableFrom,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        // If no date specified, use current date
        LocalDate fromDate = availableFrom != null ? availableFrom : LocalDate.now();

        Page<PropertyDto> properties = propertyService.getAvailableProperties(agentId, fromDate, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Find properties matching client criteria
     */
    @GetMapping("/matching/{clientId}")
    @Operation(summary = "Find matching properties", description = "Find properties that match a client's search criteria")
    public ResponseEntity<Page<PropertyDto>> findMatchingProperties(
            @Parameter(description = "Client ID") @PathVariable UUID clientId,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        // First, fetch the client to get their search criteria
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found with id: " + clientId));

        // Verify ownership
        if (!client.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Client not found or access denied");
        }

        // Check if client has search criteria
        if (client.getSearchCriteria() == null) {
            throw new IllegalArgumentException("Client does not have search criteria defined");
        }

        Page<PropertyDto> properties = propertyService.findMatchingProperties(
                agentId,
                client.getSearchCriteria(),
                pageable
        );

        return ResponseEntity.ok(properties);
    }

    /**
     * Get properties by status
     */
    @GetMapping("/by-status/{status}")
    @Operation(summary = "Get properties by status", description = "Get properties filtered by status")
    public ResponseEntity<Page<PropertyDto>> getPropertiesByStatus(
            @Parameter(description = "Property status") @PathVariable PropertyStatus status,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<PropertyDto> properties = propertyService.getPropertiesByStatus(agentId, status, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Get properties by type
     */
    @GetMapping("/by-type/{type}")
    @Operation(summary = "Get properties by type", description = "Get properties filtered by property type")
    public ResponseEntity<Page<PropertyDto>> getPropertiesByType(
            @Parameter(description = "Property type") @PathVariable PropertyType type,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<PropertyDto> properties = propertyService.getPropertiesByType(agentId, type, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Get properties by listing type
     */
    @GetMapping("/by-listing-type/{listingType}")
    @Operation(summary = "Get properties by listing type", description = "Get properties filtered by listing type (sale/rent)")
    public ResponseEntity<Page<PropertyDto>> getPropertiesByListingType(
            @Parameter(description = "Listing type") @PathVariable ListingType listingType,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<PropertyDto> properties = propertyService.getPropertiesByListingType(agentId, listingType, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Extract agent ID from authentication
     */
    private UUID getAgentIdFromAuth(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getAgent().getId();
    }
}
