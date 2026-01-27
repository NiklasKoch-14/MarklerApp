package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.*;
import com.marklerapp.crm.entity.GdprExportAuditLog;
import com.marklerapp.crm.service.GdprAuditService;
import com.marklerapp.crm.service.GdprPdfService;
import com.marklerapp.crm.service.GdprService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for GDPR data export operations.
 * Extends BaseController for common authentication methods.
 * Implements GDPR Article 15 - Right of Access
 *
 * This controller provides endpoints for agents to export all their personal data
 * stored in the system in accordance with GDPR compliance requirements.
 *
 * @see BaseController
 * @since Phase 7.1 - Refactored to use BaseController
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/gdpr")
@RequiredArgsConstructor
@Tag(name = "GDPR Compliance", description = "APIs for GDPR data export and compliance (Article 15 - Right of Access)")
@SecurityRequirement(name = "Bearer Authentication")
public class GdprController extends BaseController {

    private final GdprService gdprService;
    private final GdprPdfService gdprPdfService;
    private final GdprAuditService gdprAuditService;

    /**
     * Export all agent data as JSON
     *
     * This endpoint provides a complete export of all data associated with the authenticated agent,
     * including clients, properties, call notes, and search criteria.
     */
    @GetMapping(value = "/export", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
        summary = "Export all agent data as JSON",
        description = "Export complete GDPR data package for the authenticated agent in JSON format. " +
                      "Includes all clients, properties, call notes, and associated data. " +
                      "Complies with GDPR Article 15 (Right of Access)."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Data successfully exported",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = GdprExportResponse.class)
            )
        ),
        @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing authentication token"),
        @ApiResponse(responseCode = "500", description = "Internal server error during export")
    })
    public ResponseEntity<GdprExportResponse> exportAllDataAsJson(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        long startTime = System.currentTimeMillis();

        log.info("GDPR export request received from agent: {}", agentId);

        try {
            GdprExportResponse exportData = gdprService.exportAllData(agentId);

            // Calculate processing time
            long processingTime = System.currentTimeMillis() - startTime;

            // Log the export for audit purposes
            int totalRecords = (int) (exportData.getStatistics().getTotalClients() +
                                     exportData.getStatistics().getTotalProperties() +
                                     exportData.getStatistics().getTotalCallNotes());

            gdprAuditService.logExport(
                agentId,
                GdprExportAuditLog.ExportType.FULL_EXPORT,
                GdprExportAuditLog.ExportFormat.JSON,
                totalRecords,
                0L, // Size will be calculated by Spring
                processingTime
            );

            // Set headers for better file handling
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set(HttpHeaders.CONTENT_DISPOSITION,
                       "attachment; filename=\"gdpr_export_" + generateFilename() + ".json\"");

            log.info("GDPR export completed successfully for agent: {}", agentId);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(exportData);

        } catch (Exception e) {
            long processingTime = System.currentTimeMillis() - startTime;
            gdprAuditService.logFailedExport(
                agentId,
                GdprExportAuditLog.ExportType.FULL_EXPORT,
                GdprExportAuditLog.ExportFormat.JSON,
                e.getMessage(),
                processingTime
            );
            throw e;
        }
    }

    /**
     * Export only client data as JSON
     */
    @GetMapping(value = "/export/clients", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
        summary = "Export only client data as JSON",
        description = "Export all client data including contact information, addresses, and search criteria " +
                      "for the authenticated agent. Excludes properties and call notes."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Client data successfully exported",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = GdprClientData.class, type = "array")
            )
        ),
        @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing authentication token"),
        @ApiResponse(responseCode = "500", description = "Internal server error during export")
    })
    public ResponseEntity<List<GdprClientData>> exportClientData(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);

        log.info("GDPR client data export request received from agent: {}", agentId);

        List<GdprClientData> clientData = gdprService.exportClientData(agentId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
                   "attachment; filename=\"gdpr_clients_" + generateFilename() + ".json\"");

        log.info("GDPR client data export completed for agent: {}. Total clients: {}",
                agentId, clientData.size());

        return ResponseEntity.ok()
                .headers(headers)
                .body(clientData);
    }

    /**
     * Export only property data as JSON
     */
    @GetMapping(value = "/export/properties", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
        summary = "Export only property data as JSON",
        description = "Export all property data including specifications, addresses, features, and images " +
                      "for the authenticated agent. Excludes clients and call notes."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Property data successfully exported",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = GdprPropertyData.class, type = "array")
            )
        ),
        @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing authentication token"),
        @ApiResponse(responseCode = "500", description = "Internal server error during export")
    })
    public ResponseEntity<List<GdprPropertyData>> exportPropertyData(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);

        log.info("GDPR property data export request received from agent: {}", agentId);

        List<GdprPropertyData> propertyData = gdprService.exportPropertyData(agentId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
                   "attachment; filename=\"gdpr_properties_" + generateFilename() + ".json\"");

        log.info("GDPR property data export completed for agent: {}. Total properties: {}",
                agentId, propertyData.size());

        return ResponseEntity.ok()
                .headers(headers)
                .body(propertyData);
    }

    /**
     * Export only call notes data as JSON
     */
    @GetMapping(value = "/export/call-notes", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
        summary = "Export only call notes data as JSON",
        description = "Export all communication records (call notes) including dates, subjects, notes, " +
                      "and follow-up information for the authenticated agent. Excludes clients and properties."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Call notes data successfully exported",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = GdprCallNoteData.class, type = "array")
            )
        ),
        @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing authentication token"),
        @ApiResponse(responseCode = "500", description = "Internal server error during export")
    })
    public ResponseEntity<List<GdprCallNoteData>> exportCallNoteData(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);

        log.info("GDPR call notes export request received from agent: {}", agentId);

        List<GdprCallNoteData> callNoteData = gdprService.exportCallNoteData(agentId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
                   "attachment; filename=\"gdpr_call_notes_" + generateFilename() + ".json\"");

        log.info("GDPR call notes export completed for agent: {}. Total call notes: {}",
                agentId, callNoteData.size());

        return ResponseEntity.ok()
                .headers(headers)
                .body(callNoteData);
    }

    /**
     * Export all agent data as PDF
     *
     * This endpoint provides a complete export of all data associated with the authenticated agent
     * in PDF format for easy reading and archiving.
     */
    @GetMapping(value = "/export/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(
        summary = "Export all agent data as PDF",
        description = "Export complete GDPR data package for the authenticated agent in PDF format. " +
                      "Includes all clients, properties, call notes, and associated data in a formatted, " +
                      "human-readable PDF document. Complies with GDPR Article 15 (Right of Access)."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "PDF successfully generated and exported",
            content = @Content(
                mediaType = MediaType.APPLICATION_PDF_VALUE
            )
        ),
        @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing authentication token"),
        @ApiResponse(responseCode = "500", description = "Internal server error during PDF generation")
    })
    public ResponseEntity<byte[]> exportAllDataAsPdf(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        long startTime = System.currentTimeMillis();

        log.info("GDPR PDF export request received from agent: {}", agentId);

        try {
            // Get the data
            GdprExportResponse exportData = gdprService.exportAllData(agentId);

            // Generate PDF
            byte[] pdfBytes = gdprPdfService.generatePdfExport(exportData);

            // Calculate processing time
            long processingTime = System.currentTimeMillis() - startTime;

            // Log the export for audit purposes
            int totalRecords = (int) (exportData.getStatistics().getTotalClients() +
                                     exportData.getStatistics().getTotalProperties() +
                                     exportData.getStatistics().getTotalCallNotes());

            gdprAuditService.logExport(
                agentId,
                GdprExportAuditLog.ExportType.FULL_EXPORT,
                GdprExportAuditLog.ExportFormat.PDF,
                totalRecords,
                (long) pdfBytes.length,
                processingTime
            );

            // Set headers for PDF download
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.set(HttpHeaders.CONTENT_DISPOSITION,
                       "attachment; filename=\"gdpr_export_" + generateFilename() + ".pdf\"");
            headers.setContentLength(pdfBytes.length);

            log.info("GDPR PDF export completed successfully for agent: {}. Size: {} bytes",
                    agentId, pdfBytes.length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);

        } catch (Exception e) {
            long processingTime = System.currentTimeMillis() - startTime;
            gdprAuditService.logFailedExport(
                agentId,
                GdprExportAuditLog.ExportType.FULL_EXPORT,
                GdprExportAuditLog.ExportFormat.PDF,
                e.getMessage(),
                processingTime
            );
            throw e;
        }
    }

    /**
     * Get GDPR export summary (metadata only, no actual data)
     */
    @GetMapping("/export/summary")
    @Operation(
        summary = "Get GDPR export summary",
        description = "Get a summary of what data would be exported without actually exporting it. " +
                      "Useful for displaying to users before they initiate a full export."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Summary retrieved successfully",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = GdprExportSummary.class)
            )
        ),
        @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or missing authentication token")
    })
    public ResponseEntity<GdprExportSummary> getExportSummary(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);

        log.info("GDPR export summary request received from agent: {}", agentId);

        // Get full export to calculate statistics
        GdprExportResponse fullExport = gdprService.exportAllData(agentId);

        GdprExportSummary summary = GdprExportSummary.builder()
                .agentId(agentId)
                .totalClients(fullExport.getStatistics().getTotalClients())
                .totalProperties(fullExport.getStatistics().getTotalProperties())
                .totalCallNotes(fullExport.getStatistics().getTotalCallNotes())
                .totalSearchCriteria(fullExport.getStatistics().getTotalSearchCriteria())
                .totalPropertyImages(fullExport.getStatistics().getTotalPropertyImages())
                .estimatedExportSizeKb(estimateExportSize(fullExport))
                .build();

        return ResponseEntity.ok(summary);
    }

    /**
     * Generate filename timestamp
     */
    private String generateFilename() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
    }

    /**
     * Estimate export size in KB
     */
    private long estimateExportSize(GdprExportResponse export) {
        // Rough estimation:
        // - 5KB per client
        // - 10KB per property
        // - 2KB per call note
        long estimatedSize =
                (export.getStatistics().getTotalClients() * 5) +
                (export.getStatistics().getTotalProperties() * 10) +
                (export.getStatistics().getTotalCallNotes() * 2) +
                50; // Base overhead

        return estimatedSize;
    }

    /**
     * DTO for GDPR export summary
     */
    @lombok.Getter
    @lombok.Setter
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    @lombok.Builder
    @Schema(description = "Summary of GDPR export data without actual content")
    public static class GdprExportSummary {

        @Schema(description = "Agent ID", example = "123e4567-e89b-12d3-a456-426614174000")
        private UUID agentId;

        @Schema(description = "Total number of clients", example = "42")
        private long totalClients;

        @Schema(description = "Total number of properties", example = "15")
        private long totalProperties;

        @Schema(description = "Total number of call notes", example = "128")
        private long totalCallNotes;

        @Schema(description = "Total number of search criteria", example = "35")
        private long totalSearchCriteria;

        @Schema(description = "Total number of property images", example = "87")
        private long totalPropertyImages;

        @Schema(description = "Estimated export size in kilobytes", example = "450")
        private long estimatedExportSizeKb;
    }
}
