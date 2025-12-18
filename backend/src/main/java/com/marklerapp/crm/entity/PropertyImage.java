package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * Entity representing an image associated with a property.
 * Supports multiple images per property with ordering and main image designation.
 * Stores file metadata for efficient retrieval and display.
 */
@Entity
@Table(name = "property_images", indexes = {
    @Index(name = "idx_property_image_property", columnList = "property_id"),
    @Index(name = "idx_property_image_primary", columnList = "is_primary"),
    @Index(name = "idx_property_image_order", columnList = "sort_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyImage extends BaseEntity {

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false, foreignKey = @ForeignKey(name = "fk_property_image_property"))
    @NotNull(message = "Property is required")
    private Property property;

    // File Information
    @Column(name = "filename", nullable = false, length = 255)
    @NotBlank(message = "Filename is required")
    @Size(min = 1, max = 255, message = "Filename must be between 1 and 255 characters")
    private String filename;

    @Column(name = "original_filename", length = 255)
    @Size(max = 255, message = "Original filename must not exceed 255 characters")
    private String originalFilename;

    @Column(name = "file_path", length = 500)
    @Size(max = 500, message = "File path must not exceed 500 characters")
    private String filePath;

    // Base64 Image Data (stored directly in database)
    @Column(name = "image_data", columnDefinition = "TEXT")
    private String imageData;

    @Column(name = "thumbnail_data", columnDefinition = "TEXT")
    private String thumbnailData;

    @Column(name = "content_type", nullable = false, length = 100)
    @NotBlank(message = "Content type is required")
    @Size(min = 3, max = 100, message = "Content type must be between 3 and 100 characters")
    private String contentType;

    @Column(name = "file_size", nullable = false)
    @NotNull(message = "File size is required")
    @Min(value = 0, message = "File size cannot be negative")
    private Long fileSize;

    // Optional Metadata
    @Column(name = "title", length = 200)
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @Column(name = "description", length = 500)
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @Column(name = "alt_text", length = 500)
    @Size(max = 500, message = "Alt text must not exceed 500 characters")
    private String altText;

    @Column(name = "width")
    @Min(value = 0, message = "Width cannot be negative")
    private Integer width;

    @Column(name = "height")
    @Min(value = 0, message = "Height cannot be negative")
    private Integer height;

    // Image Organization
    @Column(name = "is_primary", nullable = false)
    @NotNull(message = "Primary image flag is required")
    @Builder.Default
    private Boolean isPrimary = false;

    @Column(name = "sort_order", nullable = false)
    @NotNull(message = "Sort order is required")
    @Min(value = 0, message = "Sort order cannot be negative")
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "image_type", length = 50)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PropertyImageType imageType = PropertyImageType.GENERAL;

    /**
     * Get file extension from filename
     */
    public String getFileExtension() {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }

    /**
     * Check if the file is an image based on content type
     */
    public boolean isImage() {
        return contentType != null && contentType.startsWith("image/");
    }

    /**
     * Get file size in a human-readable format
     */
    public String getFormattedFileSize() {
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
     * Get aspect ratio as a string
     */
    public String getAspectRatio() {
        if (width == null || height == null || height == 0) {
            return "Unknown";
        }

        int gcd = gcd(width, height);
        return String.format("%d:%d", width / gcd, height / gcd);
    }

    /**
     * Calculate greatest common divisor for aspect ratio calculation
     */
    private int gcd(int a, int b) {
        return b == 0 ? a : gcd(b, a % b);
    }

    /**
     * Get thumbnail path (convention: adding _thumb before extension)
     */
    public String getThumbnailPath() {
        if (filePath == null || !filePath.contains(".")) {
            return filePath + "_thumb";
        }

        int dotIndex = filePath.lastIndexOf(".");
        return filePath.substring(0, dotIndex) + "_thumb" + filePath.substring(dotIndex);
    }

    /**
     * Alias method for compatibility - maps to isPrimary
     * @deprecated Use getIsPrimary() instead
     */
    @Deprecated
    public Boolean getIsMainImage() {
        return isPrimary;
    }

    /**
     * Alias method for compatibility - maps to isPrimary
     * @deprecated Use setIsPrimary() instead
     */
    @Deprecated
    public void setIsMainImage(Boolean isMainImage) {
        this.isPrimary = isMainImage;
    }

    /**
     * Alias method for compatibility - maps to sortOrder
     * @deprecated Use getSortOrder() instead
     */
    @Deprecated
    public Integer getDisplayOrder() {
        return sortOrder;
    }

    /**
     * Alias method for compatibility - maps to sortOrder
     * @deprecated Use setSortOrder() instead
     */
    @Deprecated
    public void setDisplayOrder(Integer displayOrder) {
        this.sortOrder = displayOrder;
    }

    /**
     * Alias method for compatibility - maps to contentType
     * @deprecated Use getContentType() instead
     */
    @Deprecated
    public String getMimeType() {
        return contentType;
    }

    /**
     * Alias method for compatibility - maps to contentType
     * @deprecated Use setContentType() instead
     */
    @Deprecated
    public void setMimeType(String mimeType) {
        this.contentType = mimeType;
    }

    /**
     * Get the filename.
     * This is the standard Lombok-generated getter that should be used.
     */
    public String getFilename() {
        return filename;
    }

    /**
     * Set the filename.
     * This is the standard Lombok-generated setter that should be used.
     */
    public void setFilename(String filename) {
        this.filename = filename;
    }

    /**
     * Alias method for compatibility - maps to filename
     * @deprecated Use getFilename() instead
     */
    @Deprecated
    public String getFileName() {
        return filename;
    }

    /**
     * Alias method for compatibility - maps to filename
     * @deprecated Use setFilename() instead
     */
    @Deprecated
    public void setFileName(String fileName) {
        this.filename = fileName;
    }

    @Override
    public String toString() {
        return "PropertyImage{" +
                "id=" + getId() +
                ", filename='" + filename + '\'' +
                ", fileSize=" + fileSize +
                ", isPrimary=" + isPrimary +
                ", sortOrder=" + sortOrder +
                ", imageType=" + imageType +
                '}';
    }
}