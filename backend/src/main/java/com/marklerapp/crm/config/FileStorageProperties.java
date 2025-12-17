package com.marklerapp.crm.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * Configuration properties for file storage.
 *
 * <p>This configuration class binds properties from application.yml under
 * the prefix "app.file-storage" and provides validation for all settings.</p>
 *
 * <p>Configurable properties include:
 * <ul>
 *   <li>Upload directory path</li>
 *   <li>Maximum file size</li>
 *   <li>Allowed file types (MIME types and extensions)</li>
 *   <li>Thumbnail dimensions</li>
 *   <li>Image quality settings</li>
 * </ul>
 * </p>
 *
 * <p>Example configuration in application.yml:</p>
 * <pre>
 * app:
 *   file-storage:
 *     upload-dir: ./uploads/properties
 *     max-file-size: 10485760
 *     allowed-content-types:
 *       - image/jpeg
 *       - image/png
 *     thumbnail:
 *       width: 300
 *       height: 200
 * </pre>
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "app.file-storage")
@Validated
public class FileStorageProperties {

    /**
     * Base directory for file uploads.
     * Can be absolute path or relative to application root.
     */
    @NotBlank(message = "Upload directory must be specified")
    private String uploadDir = "./uploads/properties";

    /**
     * Maximum allowed file size in bytes.
     * Default: 10MB (10485760 bytes)
     */
    @Min(value = 1, message = "Max file size must be at least 1 byte")
    private long maxFileSize = 10485760L; // 10MB

    /**
     * Allowed MIME types for file uploads.
     * Default supports common image formats.
     */
    @NotEmpty(message = "At least one content type must be allowed")
    private List<String> allowedContentTypes = List.of(
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif"
    );

    /**
     * Allowed file extensions (without dot).
     * Default supports common image extensions.
     */
    @NotEmpty(message = "At least one file extension must be allowed")
    private List<String> allowedExtensions = List.of(
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif"
    );

    /**
     * Thumbnail generation settings.
     */
    private ThumbnailSettings thumbnail = new ThumbnailSettings();

    /**
     * Image quality settings.
     */
    private ImageQualitySettings imageQuality = new ImageQualitySettings();

    /**
     * Thumbnail generation configuration.
     */
    @Data
    public static class ThumbnailSettings {

        /**
         * Thumbnail width in pixels.
         * Default: 300px
         */
        @Min(value = 10, message = "Thumbnail width must be at least 10 pixels")
        private int width = 300;

        /**
         * Thumbnail height in pixels.
         * Default: 200px
         */
        @Min(value = 10, message = "Thumbnail height must be at least 10 pixels")
        private int height = 200;

        /**
         * Whether to maintain aspect ratio when generating thumbnails.
         * Default: true
         */
        private boolean maintainAspectRatio = true;

        /**
         * Thumbnail image quality (0-1).
         * Default: 0.85
         */
        private float quality = 0.85f;
    }

    /**
     * Image quality and optimization settings.
     */
    @Data
    public static class ImageQualitySettings {

        /**
         * Image compression quality (0-1).
         * Default: 0.9
         */
        private float compressionQuality = 0.9f;

        /**
         * Maximum image width for resizing large images.
         * 0 means no resizing.
         * Default: 0 (disabled)
         */
        private int maxWidth = 0;

        /**
         * Maximum image height for resizing large images.
         * 0 means no resizing.
         * Default: 0 (disabled)
         */
        private int maxHeight = 0;
    }

    /**
     * Get the full upload directory path with property-specific subdirectory.
     *
     * @return the base upload directory path
     */
    public String getUploadDir() {
        return uploadDir;
    }

    /**
     * Check if a content type is allowed.
     *
     * @param contentType the MIME type to check
     * @return true if the content type is allowed
     */
    public boolean isContentTypeAllowed(String contentType) {
        if (contentType == null) {
            return false;
        }
        return allowedContentTypes.stream()
            .anyMatch(allowed -> contentType.toLowerCase().equals(allowed.toLowerCase()));
    }

    /**
     * Check if a file extension is allowed.
     *
     * @param extension the file extension to check (without dot)
     * @return true if the extension is allowed
     */
    public boolean isExtensionAllowed(String extension) {
        if (extension == null) {
            return false;
        }
        return allowedExtensions.stream()
            .anyMatch(allowed -> extension.toLowerCase().equals(allowed.toLowerCase()));
    }
}
