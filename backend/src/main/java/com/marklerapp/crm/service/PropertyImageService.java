package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.constants.ValidationConstants;
import com.marklerapp.crm.dto.PropertyImageDto;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyImage;
import com.marklerapp.crm.entity.PropertyImageType;
import com.marklerapp.crm.repository.PropertyImageRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing property image operations with comprehensive business logic.
 *
 * <p>This service provides:
 * <ul>
 *   <li>Image upload with file validation (size, type, format)</li>
 *   <li>Automatic thumbnail generation</li>
 *   <li>Image metadata management (title, description, alt text)</li>
 *   <li>Primary image management (only one primary per property)</li>
 *   <li>Automatic sort order assignment</li>
 *   <li>Agent ownership validation via property</li>
 *   <li>CRUD operations for images</li>
 * </ul>
 * </p>
 *
 * <p>Security: All operations validate that the agent owns the property
 * associated with the image before allowing modifications.</p>
 *
 * @see PropertyImage
 * @see PropertyImageDto
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyImageService {

    private final PropertyImageRepository propertyImageRepository;
    private final PropertyRepository propertyRepository;

    /**
     * Upload a new image for a property.
     *
     * @param propertyId the ID of the property
     * @param file the image file to upload
     * @param metadata optional metadata for the image (title, description, etc.)
     * @param agentId the ID of the agent uploading the image
     * @return the created property image DTO
     * @throws ResourceNotFoundException if property is not found or access denied
     * @throws IllegalArgumentException if file validation fails
     * @throws IOException if file operations fail
     */
    @Transactional
    public PropertyImageDto uploadImage(UUID propertyId, MultipartFile file,
                                       PropertyImageDto metadata, UUID agentId) throws IOException {
        log.debug("Uploading image for property: {} by agent: {}", propertyId, agentId);

        // Validate property exists and agent has access
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        // Validate file
        validateImageFile(file);

        // Convert image to Base64
        String base64Image = convertToBase64(file);

        // Read image to get dimensions
        BufferedImage originalImage = ImageIO.read(file.getInputStream());
        int width = originalImage.getWidth();
        int height = originalImage.getHeight();

        // Generate thumbnail (200x200 max) and convert to Base64
        String base64Thumbnail = generateThumbnailBase64(originalImage, file.getContentType());

        // Determine sort order (next available)
        Integer sortOrder = propertyImageRepository.findNextSortOrder(property);

        // Determine if this should be primary (first image is primary by default)
        boolean isPrimary = propertyImageRepository.countByProperty(property) == 0;
        if (metadata != null && metadata.getIsPrimary() != null) {
            isPrimary = metadata.getIsPrimary();
        }

        // If setting as primary, unset other primary images
        if (isPrimary) {
            unsetOtherPrimaryImages(property);
        }

        // Create property image entity
        PropertyImage propertyImage = PropertyImage.builder()
            .property(property)
            .filename(generateUniqueFilename(file.getOriginalFilename()))
            .originalFilename(file.getOriginalFilename())
            .imageData(base64Image)
            .thumbnailData(base64Thumbnail)
            .contentType(file.getContentType())
            .fileSize(file.getSize())
            .width(width)
            .height(height)
            .isPrimary(isPrimary)
            .sortOrder(sortOrder)
            .imageType(metadata != null && metadata.getImageType() != null ?
                metadata.getImageType() : PropertyImageType.GENERAL)
            .build();

        // Set optional metadata
        if (metadata != null) {
            propertyImage.setTitle(metadata.getTitle());
            propertyImage.setDescription(metadata.getDescription());
            propertyImage.setAltText(metadata.getAltText());
        }

        // Save to database
        PropertyImage savedImage = propertyImageRepository.save(propertyImage);
        log.info("Uploaded image: {} for property: {}", savedImage.getId(), propertyId);

        return convertToDto(savedImage);
    }

    /**
     * Convert MultipartFile to Base64 string
     */
    private String convertToBase64(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        return Base64.getEncoder().encodeToString(bytes);
    }

    /**
     * Generate thumbnail from original image and return as Base64
     */
    private String generateThumbnailBase64(BufferedImage originalImage, String contentType) throws IOException {
        int thumbnailSize = ValidationConstants.THUMBNAIL_SIZE;
        int width = originalImage.getWidth();
        int height = originalImage.getHeight();

        // Calculate scaling
        double scale = Math.min((double) thumbnailSize / width, (double) thumbnailSize / height);
        int scaledWidth = (int) (width * scale);
        int scaledHeight = (int) (height * scale);

        // Create thumbnail
        BufferedImage thumbnail = new BufferedImage(scaledWidth, scaledHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = thumbnail.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(originalImage, 0, 0, scaledWidth, scaledHeight, null);
        g.dispose();

        // Convert to Base64
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        String formatName = getFormatName(contentType);
        ImageIO.write(thumbnail, formatName, baos);
        byte[] thumbnailBytes = baos.toByteArray();
        return Base64.getEncoder().encodeToString(thumbnailBytes);
    }

    /**
     * Get image format name from content type
     */
    private String getFormatName(String contentType) {
        if (contentType.contains("png")) return "png";
        if (contentType.contains("gif")) return "gif";
        if (contentType.contains("webp")) return "webp";
        return "jpg"; // Default to JPEG
    }

    /**
     * Generate unique filename
     */
    private String generateUniqueFilename(String originalFilename) {
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return UUID.randomUUID().toString() + extension;
    }

    /**
     * Validate image file
     */
    private void validateImageFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException(ValidationConstants.FILE_EMPTY_MESSAGE);
        }

        // Check file size (max 10MB)
        if (file.getSize() > ValidationConstants.MAX_ATTACHMENT_SIZE_BYTES) {
            throw new IllegalArgumentException(ValidationConstants.IMAGE_SIZE_LIMIT_MESSAGE);
        }

        // Check content type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException(ValidationConstants.FILE_MUST_BE_IMAGE_MESSAGE);
        }

        // Check supported formats
        if (!contentType.matches(ValidationConstants.SUPPORTED_IMAGE_FORMAT_REGEX)) {
            throw new IllegalArgumentException(ValidationConstants.UNSUPPORTED_IMAGE_FORMAT_MESSAGE);
        }
    }

    /**
     * Update image metadata (not the actual file).
     *
     * @param imageId the ID of the image
     * @param metadata the updated metadata
     * @param agentId the ID of the agent updating the image
     * @return the updated property image DTO
     * @throws ResourceNotFoundException if image is not found or access denied
     */
    @Transactional
    public PropertyImageDto updateImageMetadata(UUID imageId, PropertyImageDto metadata, UUID agentId) {
        log.debug("Updating image metadata: {} by agent: {}", imageId, agentId);

        // Fetch image and validate ownership
        PropertyImage image = getImageByIdAndValidateOwnership(imageId, agentId);

        // Update metadata fields
        if (metadata.getTitle() != null) {
            image.setTitle(metadata.getTitle());
        }
        if (metadata.getDescription() != null) {
            image.setDescription(metadata.getDescription());
        }
        if (metadata.getAltText() != null) {
            image.setAltText(metadata.getAltText());
        }
        if (metadata.getImageType() != null) {
            image.setImageType(metadata.getImageType());
        }
        if (metadata.getSortOrder() != null) {
            image.setSortOrder(metadata.getSortOrder());
        }

        // Handle primary image update
        if (metadata.getIsPrimary() != null && metadata.getIsPrimary()) {
            // If setting this image as primary, unset others
            unsetOtherPrimaryImages(image.getProperty());
            image.setIsPrimary(true);
        } else if (metadata.getIsPrimary() != null && !metadata.getIsPrimary()) {
            // If unsetting primary, only allow if there's another primary image
            long primaryCount = propertyImageRepository.countByPropertyAndImageType(
                image.getProperty(), PropertyImageType.GENERAL);
            if (primaryCount > 1 || !image.getIsPrimary()) {
                image.setIsPrimary(false);
            } else {
                throw new IllegalArgumentException("Cannot unset primary image: property must have at least one primary image");
            }
        }

        // Save updated image
        PropertyImage updatedImage = propertyImageRepository.save(image);
        log.info("Updated image metadata: {}", imageId);

        return convertToDto(updatedImage);
    }

    /**
     * Delete an image.
     *
     * @param imageId the ID of the image to delete
     * @param agentId the ID of the agent deleting the image
     * @throws ResourceNotFoundException if image is not found or access denied
     */
    @Transactional
    public void deleteImage(UUID imageId, UUID agentId) {
        log.debug("Deleting image: {} by agent: {}", imageId, agentId);

        // Fetch image and validate ownership
        PropertyImage image = getImageByIdAndValidateOwnership(imageId, agentId);

        // If this was the primary image, set another image as primary
        if (image.getIsPrimary()) {
            List<PropertyImage> otherImages = propertyImageRepository
                .findByPropertyOrderBySortOrderAsc(image.getProperty());
            otherImages.stream()
                .filter(img -> !img.getId().equals(imageId))
                .findFirst()
                .ifPresent(img -> {
                    img.setIsPrimary(true);
                    propertyImageRepository.save(img);
                });
        }

        // Delete from database (Base64 data will be removed automatically)
        propertyImageRepository.delete(image);
        log.info("Deleted image: {}", imageId);
    }

    /**
     * Get a single image by ID.
     *
     * @param imageId the ID of the image
     * @param agentId the ID of the agent requesting the image
     * @return the property image DTO
     * @throws ResourceNotFoundException if image is not found or access denied
     */
    @Transactional(readOnly = true)
    public PropertyImageDto getImage(UUID imageId, UUID agentId) {
        log.debug("Getting image: {} for agent: {}", imageId, agentId);

        PropertyImage image = getImageByIdAndValidateOwnership(imageId, agentId);

        return convertToDto(image);
    }

    /**
     * Get all images for a property.
     *
     * @param propertyId the ID of the property
     * @param agentId the ID of the agent requesting the images
     * @return list of property image DTOs ordered by sort order
     * @throws ResourceNotFoundException if property is not found or access denied
     */
    @Transactional(readOnly = true)
    public List<PropertyImageDto> getAllImages(UUID propertyId, UUID agentId) {
        log.debug("Getting all images for property: {} by agent: {}", propertyId, agentId);

        // Validate property exists and agent has access
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        // Fetch images
        List<PropertyImage> images = propertyImageRepository.findByPropertyOrderBySortOrderAsc(property);

        return images.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    /**
     * Get images by type for a property.
     *
     * @param propertyId the ID of the property
     * @param imageType the image type filter
     * @param agentId the ID of the agent requesting the images
     * @return list of property image DTOs of the specified type
     * @throws ResourceNotFoundException if property is not found or access denied
     */
    @Transactional(readOnly = true)
    public List<PropertyImageDto> getImagesByType(UUID propertyId, PropertyImageType imageType, UUID agentId) {
        log.debug("Getting images by type: {} for property: {} by agent: {}",
            imageType, propertyId, agentId);

        // Validate property exists and agent has access
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        // Fetch images by type
        List<PropertyImage> images = propertyImageRepository
            .findByPropertyAndImageTypeOrderBySortOrderAsc(property, imageType);

        return images.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    /**
     * Get the primary image for a property.
     *
     * @param propertyId the ID of the property
     * @param agentId the ID of the agent requesting the image
     * @return the primary property image DTO, or null if no primary image exists
     * @throws ResourceNotFoundException if property is not found or access denied
     */
    @Transactional(readOnly = true)
    public PropertyImageDto getPrimaryImage(UUID propertyId, UUID agentId) {
        log.debug("Getting primary image for property: {} by agent: {}", propertyId, agentId);

        // Validate property exists and agent has access
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        // Fetch primary image
        return propertyImageRepository.findByPropertyAndIsPrimaryTrue(property)
            .map(this::convertToDto)
            .orElse(null);
    }

    /**
     * Count images for a property.
     *
     * @param propertyId the ID of the property
     * @param agentId the ID of the agent
     * @return number of images for the property
     * @throws ResourceNotFoundException if property is not found or access denied
     */
    @Transactional(readOnly = true)
    public long countImages(UUID propertyId, UUID agentId) {
        log.debug("Counting images for property: {} by agent: {}", propertyId, agentId);

        // Validate property exists and agent has access
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        return propertyImageRepository.countByProperty(property);
    }

    // ========================================
    // Private Helper Methods
    // ========================================

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
     * Get image by ID and validate agent ownership via property.
     *
     * @param imageId the image ID
     * @param agentId the agent ID
     * @return the property image entity
     * @throws ResourceNotFoundException if image is not found or access denied
     */
    private PropertyImage getImageByIdAndValidateOwnership(UUID imageId, UUID agentId) {
        PropertyImage image = propertyImageRepository.findById(imageId)
            .orElseThrow(() -> new ResourceNotFoundException("PropertyImage", "id", imageId));

        // Validate ownership via property
        if (!image.getProperty().getAgent().getId().equals(agentId)) {
            log.warn("Agent {} attempted to access image {} owned by agent {}",
                agentId, imageId, image.getProperty().getAgent().getId());
            throw new ResourceNotFoundException("Image not found or access denied");
        }

        return image;
    }


    /**
     * Unset primary flag for all other images of a property.
     *
     * @param property the property
     */
    private void unsetOtherPrimaryImages(Property property) {
        List<PropertyImage> primaryImages = propertyImageRepository
            .findByPropertyOrderBySortOrderAsc(property).stream()
            .filter(PropertyImage::getIsPrimary)
            .collect(Collectors.toList());

        for (PropertyImage image : primaryImages) {
            image.setIsPrimary(false);
            propertyImageRepository.save(image);
        }
    }

    /**
     * Convert PropertyImage entity to DTO.
     *
     * @param image the property image entity
     * @return the property image DTO
     */
    private PropertyImageDto convertToDto(PropertyImage image) {
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
}
