package com.marklerapp.crm.config;

import com.marklerapp.crm.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Initializer that runs on application startup to ensure file storage directories exist.
 *
 * <p>This component implements CommandLineRunner to execute initialization logic
 * when the Spring Boot application starts. It ensures that the upload directory
 * structure is properly created before any file operations are attempted.</p>
 *
 * <p>Key Responsibilities:</p>
 * <ul>
 *   <li>Create base upload directory if it doesn't exist</li>
 *   <li>Verify directory permissions</li>
 *   <li>Log initialization status</li>
 *   <li>Fail fast if directory creation fails</li>
 * </ul>
 *
 * @see FileStorageService
 * @see FileStorageProperties
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FileStorageInitializer implements CommandLineRunner {

    private final FileStorageService fileStorageService;
    private final FileStorageProperties fileStorageProperties;

    /**
     * Initialize file storage directories on application startup.
     *
     * <p>This method is called by Spring Boot after the application context
     * is initialized and all beans are created.</p>
     *
     * @param args command line arguments (not used)
     */
    @Override
    public void run(String... args) {
        log.info("Initializing file storage system...");
        log.info("Upload directory: {}", fileStorageProperties.getUploadDir());
        log.info("Max file size: {} bytes ({})",
            fileStorageProperties.getMaxFileSize(),
            formatBytes(fileStorageProperties.getMaxFileSize()));
        log.info("Allowed content types: {}", fileStorageProperties.getAllowedContentTypes());
        log.info("Thumbnail dimensions: {}x{}",
            fileStorageProperties.getThumbnail().getWidth(),
            fileStorageProperties.getThumbnail().getHeight());

        try {
            // Initialize storage directories
            fileStorageService.init();
            log.info("File storage system initialized successfully");
        } catch (Exception e) {
            log.error("Failed to initialize file storage system", e);
            throw new IllegalStateException("Could not initialize file storage", e);
        }
    }

    /**
     * Format bytes to human-readable format.
     *
     * @param bytes number of bytes
     * @return formatted string (e.g., "10 MB", "2.5 GB")
     */
    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp - 1) + "";
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
}
