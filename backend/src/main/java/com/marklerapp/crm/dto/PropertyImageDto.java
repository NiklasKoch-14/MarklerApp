package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.marklerapp.crm.entity.PropertyImageType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Comprehensive DTO for PropertyImage entity operations.
 * Used for both request and response operations.
 *
 * <p>This DTO includes all property image fields with proper validation annotations
 * for upload and update operations, as well as metadata and computed fields for responses.</p>
 *
 * <p>Key features:
 * <ul>
 *   <li>File metadata (filename, size, content type)</li>
 *   <li>Image metadata (title, description, dimensions)</li>
 *   <li>Organization (primary flag, sort order, image type)</li>
 *   <li>URLs for accessing images and thumbnails</li>
 * </ul>
 * </p>
 *
 * @see com.marklerapp.crm.entity.PropertyImage
 * @see PropertyDto
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertyImageDto {

    // ========================================
    // Identity
    // ========================================

    /**
     * Unique identifier of the image (read-only for updates)
     */
    private UUID id;

    /**
     * Property to which this image belongs
     */
    private UUID propertyId;

    // ========================================
    // File Information
    // ========================================

    /**
     * Stored filename (typically UUID-based)
     */
    @NotBlank(message = "Filename is required", groups = {OnCreate.class, OnUpdate.class})
    @Size(min = 1, max = 255, message = "Filename must be between 1 and 255 characters")
    private String filename;

    /**
     * Original filename as uploaded by user
     */
    @Size(max = 255, message = "Original filename must not exceed 255 characters")
    private String originalFilename;

    /**
     * File path on the storage system (can be relative or absolute)
     * Not exposed to clients for security reasons
     */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @NotBlank(message = "File path is required", groups = {OnCreate.class})
    @Size(min = 1, max = 500, message = "File path must be between 1 and 500 characters")
    private String filePath;

    /**
     * MIME type / Content type (e.g., image/jpeg, image/png)
     */
    @NotBlank(message = "Content type is required", groups = {OnCreate.class})
    @Size(min = 3, max = 100, message = "Content type must be between 3 and 100 characters")
    @Pattern(regexp = "^image/.*", message = "Content type must be an image type")
    private String contentType;

    /**
     * File size in bytes
     */
    @NotNull(message = "File size is required", groups = {OnCreate.class})
    @Min(value = 0, message = "File size cannot be negative")
    @Max(value = 52428800, message = "File size must not exceed 50MB") // 50MB limit
    private Long fileSize;

    // ========================================
    // Image Metadata
    // ========================================

    /**
     * Optional title for the image
     */
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    /**
     * Optional description for the image
     */
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    /**
     * Alt text for accessibility
     */
    @Size(max = 500, message = "Alt text must not exceed 500 characters")
    private String altText;

    /**
     * Image width in pixels
     */
    @Min(value = 0, message = "Width cannot be negative")
    @Max(value = 10000, message = "Width must not exceed 10,000 pixels")
    private Integer width;

    /**
     * Image height in pixels
     */
    @Min(value = 0, message = "Height cannot be negative")
    @Max(value = 10000, message = "Height must not exceed 10,000 pixels")
    private Integer height;

    // ========================================
    // Image Organization
    // ========================================

    /**
     * Indicates if this is the primary/main image for the property
     */
    @NotNull(message = "Primary flag is required")
    @Builder.Default
    private Boolean isPrimary = false;

    /**
     * Sort order for displaying images (lower values first)
     */
    @NotNull(message = "Sort order is required")
    @Min(value = 0, message = "Sort order cannot be negative")
    @Max(value = 1000, message = "Sort order must not exceed 1000")
    @Builder.Default
    private Integer sortOrder = 0;

    /**
     * Type/category of the image (e.g., EXTERIOR, INTERIOR, FLOOR_PLAN)
     */
    @Builder.Default
    private PropertyImageType imageType = PropertyImageType.GENERAL;

    // ========================================
    // Audit Fields (Read-Only)
    // ========================================

    /**
     * Timestamp when the image was uploaded (read-only)
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime createdAt;

    /**
     * Timestamp when the image metadata was last updated (read-only)
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime updatedAt;

    // ========================================
    // Computed Fields (Read-Only)
    // ========================================

    /**
     * URL for accessing the full-size image (computed field)
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String imageUrl;

    /**
     * URL for accessing the thumbnail version (computed field)
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String thumbnailUrl;

    /**
     * Formatted file size (e.g., "2.5 MB") (computed field)
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String formattedFileSize;

    /**
     * File extension (e.g., "jpg", "png") (computed field)
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String fileExtension;

    /**
     * Aspect ratio as a string (e.g., "16:9", "4:3") (computed field)
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String aspectRatio;

    // ========================================
    // Validation Groups
    // ========================================

    /**
     * Validation group for create operations
     */
    public interface OnCreate {}

    /**
     * Validation group for update operations
     */
    public interface OnUpdate {}

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Get file extension from filename (computed field).
     *
     * @return file extension without the dot (e.g., "jpg", "png")
     */
    public String getFileExtension() {
        if (fileExtension != null) {
            return fileExtension;
        }

        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }

    /**
     * Get file size in a human-readable format (computed field).
     *
     * @return formatted file size (e.g., "2.5 MB")
     */
    public String getFormattedFileSize() {
        if (formattedFileSize != null) {
            return formattedFileSize;
        }

        if (fileSize == null) {
            return "0 B";
        }

        double size = fileSize.doubleValue();
        String[] units = {"B", "KB", "MB", "GB"};
        int unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return String.format("%.2f %s", size, units[unitIndex]);
    }

    /**
     * Get aspect ratio as a string (computed field).
     *
     * @return aspect ratio (e.g., "16:9", "4:3") or "Unknown" if dimensions are not set
     */
    public String getAspectRatio() {
        if (aspectRatio != null) {
            return aspectRatio;
        }

        if (width == null || height == null || height == 0) {
            return "Unknown";
        }

        int gcd = gcd(width, height);
        return String.format("%d:%d", width / gcd, height / gcd);
    }

    /**
     * Calculate greatest common divisor for aspect ratio calculation.
     *
     * @param a first number
     * @param b second number
     * @return greatest common divisor
     */
    private int gcd(int a, int b) {
        return b == 0 ? a : gcd(b, a % b);
    }

    /**
     * Check if the file is an image based on content type.
     *
     * @return true if content type starts with "image/"
     */
    public boolean isImage() {
        return contentType != null && contentType.startsWith("image/");
    }

    /**
     * Check if this is the primary image.
     * Convenience method for template usage.
     *
     * @return true if this is the primary image
     */
    public boolean isPrimary() {
        return Boolean.TRUE.equals(isPrimary);
    }
}
