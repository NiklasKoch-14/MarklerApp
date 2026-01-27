package com.marklerapp.crm.controller;

import com.marklerapp.crm.constants.PaginationConstants;
import com.marklerapp.crm.dto.*;
import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.PropertyType;
import com.marklerapp.crm.service.PropertyImageService;
import com.marklerapp.crm.service.PropertyService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for comprehensive property management operations.
 * Extends BaseController for common authentication methods.
 *
 * <p>This controller provides all CRUD operations for properties, including:
 * <ul>
 *   <li>Creating, updating, and deleting properties</li>
 *   <li>Retrieving properties with pagination and sorting</li>
 *   <li>Advanced search and filtering capabilities</li>
 *   <li>Image upload and management</li>
 *   <li>Property statistics and analytics</li>
 * </ul>
 * </p>
 *
 * <p>Security: All operations automatically extract the authenticated agent from
 * the JWT token and ensure proper data isolation. Agents can only access their
 * own properties.</p>
 *
 * <p>Error Handling: All validation errors and business logic exceptions are
 * handled by the global exception handler, returning consistent error responses.</p>
 *
 * @see PropertyService
 * @see PropertyImageService
 * @see PropertyDto
 * @see BaseController
 * @since Phase 7.1 - Refactored to use BaseController and @PageableDefault
 */
@Slf4j
@RestController
@RequestMapping("/properties")
@RequiredArgsConstructor
@Tag(name = "Property Management", description = "APIs for managing real estate property listings")
public class PropertyController extends BaseController {

    private final PropertyService propertyService;
    private final PropertyImageService propertyImageService;

    // ========================================
    // Core CRUD Operations
    // ========================================

