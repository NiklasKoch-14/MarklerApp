package com.marklerapp.crm.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Spring MVC configuration for static resource handling.
 *
 * <p>This configuration enables serving uploaded files (property images)
 * as static resources through the web application.</p>
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Serves uploaded property images via HTTP</li>
 *   <li>Configures resource handlers for file access</li>
 *   <li>Cross-platform path handling (Windows/Linux)</li>
 *   <li>Production-ready caching configuration</li>
 * </ul>
 *
 * <p>URL Mapping:</p>
 * <ul>
 *   <li>/uploads/** → maps to physical upload directory</li>
 *   <li>Example: /uploads/properties/{propertyId}/{filename}</li>
 * </ul>
 *
 * <p>Note: In production environments, consider using a CDN or
 * dedicated file server for better performance and scalability.</p>
 *
 * @see FileStorageProperties
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final FileStorageProperties fileStorageProperties;

    /**
     * Configure resource handlers for serving uploaded files.
     *
     * <p>This method maps URL patterns to physical file system locations,
     * allowing the application to serve uploaded images directly via HTTP.</p>
     *
     * <p>Configuration:</p>
     * <ul>
     *   <li>URL Pattern: /uploads/**</li>
     *   <li>Physical Location: Configured upload directory</li>
     *   <li>Cache Control: 1 hour (configurable for production)</li>
     * </ul>
     *
     * @param registry the resource handler registry
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Get upload directory from configuration
        String uploadDir = fileStorageProperties.getUploadDir();

        // Convert to absolute path and ensure proper URI format
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        String resourceLocation = "file:" + uploadPath.toString() + "/";

        // Ensure proper path separator for URLs (forward slash)
        resourceLocation = resourceLocation.replace('\\', '/');

        log.info("Configuring static resource handler: /uploads/** -> {}", resourceLocation);

        // Register resource handler
        registry.addResourceHandler("/uploads/**")
            .addResourceLocations(resourceLocation)
            .setCachePeriod(3600); // Cache for 1 hour (adjust for production)

        log.info("Static resource handler configured successfully");
    }
}
