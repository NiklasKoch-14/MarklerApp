package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.GdprExportAuditLog;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.GdprExportAuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service for auditing GDPR export operations.
 * Logs all data access requests for compliance tracking.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GdprAuditService {

    private final GdprExportAuditLogRepository auditLogRepository;
    private final AgentRepository agentRepository;

    /**
     * Log a GDPR export request
     */
    @Transactional
    public void logExport(UUID agentId,
                         GdprExportAuditLog.ExportType exportType,
                         GdprExportAuditLog.ExportFormat exportFormat,
                         int recordsExported,
                         long exportSizeBytes,
                         long processingTimeMs) {
        try {
            Agent agent = agentRepository.findById(agentId)
                    .orElseThrow(() -> new RuntimeException("Agent not found: " + agentId));

            // Get request information
            String ipAddress = null;
            String userAgent = null;

            try {
                ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    ipAddress = extractIpAddress(request);
                    userAgent = request.getHeader("User-Agent");
                }
            } catch (Exception e) {
                log.warn("Could not extract request information for audit log", e);
            }

            GdprExportAuditLog auditLog = GdprExportAuditLog.builder()
                    .agent(agent)
                    .exportType(exportType)
                    .exportFormat(exportFormat)
                    .exportTimestamp(LocalDateTime.now())
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .recordsExported(recordsExported)
                    .exportSizeBytes(exportSizeBytes)
                    .success(true)
                    .processingTimeMs(processingTimeMs)
                    .build();

            auditLogRepository.save(auditLog);

            log.info("GDPR export audit log created: Agent={}, Type={}, Format={}, Records={}, Size={}",
                    agentId, exportType, exportFormat, recordsExported, exportSizeBytes);

        } catch (Exception e) {
            log.error("Failed to create GDPR export audit log for agent: {}", agentId, e);
            // Don't throw exception - audit failure shouldn't break the export
        }
    }

    /**
     * Log a failed GDPR export request
     */
    @Transactional
    public void logFailedExport(UUID agentId,
                               GdprExportAuditLog.ExportType exportType,
                               GdprExportAuditLog.ExportFormat exportFormat,
                               String errorMessage,
                               long processingTimeMs) {
        try {
            Agent agent = agentRepository.findById(agentId)
                    .orElseThrow(() -> new RuntimeException("Agent not found: " + agentId));

            // Get request information
            String ipAddress = null;
            String userAgent = null;

            try {
                ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    ipAddress = extractIpAddress(request);
                    userAgent = request.getHeader("User-Agent");
                }
            } catch (Exception e) {
                log.warn("Could not extract request information for audit log", e);
            }

            GdprExportAuditLog auditLog = GdprExportAuditLog.builder()
                    .agent(agent)
                    .exportType(exportType)
                    .exportFormat(exportFormat)
                    .exportTimestamp(LocalDateTime.now())
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .success(false)
                    .errorMessage(errorMessage)
                    .processingTimeMs(processingTimeMs)
                    .build();

            auditLogRepository.save(auditLog);

            log.warn("GDPR export failure logged: Agent={}, Type={}, Format={}, Error={}",
                    agentId, exportType, exportFormat, errorMessage);

        } catch (Exception e) {
            log.error("Failed to create GDPR export failure audit log for agent: {}", agentId, e);
        }
    }

    /**
     * Extract IP address from request, considering proxy headers
     */
    private String extractIpAddress(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");

        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("X-Real-IP");
        }

        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }

        // X-Forwarded-For can contain multiple IPs, take the first one
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }

        return ipAddress;
    }
}
