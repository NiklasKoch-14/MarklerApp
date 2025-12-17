package com.marklerapp.crm.service;

import com.marklerapp.crm.config.FileStorageProperties;
import com.marklerapp.crm.exception.FileNotFoundException;
import com.marklerapp.crm.exception.FileStorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Iterator;
import java.util.UUID;

/**
 * Service for handling file storage operations with comprehensive error handling.
 *
 * <p>This service provides a complete file storage solution including:
 * <ul>
 *   <li>File upload with validation (size, type, format)</li>
 *   <li>Unique filename generation (UUID-based)</li>
 *   <li>Organized directory structure (uploads/properties/{propertyId}/)</li>
 *   <li>File retrieval with Resource API</li>
 *   <li>File deletion with cleanup</li>
 *   <li>Thumbnail generation with configurable dimensions</li>
 *   <li>Cross-platform path handling (Windows/Linux)</li>
 *   <li>Comprehensive error handling (disk full, permissions, etc.)</li>
 * </ul>
 * </p>
 *
 * <p>Directory Structure:</p>
 * <pre>
 * uploads/
 *   properties/
 *     {propertyId}/
 *       {uuid}.jpg
 *       {uuid}_thumb.jpg
 *       {uuid}.png
 *       {uuid}_thumb.png
 * </pre>
 *
 * <p>Security Considerations:</p>
 * <ul>
 *   <li>Path traversal protection</li>
 *   <li>File type validation</li>
 *   <li>File size validation</li>
 *   <li>Sanitized filenames</li>
 * </ul>
 *
 * @see FileStorageProperties
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final FileStorageProperties fileStorageProperties;

    /**
     * Initialize file storage by creating upload directory if it doesn't exist.
     *
     * @throws FileStorageException if directory creation fails
     */
    public void init() {
        try {
            Path uploadPath = getUploadPath();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                log.info("Created upload directory: {}", uploadPath.toAbsolutePath());
            }
        } catch (IOException e) {
            throw new FileStorageException("Could not create upload directory", e);
        }
    }

    /**
     * Store a file with validation and unique filename generation.
     *
     * @param file the file to store
     * @param propertyId the property ID for directory organization
     * @return the stored file information
     * @throws FileStorageException if file storage fails
     */
    public StoredFileInfo storeFile(MultipartFile file, UUID propertyId) {
        // Validate file
        validateFile(file);

        // Get original filename and generate unique filename
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String fileExtension = getFileExtension(originalFilename);
        String uniqueFilename = generateUniqueFilename(fileExtension);

        try {
            // Validate filename security
            if (originalFilename.contains("..")) {
                throw new FileStorageException("Invalid filename: " + originalFilename);
            }

            // Create property-specific directory
            Path propertyDir = getPropertyDirectory(propertyId);
            if (!Files.exists(propertyDir)) {
                Files.createDirectories(propertyDir);
                log.debug("Created property directory: {}", propertyDir);
            }

            // Store file
            Path targetLocation = propertyDir.resolve(uniqueFilename);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info("Stored file: {} (original: {}) for property: {}",
                uniqueFilename, originalFilename, propertyId);

            // Read image dimensions if it's an image
            Integer width = null;
            Integer height = null;
            BufferedImage image = ImageIO.read(targetLocation.toFile());
            if (image != null) {
                width = image.getWidth();
                height = image.getHeight();
            }

            // Build stored file info
            return StoredFileInfo.builder()
                .filename(uniqueFilename)
                .originalFilename(originalFilename)
                .filePath(targetLocation.toString())
                .relativeFilePath(getRelativePath(targetLocation))
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .width(width)
                .height(height)
                .fileExtension(fileExtension)
                .build();

        } catch (IOException e) {
            throw new FileStorageException("Failed to store file: " + originalFilename, e);
        }
    }

    /**
     * Generate thumbnail for an image file.
     *
     * @param filePath the path to the original image
     * @return the stored thumbnail file information
     * @throws FileStorageException if thumbnail generation fails
     */
    public StoredFileInfo generateThumbnail(String filePath) {
        try {
            Path imagePath = Paths.get(filePath);

            if (!Files.exists(imagePath)) {
                throw new FileNotFoundException("Image file not found: " + filePath);
            }

            // Read original image
            BufferedImage originalImage = ImageIO.read(imagePath.toFile());
            if (originalImage == null) {
                log.warn("Could not read image for thumbnail generation: {}", filePath);
                return null;
            }

            // Calculate thumbnail dimensions
            int originalWidth = originalImage.getWidth();
            int originalHeight = originalImage.getHeight();

            FileStorageProperties.ThumbnailSettings thumbSettings = fileStorageProperties.getThumbnail();
            int thumbWidth = thumbSettings.getWidth();
            int thumbHeight = thumbSettings.getHeight();

            if (thumbSettings.isMaintainAspectRatio()) {
                double aspectRatio = (double) originalWidth / originalHeight;
                if (originalWidth > originalHeight) {
                    thumbHeight = (int) (thumbWidth / aspectRatio);
                } else {
                    thumbWidth = (int) (thumbHeight * aspectRatio);
                }
            }

            // Create thumbnail
            BufferedImage thumbnailImage = new BufferedImage(
                thumbWidth, thumbHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = thumbnailImage.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING,
                RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(originalImage, 0, 0, thumbWidth, thumbHeight, null);
            g.dispose();

            // Generate thumbnail path
            Path thumbnailPath = getThumbnailPath(imagePath);

            // Save thumbnail with quality settings
            String format = getFileExtension(imagePath.getFileName().toString());
            saveThumbnailWithQuality(thumbnailImage, thumbnailPath.toFile(), format,
                thumbSettings.getQuality());

            log.debug("Generated thumbnail: {} for image: {}", thumbnailPath, imagePath);

            // Build thumbnail file info
            return StoredFileInfo.builder()
                .filename(thumbnailPath.getFileName().toString())
                .originalFilename(thumbnailPath.getFileName().toString())
                .filePath(thumbnailPath.toString())
                .relativeFilePath(getRelativePath(thumbnailPath))
                .contentType("image/" + format)
                .fileSize(Files.size(thumbnailPath))
                .width(thumbWidth)
                .height(thumbHeight)
                .fileExtension(format)
                .build();

        } catch (IOException e) {
            log.error("Failed to generate thumbnail for: {}", filePath, e);
            throw new FileStorageException("Failed to generate thumbnail", e);
        }
    }

    /**
     * Load a file as a Resource for download/serving.
     *
     * @param filename the filename to load
     * @param propertyId the property ID
     * @return the file as a Resource
     * @throws FileNotFoundException if file is not found
     */
    public Resource loadFileAsResource(String filename, UUID propertyId) {
        try {
            Path filePath = getPropertyDirectory(propertyId).resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new FileNotFoundException("File not found: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new FileNotFoundException("File not found: " + filename, e);
        }
    }

    /**
     * Delete a file and its thumbnail.
     *
     * @param filePath the path to the file to delete
     * @return true if file was deleted successfully
     */
    public boolean deleteFile(String filePath) {
        try {
            Path path = Paths.get(filePath);

            // Delete main file
            boolean deleted = Files.deleteIfExists(path);

            // Delete thumbnail if exists
            Path thumbnailPath = getThumbnailPath(path);
            Files.deleteIfExists(thumbnailPath);

            log.info("Deleted file: {} (deleted: {})", filePath, deleted);
            return deleted;

        } catch (IOException e) {
            log.error("Failed to delete file: {}", filePath, e);
            throw new FileStorageException("Failed to delete file: " + filePath, e);
        }
    }

    /**
     * Delete all files for a property (when property is deleted).
     *
     * @param propertyId the property ID
     */
    public void deletePropertyFiles(UUID propertyId) {
        try {
            Path propertyDir = getPropertyDirectory(propertyId);

            if (Files.exists(propertyDir)) {
                // Delete all files in directory
                Files.walk(propertyDir)
                    .sorted((a, b) -> -a.compareTo(b)) // Delete files before directories
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            log.warn("Failed to delete file: {}", path, e);
                        }
                    });

                log.info("Deleted all files for property: {}", propertyId);
            }
        } catch (IOException e) {
            log.error("Failed to delete property files for: {}", propertyId, e);
            throw new FileStorageException("Failed to delete property files", e);
        }
    }

    /**
     * Check if file exists.
     *
     * @param filePath the file path to check
     * @return true if file exists
     */
    public boolean fileExists(String filePath) {
        return Files.exists(Paths.get(filePath));
    }

    /**
     * Get file size.
     *
     * @param filePath the file path
     * @return file size in bytes
     */
    public long getFileSize(String filePath) {
        try {
            return Files.size(Paths.get(filePath));
        } catch (IOException e) {
            throw new FileStorageException("Failed to get file size: " + filePath, e);
        }
    }

    // ========================================
    // Private Helper Methods
    // ========================================

    /**
     * Get the base upload path.
     */
    private Path getUploadPath() {
        return Paths.get(fileStorageProperties.getUploadDir()).toAbsolutePath().normalize();
    }

    /**
     * Get property-specific directory path.
     */
    private Path getPropertyDirectory(UUID propertyId) {
        return getUploadPath().resolve(propertyId.toString()).normalize();
    }

    /**
     * Get relative path from base upload directory.
     */
    private String getRelativePath(Path absolutePath) {
        Path uploadPath = getUploadPath();
        return uploadPath.relativize(absolutePath).toString().replace('\\', '/');
    }

    /**
     * Generate unique filename with UUID.
     */
    private String generateUniqueFilename(String extension) {
        return UUID.randomUUID().toString() + "." + extension;
    }

    /**
     * Get file extension from filename.
     */
    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }

    /**
     * Get thumbnail path for an image.
     */
    private Path getThumbnailPath(Path imagePath) {
        String filename = imagePath.getFileName().toString();
        int dotIndex = filename.lastIndexOf(".");
        String thumbnailFilename;
        if (dotIndex > 0) {
            thumbnailFilename = filename.substring(0, dotIndex) + "_thumb" + filename.substring(dotIndex);
        } else {
            thumbnailFilename = filename + "_thumb";
        }
        return imagePath.getParent().resolve(thumbnailFilename);
    }

    /**
     * Validate uploaded file.
     */
    private void validateFile(MultipartFile file) {
        // Check if file is empty
        if (file.isEmpty()) {
            throw new FileStorageException("Cannot store empty file");
        }

        // Check file size
        if (file.getSize() > fileStorageProperties.getMaxFileSize()) {
            throw new FileStorageException(
                String.format("File size (%d bytes) exceeds maximum allowed size (%d bytes)",
                    file.getSize(), fileStorageProperties.getMaxFileSize()));
        }

        // Check content type
        String contentType = file.getContentType();
        if (!fileStorageProperties.isContentTypeAllowed(contentType)) {
            throw new FileStorageException(
                String.format("File type '%s' is not allowed. Allowed types: %s",
                    contentType, fileStorageProperties.getAllowedContentTypes()));
        }

        // Check file extension
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isEmpty()) {
            throw new FileStorageException("Filename is empty");
        }

        String extension = getFileExtension(filename);
        if (!fileStorageProperties.isExtensionAllowed(extension)) {
            throw new FileStorageException(
                String.format("File extension '.%s' is not allowed. Allowed extensions: %s",
                    extension, fileStorageProperties.getAllowedExtensions()));
        }
    }

    /**
     * Save thumbnail with quality settings.
     */
    private void saveThumbnailWithQuality(BufferedImage image, File outputFile,
                                         String format, float quality) throws IOException {
        // Get image writer for format
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName(format);
        if (!writers.hasNext()) {
            // Fallback to simple write if no writer found
            ImageIO.write(image, format, outputFile);
            return;
        }

        ImageWriter writer = writers.next();
        ImageWriteParam param = writer.getDefaultWriteParam();

        // Set compression if supported
        if (param.canWriteCompressed()) {
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(quality);
        }

        // Write image
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(outputFile)) {
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }

    // ========================================
    // Nested Classes
    // ========================================

    /**
     * Information about a stored file.
     */
    @lombok.Data
    @lombok.Builder
    public static class StoredFileInfo {
        private String filename;
        private String originalFilename;
        private String filePath;
        private String relativeFilePath;
        private String contentType;
        private Long fileSize;
        private Integer width;
        private Integer height;
        private String fileExtension;
    }
}
