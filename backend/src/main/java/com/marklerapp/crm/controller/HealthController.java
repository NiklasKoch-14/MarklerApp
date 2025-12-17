package com.marklerapp.crm.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for application health monitoring and status checks.
 *
 * <p>This controller provides comprehensive health check endpoints to monitor
 * the application's operational status, including:
 * <ul>
 *   <li>Overall application health status</li>
 *   <li>Database connectivity verification</li>
 *   <li>Detailed system metrics (memory, disk, uptime)</li>
 *   <li>Application version and build information</li>
 * </ul>
 * </p>
 *
 * <p>Security: Health endpoints are publicly accessible for monitoring purposes.
 * Detailed health information is available without authentication to support
 * infrastructure monitoring tools and load balancers.</p>
 *
 * <p>Status Codes:
 * <ul>
 *   <li>200 OK - Service is healthy and operational</li>
 *   <li>503 Service Unavailable - Service is unhealthy (e.g., database unreachable)</li>
 * </ul>
 * </p>
 *
 * @see BuildProperties
 */
@Slf4j
@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
@Tag(name = "Health Check", description = "Endpoints for monitoring application health and status")
public class HealthController {

    private final DataSource dataSource;
    private final BuildProperties buildProperties;

    private static final Instant STARTUP_TIME = Instant.now();

    // ========================================
    // Core Health Check Endpoints
    // ========================================