    /**
     * Create a new property.
     *
     * @param request the property creation request with all required fields
     * @param authentication the authenticated user (agent)
     * @return the created property with generated ID and timestamps
     */
    @PostMapping
    @Operation(summary = "Create new property",
               description = "Create a new property listing with comprehensive details including location, specifications, and pricing information. GDPR consent is required.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Property created successfully",
                     content = @Content(schema = @Schema(implementation = PropertyDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid request data or validation errors"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<PropertyDto> createProperty(
            @Parameter(description = "Property creation request with all required fields", required = true)
            @Valid @RequestBody CreatePropertyRequest request,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Creating new property for agent: {}", agentId);

        PropertyDto createdProperty = propertyService.createProperty(request, agentId);

        log.info("Successfully created property: {} for agent: {}", createdProperty.getId(), agentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProperty);
    }

    /**
     * Update an existing property (full update).
     *
     * @param id the property ID
     * @param request the update request with all fields
     * @param authentication the authenticated user (agent)
     * @return the updated property
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update property",
               description = "Update an existing property with new data. All fields in the request will be updated.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Property updated successfully",
                     content = @Content(schema = @Schema(implementation = PropertyDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid request data or validation errors"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<PropertyDto> updateProperty(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID id,
            @Parameter(description = "Updated property data", required = true)
            @Valid @RequestBody UpdatePropertyRequest request,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Updating property: {} for agent: {}", id, agentId);

        PropertyDto updatedProperty = propertyService.updateProperty(id, request, agentId);

        log.info("Successfully updated property: {} for agent: {}", id, agentId);
        return ResponseEntity.ok(updatedProperty);
    }

    /**
     * Partially update a property (PATCH operation).
     *
     * @param id the property ID
     * @param request the partial update request with only fields to update
     * @param authentication the authenticated user (agent)
     * @return the updated property
     */
    @PatchMapping("/{id}")
    @Operation(summary = "Partially update property",
               description = "Update specific fields of a property. Only provided fields will be updated, others remain unchanged.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Property partially updated successfully",
                     content = @Content(schema = @Schema(implementation = PropertyDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid request data or validation errors"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<PropertyDto> partialUpdateProperty(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID id,
            @Parameter(description = "Partial update data with only fields to change", required = true)
            @RequestBody UpdatePropertyRequest request,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Partially updating property: {} for agent: {}", id, agentId);

        // UpdatePropertyRequest already supports partial updates (only non-null fields are updated)
        PropertyDto updatedProperty = propertyService.updateProperty(id, request, agentId);

        log.info("Successfully partially updated property: {} for agent: {}", id, agentId);
        return ResponseEntity.ok(updatedProperty);
    }

    /**
     * Get a single property by ID.
     *
     * @param id the property ID
     * @param authentication the authenticated user (agent)
     * @return the property details including images
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get property by ID",
               description = "Retrieve detailed information about a specific property including all associated images.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Property retrieved successfully",
                     content = @Content(schema = @Schema(implementation = PropertyDto.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<PropertyDto> getProperty(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID id,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Getting property: {} for agent: {}", id, agentId);

        PropertyDto property = propertyService.getProperty(id, agentId);

        return ResponseEntity.ok(property);
    }

    /**
     * Get all properties for the authenticated agent with pagination.
     *
     * @param pageable pagination and sorting parameters
     * @param authentication the authenticated user (agent)
     * @return page of properties
     */
    @GetMapping
    @Operation(summary = "Get all properties",
               description = "Retrieve all properties for the authenticated agent with pagination and sorting support.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Properties retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<Page<PropertyDto>> getAllProperties(
            @PageableDefault(
                size = PaginationConstants.DEFAULT_PAGE_SIZE,
                sort = PaginationConstants.DEFAULT_SORT_FIELD,
                direction = Sort.Direction.DESC
            ) Pageable pageable,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Getting all properties for agent: {} (page: {}, size: {})",
                  agentId, pageable.getPageNumber(), pageable.getPageSize());

        Page<PropertyDto> properties = propertyService.getAllProperties(agentId, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Delete a property by ID.
     *
     * @param id the property ID
     * @param authentication the authenticated user (agent)
     * @return no content
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete property",
               description = "Delete a property and all associated images. This operation cannot be undone.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Property deleted successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<Void> deleteProperty(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID id,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Deleting property: {} for agent: {}", id, agentId);

        propertyService.deleteProperty(id, agentId);

        log.info("Successfully deleted property: {} for agent: {}", id, agentId);
        return ResponseEntity.noContent().build();
    }

    // ========================================
    // Search and Filter Operations
    // ========================================

    /**
     * Advanced property search with multiple criteria.
     */
    @GetMapping("/search")
    @Operation(summary = "Advanced property search",
               description = "Search properties with multiple filter criteria including status, type, location, price range, area, and room count.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Search completed successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<Page<PropertyDto>> searchProperties(
            @Parameter(description = "Property status")
            @RequestParam(required = false) PropertyStatus status,
            @Parameter(description = "Property type")
            @RequestParam(required = false) PropertyType propertyType,
            @Parameter(description = "Listing type (SALE or RENT)")
            @RequestParam(required = false) ListingType listingType,
            @Parameter(description = "City name")
            @RequestParam(required = false) String city,
            @Parameter(description = "Minimum price")
            @RequestParam(required = false) BigDecimal minPrice,
            @Parameter(description = "Maximum price")
            @RequestParam(required = false) BigDecimal maxPrice,
            @Parameter(description = "Minimum living area (sqm)")
            @RequestParam(required = false) BigDecimal minArea,
            @Parameter(description = "Maximum living area (sqm)")
            @RequestParam(required = false) BigDecimal maxArea,
            @Parameter(description = "Minimum number of rooms")
            @RequestParam(required = false) BigDecimal minRooms,
            @Parameter(description = "Maximum number of rooms")
            @RequestParam(required = false) BigDecimal maxRooms,
            @PageableDefault(
                size = PaginationConstants.DEFAULT_PAGE_SIZE,
                sort = PaginationConstants.DEFAULT_SORT_FIELD,
                direction = Sort.Direction.DESC
            ) Pageable pageable,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Advanced search for agent: {} with filters: status={}, type={}, city={}, priceRange={}-{}",
            agentId, status, propertyType, city, minPrice, maxPrice);

        // Build search filter
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

        Page<PropertyDto> properties = propertyService.searchProperties(filter, agentId, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Simple text search across property title, description, and address.
     */
    @GetMapping("/filter")
    @Operation(summary = "Filter properties by text",
               description = "Search properties by text query across title, description, and address fields.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Search completed successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<Page<PropertyDto>> filterProperties(
            @Parameter(description = "Search query", required = true)
            @RequestParam String q,
            @PageableDefault(
                size = PaginationConstants.DEFAULT_PAGE_SIZE,
                sort = PaginationConstants.DEFAULT_SORT_FIELD,
                direction = Sort.Direction.DESC
            ) Pageable pageable,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Text search for agent: {} with query: {}", agentId, q);

        Page<PropertyDto> properties = propertyService.searchPropertiesByText(agentId, q, pageable);

        return ResponseEntity.ok(properties);
    }

    // ========================================
    // Filtered Retrieval Operations
    // ========================================

    /**
     * Get properties by status.
     */
    @GetMapping("/status/{status}")
    @Operation(summary = "Get properties by status",
               description = "Retrieve properties filtered by status (AVAILABLE, SOLD, RENTED, RESERVED, WITHDRAWN).")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Properties retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<Page<PropertyDto>> getPropertiesByStatus(
            @Parameter(description = "Property status", required = true)
            @PathVariable PropertyStatus status,
            @PageableDefault(
                size = PaginationConstants.DEFAULT_PAGE_SIZE,
                sort = PaginationConstants.DEFAULT_SORT_FIELD,
                direction = Sort.Direction.DESC
            ) Pageable pageable,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Getting properties by status: {} for agent: {}", status, agentId);

        Page<PropertyDto> properties = propertyService.getPropertiesByStatus(status, agentId, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Get properties by type.
     */
    @GetMapping("/type/{type}")
    @Operation(summary = "Get properties by type",
               description = "Retrieve properties filtered by type (APARTMENT, HOUSE, VILLA, etc.).")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Properties retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<Page<PropertyDto>> getPropertiesByType(
            @Parameter(description = "Property type", required = true)
            @PathVariable PropertyType type,
            @PageableDefault(
                size = PaginationConstants.DEFAULT_PAGE_SIZE,
                sort = PaginationConstants.DEFAULT_SORT_FIELD,
                direction = Sort.Direction.DESC
            ) Pageable pageable,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Getting properties by type: {} for agent: {}", type, agentId);

        Page<PropertyDto> properties = propertyService.getPropertiesByType(type, agentId, pageable);

        return ResponseEntity.ok(properties);
    }

    /**
     * Get properties by city.
     */
    @GetMapping("/city/{city}")
    @Operation(summary = "Get properties by city",
               description = "Retrieve properties filtered by city name.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Properties retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<Page<PropertyDto>> getPropertiesByCity(
            @Parameter(description = "City name", required = true)
            @PathVariable String city,
            @PageableDefault(
                size = PaginationConstants.DEFAULT_PAGE_SIZE,
                sort = PaginationConstants.DEFAULT_SORT_FIELD,
                direction = Sort.Direction.DESC
            ) Pageable pageable,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Getting properties by city: {} for agent: {}", city, agentId);

        Page<PropertyDto> properties = propertyService.getPropertiesByCity(city, agentId, pageable);

        return ResponseEntity.ok(properties);
    }

    // ========================================
    // Image Management Operations
    // ========================================

    /**
     * Upload an image for a property.
     */
    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload property image",
               description = "Upload an image for a property. Supports JPEG, PNG, WebP, and GIF formats up to 10MB. Thumbnails are automatically generated.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Image uploaded successfully",
                     content = @Content(schema = @Schema(implementation = PropertyImageDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid file or validation errors"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<PropertyImageDto> uploadPropertyImage(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID id,
            @Parameter(description = "Image file to upload", required = true)
            @RequestParam("file") MultipartFile file,
            @Parameter(description = "Image title")
            @RequestParam(required = false) String title,
            @Parameter(description = "Image description")
            @RequestParam(required = false) String description,
            @Parameter(description = "Image type")
            @RequestParam(required = false) String imageType,
            @Parameter(description = "Set as primary image")
            @RequestParam(required = false, defaultValue = "false") Boolean isPrimary,
            Authentication authentication) throws IOException {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Uploading image for property: {} by agent: {}", id, agentId);

        // Build metadata DTO
        PropertyImageDto metadata = PropertyImageDto.builder()
            .title(title)
            .description(description)
            .isPrimary(isPrimary)
            .build();

        PropertyImageDto uploadedImage = propertyImageService.uploadImage(id, file, metadata, agentId);

        log.info("Successfully uploaded image: {} for property: {}", uploadedImage.getId(), id);
        return ResponseEntity.status(HttpStatus.CREATED).body(uploadedImage);
    }

    /**
     * Upload multiple images for a property (bulk upload).
     */
    @PostMapping(value = "/{id}/images/bulk", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Bulk upload property images",
               description = "Upload multiple images for a property at once. Supports JPEG, PNG, WebP, and GIF formats up to 10MB each. Thumbnails are automatically generated.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Images uploaded successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid files or validation errors"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<List<PropertyImageDto>> uploadPropertyImagesBulk(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID id,
            @Parameter(description = "Image files to upload", required = true)
            @RequestParam("files") MultipartFile[] files,
            Authentication authentication) throws IOException {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Bulk uploading {} images for property: {} by agent: {}", files.length, id, agentId);

        List<PropertyImageDto> uploadedImages = new java.util.ArrayList<>();

        for (MultipartFile file : files) {
            try {
                PropertyImageDto metadata = PropertyImageDto.builder()
                    .isPrimary(false) // Let first image be primary automatically
                    .build();

                PropertyImageDto uploadedImage = propertyImageService.uploadImage(id, file, metadata, agentId);
                uploadedImages.add(uploadedImage);
            } catch (Exception e) {
                log.error("Error uploading file {} for property: {}", file.getOriginalFilename(), id, e);
                // Continue with other files even if one fails
            }
        }

        log.info("Successfully uploaded {} images for property: {}", uploadedImages.size(), id);
        return ResponseEntity.status(HttpStatus.CREATED).body(uploadedImages);
    }

    /**
     * Get all images for a property.
     */
    @GetMapping("/{id}/images")
    @Operation(summary = "Get property images",
               description = "Retrieve all images for a property, sorted by sort order.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Images retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<List<PropertyImageDto>> getPropertyImages(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID id,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Getting images for property: {} by agent: {}", id, agentId);

        List<PropertyImageDto> images = propertyImageService.getAllImages(id, agentId);

        return ResponseEntity.ok(images);
    }

    /**
     * Delete a property image.
     */
    @DeleteMapping("/{id}/images/{imageId}")
    @Operation(summary = "Delete property image",
               description = "Delete an image from a property. The image file and thumbnail will be permanently removed.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Image deleted successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property or image not found or access denied")
    })
    public ResponseEntity<Void> deletePropertyImage(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID id,
            @Parameter(description = "Image ID", required = true)
            @PathVariable UUID imageId,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Deleting image: {} for property: {} by agent: {}", imageId, id, agentId);

        propertyImageService.deleteImage(imageId, agentId);

        log.info("Successfully deleted image: {} for property: {}", imageId, id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Set an image as the primary image for a property.
     */
    @PutMapping("/{id}/images/{imageId}/primary")
    @Operation(summary = "Set primary image",
               description = "Set an image as the primary/main image for a property. The previous primary image will be unset.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Primary image set successfully",
                     content = @Content(schema = @Schema(implementation = PropertyImageDto.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
        @ApiResponse(responseCode = "404", description = "Property or image not found or access denied")
    })
    public ResponseEntity<PropertyImageDto> setPrimaryImage(
            @Parameter(description = "Property ID", required = true)
            @PathVariable UUID id,
            @Parameter(description = "Image ID", required = true)
            @PathVariable UUID imageId,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Setting primary image: {} for property: {} by agent: {}", imageId, id, agentId);

        // First validate that the image exists and belongs to this property and agent
        PropertyImageDto currentImage = propertyImageService.getImage(imageId, agentId);
        if (!currentImage.getPropertyId().equals(id)) {
            throw new IllegalArgumentException("Image does not belong to the specified property");
        }

        // Update the image metadata to set as primary
        PropertyImageDto metadata = PropertyImageDto.builder()
                .isPrimary(true)
                .build();
        PropertyImageDto updatedImage = propertyImageService.updateImageMetadata(imageId, metadata, agentId);

        log.info("Successfully set primary image: {} for property: {}", imageId, id);
        return ResponseEntity.ok(updatedImage);
    }

    /**
     * NOTE: Image file endpoints no longer needed - images are now stored as Base64 in database
     * and returned directly in the image DTO as data URLs (data:image/jpeg;base64,...)
     * The imageUrl and thumbnailUrl fields in PropertyImageDto now contain these data URLs.
     */

    // ========================================
    // Statistics and Analytics Operations
    // ========================================

    /**
     * Get property statistics for the authenticated agent.
     */
    @GetMapping("/stats")
    @Operation(summary = "Get property statistics",
               description = "Retrieve comprehensive property statistics including counts by status and listing type.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully",
                     content = @Content(schema = @Schema(implementation = PropertyService.PropertyStatsDto.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<PropertyService.PropertyStatsDto> getPropertyStats(
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Getting property statistics for agent: {}", agentId);

        PropertyService.PropertyStatsDto stats = propertyService.getPropertyStats(agentId);

        return ResponseEntity.ok(stats);
    }

    /**
     * Get recent properties added within specified days.
     */
    @GetMapping("/recent")
    @Operation(summary = "Get recent properties",
               description = "Retrieve properties added within the specified number of days.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Recent properties retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<List<PropertyDto>> getRecentProperties(
            @Parameter(description = "Number of days to look back", example = "30")
            @RequestParam(defaultValue = "30") int days,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Getting recent properties for agent: {} (last {} days)", agentId, days);

        List<PropertyDto> recentProperties = propertyService.getRecentProperties(agentId, days);

        return ResponseEntity.ok(recentProperties);
    }

    /**
     * Get available properties from a specific date.
     */
    @GetMapping("/available")
    @Operation(summary = "Get available properties",
               description = "Retrieve properties available from a specific date onwards.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Available properties retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token")
    })
    public ResponseEntity<Page<PropertyDto>> getAvailableProperties(
            @Parameter(description = "Available from date (YYYY-MM-DD)", example = "2025-01-01")
            @RequestParam(required = false) LocalDate availableFrom,
            @PageableDefault(
                size = PaginationConstants.DEFAULT_PAGE_SIZE,
                sort = "availableFrom",
                direction = Sort.Direction.ASC
            ) Pageable pageable,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Getting available properties for agent: {} from: {}", agentId, availableFrom);

        LocalDate fromDate = availableFrom != null ? availableFrom : LocalDate.now();
        Page<PropertyDto> properties = propertyService.getAvailableProperties(agentId, fromDate, pageable);

        return ResponseEntity.ok(properties);
    }

    // ========================================
    // Property Expose/Brochure Endpoints
    // ========================================

    /**
     * Upload property expose (PDF brochure)
     */
    @PostMapping("/{id}/expose")
    @Operation(summary = "Upload property expose", description = "Upload PDF brochure for a property")
    public ResponseEntity<PropertyExposeDto> uploadExpose(
            @PathVariable UUID id,
            @Valid @RequestBody PropertyExposeDto exposeDto,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Uploading expose for property: {} by agent: {}", id, agentId);

        PropertyExposeDto result = propertyService.uploadExpose(agentId, id, exposeDto);
        return ResponseEntity.ok(result);
    }

    /**
     * Download property expose (PDF brochure)
     */
    @GetMapping("/{id}/expose/download")
    @Operation(summary = "Download property expose", description = "Download PDF brochure for a property")
    public ResponseEntity<PropertyExposeDto> downloadExpose(
            @PathVariable UUID id,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Downloading expose for property: {} by agent: {}", id, agentId);

        PropertyExposeDto result = propertyService.downloadExpose(agentId, id);
        return ResponseEntity.ok(result);
    }

    /**
     * Delete property expose (PDF brochure)
     */
    @DeleteMapping("/{id}/expose")
    @Operation(summary = "Delete property expose", description = "Delete PDF brochure for a property")
    public ResponseEntity<Void> deleteExpose(
            @PathVariable UUID id,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Deleting expose for property: {} by agent: {}", id, agentId);

        propertyService.deleteExpose(agentId, id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Check if property has an expose
     */
    @GetMapping("/{id}/expose/exists")
    @Operation(summary = "Check if property has expose", description = "Check if property has an uploaded brochure")
    public ResponseEntity<Boolean> hasExpose(
            @PathVariable UUID id,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        log.debug("Checking if property {} has expose for agent: {}", id, agentId);

        boolean hasExpose = propertyService.hasExpose(agentId, id);
        return ResponseEntity.ok(hasExpose);
    }

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Generate thumbnail filename from original filename.
     *
     * @param filename the original filename
     * @return the thumbnail filename
     */
    private String generateThumbnailFilename(String filename) {
        if (filename == null || !filename.contains(".")) {
            return filename + "_thumb";
        }
        int dotIndex = filename.lastIndexOf(".");
        return filename.substring(0, dotIndex) + "_thumb" + filename.substring(dotIndex);
    }
}