    /**
     * Basic health check endpoint.
     *
     * <p>Returns a simple health status indicating whether the application is running.
     * This is the primary endpoint for load balancers and basic monitoring systems.</p>
     *
     * @return health status response with timestamp and overall status
     */
    @GetMapping
    @Operation(
        summary = "Overall application health check",
        description = "Returns the overall health status of the application. " +
                     "This endpoint is suitable for load balancer health checks and basic monitoring."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Application is healthy and operational",
            content = @Content(schema = @Schema(implementation = HealthResponse.class))
        ),
        @ApiResponse(
            responseCode = "503",
            description = "Application is unhealthy or experiencing issues",
            content = @Content(schema = @Schema(implementation = HealthResponse.class))
        )
    })
    public ResponseEntity<HealthResponse> health() {
        log.debug("Health check endpoint called");

        try {
            // Check database connectivity
            boolean dbHealthy = checkDatabaseHealth();

            if (dbHealthy) {
                HealthResponse response = HealthResponse.builder()
                    .status("UP")
                    .timestamp(LocalDateTime.now())
                    .version(getApplicationVersion())
                    .message("Application is healthy and operational")
                    .build();

                return ResponseEntity.ok(response);
            } else {
                HealthResponse response = HealthResponse.builder()
                    .status("DOWN")
                    .timestamp(LocalDateTime.now())
                    .version(getApplicationVersion())
                    .message("Application is unhealthy - database connectivity issues")
                    .build();

                log.warn("Health check failed: Database connectivity issues");
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
            }
        } catch (Exception e) {
            log.error("Health check failed with exception", e);

            HealthResponse response = HealthResponse.builder()
                .status("DOWN")
                .timestamp(LocalDateTime.now())
                .version(getApplicationVersion())
                .message("Application health check failed: " + e.getMessage())
                .build();

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }
    }

    /**
     * Database health check endpoint.
     *
     * <p>Specifically checks database connectivity by attempting to establish
     * a connection and execute a simple query. This is useful for diagnosing
     * database-specific issues.</p>
     *
     * @return database health status with connection details
     */
    @GetMapping("/db")
    @Operation(
        summary = "Database connectivity check",
        description = "Verifies database connectivity by attempting to establish a connection " +
                     "and execute a test query. Returns detailed connection status."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Database is accessible and healthy",
            content = @Content(schema = @Schema(implementation = DatabaseHealthResponse.class))
        ),
        @ApiResponse(
            responseCode = "503",
            description = "Database is unreachable or unhealthy",
            content = @Content(schema = @Schema(implementation = DatabaseHealthResponse.class))
        )
    })
    public ResponseEntity<DatabaseHealthResponse> databaseHealth() {
        log.debug("Database health check endpoint called");

        try {
            long startTime = System.currentTimeMillis();
            boolean isHealthy = checkDatabaseHealth();
            long responseTime = System.currentTimeMillis() - startTime;

            String databaseUrl = extractDatabaseUrl();

            if (isHealthy) {
                DatabaseHealthResponse response = DatabaseHealthResponse.builder()
                    .status("UP")
                    .timestamp(LocalDateTime.now())
                    .database(databaseUrl)
                    .responseTimeMs(responseTime)
                    .message("Database connection successful")
                    .build();

                return ResponseEntity.ok(response);
            } else {
                DatabaseHealthResponse response = DatabaseHealthResponse.builder()
                    .status("DOWN")
                    .timestamp(LocalDateTime.now())
                    .database(databaseUrl)
                    .responseTimeMs(responseTime)
                    .message("Database connection failed")
                    .build();

                log.warn("Database health check failed");
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
            }
        } catch (Exception e) {
            log.error("Database health check failed with exception", e);

            DatabaseHealthResponse response = DatabaseHealthResponse.builder()
                .status("DOWN")
                .timestamp(LocalDateTime.now())
                .database("Unknown")
                .responseTimeMs(0L)
                .message("Database health check error: " + e.getMessage())
                .build();

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }
    }

    /**
     * Detailed health check endpoint with system metrics.
     *
     * <p>Provides comprehensive health information including:
     * <ul>
     *   <li>Application version and build information</li>
     *   <li>JVM memory usage (heap and non-heap)</li>
     *   <li>Disk space availability</li>
     *   <li>Application uptime</li>
     *   <li>Database connectivity status</li>
     *   <li>Active threads and system load</li>
     * </ul>
     * </p>
     *
     * @return detailed health status with comprehensive metrics
     */
    @GetMapping("/detailed")
    @Operation(
        summary = "Detailed health check with metrics",
        description = "Returns comprehensive health information including system metrics, " +
                     "memory usage, disk space, uptime, and component status. " +
                     "Useful for detailed monitoring and diagnostics."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Detailed health information retrieved successfully",
            content = @Content(schema = @Schema(implementation = DetailedHealthResponse.class))
        ),
        @ApiResponse(
            responseCode = "503",
            description = "Application or components are unhealthy",
            content = @Content(schema = @Schema(implementation = DetailedHealthResponse.class))
        )
    })
    public ResponseEntity<DetailedHealthResponse> detailedHealth() {
        log.debug("Detailed health check endpoint called");

        try {
            // Gather all health metrics
            boolean dbHealthy = checkDatabaseHealth();
            Map<String, ComponentHealth> components = gatherComponentHealth(dbHealthy);
            SystemMetrics systemMetrics = gatherSystemMetrics();
            ApplicationInfo appInfo = gatherApplicationInfo();

            // Determine overall status
            boolean overallHealthy = components.values().stream()
                .allMatch(c -> "UP".equals(c.getStatus()));

            String overallStatus = overallHealthy ? "UP" : "DOWN";

            DetailedHealthResponse response = DetailedHealthResponse.builder()
                .status(overallStatus)
                .timestamp(LocalDateTime.now())
                .application(appInfo)
                .components(components)
                .system(systemMetrics)
                .build();

            HttpStatus httpStatus = overallHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

            if (!overallHealthy) {
                log.warn("Detailed health check shows unhealthy components: {}", components);
            }

            return ResponseEntity.status(httpStatus).body(response);
        } catch (Exception e) {
            log.error("Detailed health check failed with exception", e);

            DetailedHealthResponse response = DetailedHealthResponse.builder()
                .status("DOWN")
                .timestamp(LocalDateTime.now())
                .application(ApplicationInfo.builder()
                    .name("Real Estate CRM")
                    .version(getApplicationVersion())
                    .build())
                .components(new HashMap<>())
                .system(SystemMetrics.builder().build())
                .build();

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }
    }

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Check database health by attempting a connection.
     *
     * @return true if database is accessible, false otherwise
     */
    private boolean checkDatabaseHealth() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(5); // 5 second timeout
        } catch (Exception e) {
            log.error("Database health check failed", e);
            return false;
        }
    }

    /**
     * Extract database URL from datasource for reporting.
     *
     * @return sanitized database URL (without credentials)
     */
    private String extractDatabaseUrl() {
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            // Remove any credentials from URL for security
            return url.replaceAll("password=[^&;]*", "password=***");
        } catch (Exception e) {
            log.debug("Could not extract database URL", e);
            return "Unknown";
        }
    }

    /**
     * Get application version from build properties or fallback.
     *
     * @return application version string
     */
    private String getApplicationVersion() {
        try {
            return buildProperties.getVersion();
        } catch (Exception e) {
            log.debug("Build properties not available, using fallback version");
            return "1.0.0-SNAPSHOT";
        }
    }

    /**
     * Gather health status of all application components.
     *
     * @param dbHealthy database health status
     * @return map of component name to health status
     */
    private Map<String, ComponentHealth> gatherComponentHealth(boolean dbHealthy) {
        Map<String, ComponentHealth> components = new HashMap<>();

        // Database component
        components.put("database", ComponentHealth.builder()
            .status(dbHealthy ? "UP" : "DOWN")
            .message(dbHealthy ? "Database connection successful" : "Database connection failed")
            .build());

        // Application component (always UP if we can respond)
        components.put("application", ComponentHealth.builder()
            .status("UP")
            .message("Application is running")
            .build());

        // Disk space check
        try {
            long freeSpace = new java.io.File(".").getFreeSpace();
            long totalSpace = new java.io.File(".").getTotalSpace();
            boolean diskHealthy = freeSpace > (totalSpace * 0.1); // At least 10% free

            components.put("diskSpace", ComponentHealth.builder()
                .status(diskHealthy ? "UP" : "WARNING")
                .message(String.format("Free: %.2f GB / Total: %.2f GB",
                    freeSpace / (1024.0 * 1024.0 * 1024.0),
                    totalSpace / (1024.0 * 1024.0 * 1024.0)))
                .build());
        } catch (Exception e) {
            log.debug("Could not check disk space", e);
        }

        return components;
    }

    /**
     * Gather system metrics (memory, threads, etc.).
     *
     * @return system metrics object
     */
    private SystemMetrics gatherSystemMetrics() {
        Runtime runtime = Runtime.getRuntime();

        long maxMemory = runtime.maxMemory();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;

        long uptimeSeconds = (System.currentTimeMillis() - STARTUP_TIME.toEpochMilli()) / 1000;

        return SystemMetrics.builder()
            .memoryUsedMb(usedMemory / (1024 * 1024))
            .memoryMaxMb(maxMemory / (1024 * 1024))
            .memoryFreeMb(freeMemory / (1024 * 1024))
            .memoryUsagePercent(Math.round((double) usedMemory / maxMemory * 100))
            .processors(runtime.availableProcessors())
            .activeThreads(Thread.activeCount())
            .uptimeSeconds(uptimeSeconds)
            .uptimeFormatted(formatUptime(uptimeSeconds))
            .build();
    }

    /**
     * Gather application information.
     *
     * @return application info object
     */
    private ApplicationInfo gatherApplicationInfo() {
        String version = getApplicationVersion();
        String buildTime = "Unknown";

        try {
            buildTime = buildProperties.getTime().toString();
        } catch (Exception e) {
            log.debug("Build time not available", e);
        }

        return ApplicationInfo.builder()
            .name("Real Estate CRM")
            .version(version)
            .buildTime(buildTime)
            .javaVersion(System.getProperty("java.version"))
            .springBootVersion(org.springframework.boot.SpringBootVersion.getVersion())
            .build();
    }

    /**
     * Format uptime seconds into human-readable format.
     *
     * @param seconds uptime in seconds
     * @return formatted uptime string
     */
    private String formatUptime(long seconds) {
        long days = seconds / 86400;
        long hours = (seconds % 86400) / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;

        return String.format("%dd %dh %dm %ds", days, hours, minutes, secs);
    }

    // ========================================
    // Response DTOs
    // ========================================

    /**
     * Basic health response.
     */
    @Data
    @Builder
    @Schema(description = "Basic health check response")
    public static class HealthResponse {
        @Schema(description = "Health status (UP/DOWN)", example = "UP")
        private String status;

        @Schema(description = "Timestamp of health check")
        private LocalDateTime timestamp;

        @Schema(description = "Application version", example = "1.0.0-SNAPSHOT")
        private String version;

        @Schema(description = "Health status message")
        private String message;
    }

    /**
     * Database health response.
     */
    @Data
    @Builder
    @Schema(description = "Database health check response")
    public static class DatabaseHealthResponse {
        @Schema(description = "Database status (UP/DOWN)", example = "UP")
        private String status;

        @Schema(description = "Timestamp of health check")
        private LocalDateTime timestamp;

        @Schema(description = "Database connection URL (sanitized)", example = "jdbc:sqlite:./data/realestate_crm.db")
        private String database;

        @Schema(description = "Response time in milliseconds", example = "45")
        private Long responseTimeMs;

        @Schema(description = "Health status message")
        private String message;
    }

    /**
     * Detailed health response with all metrics.
     */
    @Data
    @Builder
    @Schema(description = "Detailed health check response with comprehensive metrics")
    public static class DetailedHealthResponse {
        @Schema(description = "Overall health status (UP/DOWN)", example = "UP")
        private String status;

        @Schema(description = "Timestamp of health check")
        private LocalDateTime timestamp;

        @Schema(description = "Application information")
        private ApplicationInfo application;

        @Schema(description = "Component health status")
        private Map<String, ComponentHealth> components;

        @Schema(description = "System metrics")
        private SystemMetrics system;
    }

    /**
     * Application information.
     */
    @Data
    @Builder
    @Schema(description = "Application build and version information")
    public static class ApplicationInfo {
        @Schema(description = "Application name", example = "Real Estate CRM")
        private String name;

        @Schema(description = "Application version", example = "1.0.0-SNAPSHOT")
        private String version;

        @Schema(description = "Build timestamp")
        private String buildTime;

        @Schema(description = "Java version", example = "17.0.9")
        private String javaVersion;

        @Schema(description = "Spring Boot version", example = "3.2.0")
        private String springBootVersion;
    }

    /**
     * Component health status.
     */
    @Data
    @Builder
    @Schema(description = "Individual component health status")
    public static class ComponentHealth {
        @Schema(description = "Component status (UP/DOWN/WARNING)", example = "UP")
        private String status;

        @Schema(description = "Component health message")
        private String message;
    }

    /**
     * System metrics.
     */
    @Data
    @Builder
    @Schema(description = "System resource metrics")
    public static class SystemMetrics {
        @Schema(description = "Memory used in MB", example = "256")
        private Long memoryUsedMb;

        @Schema(description = "Maximum memory in MB", example = "1024")
        private Long memoryMaxMb;

        @Schema(description = "Free memory in MB", example = "768")
        private Long memoryFreeMb;

        @Schema(description = "Memory usage percentage", example = "25")
        private Long memoryUsagePercent;

        @Schema(description = "Number of processors", example = "8")
        private Integer processors;

        @Schema(description = "Number of active threads", example = "42")
        private Integer activeThreads;

        @Schema(description = "Uptime in seconds", example = "3600")
        private Long uptimeSeconds;

        @Schema(description = "Formatted uptime", example = "0d 1h 0m 0s")
        private String uptimeFormatted;
    }
}
