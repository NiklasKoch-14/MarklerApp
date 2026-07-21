package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.ClientDeletionAuditLog;
import com.marklerapp.crm.repository.ClientDeletionAuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

/**
 * Records an append-only audit trail entry whenever a client is deleted.
 * Required for GDPR accountability — searchable record of who deleted what and when,
 * independent of the (non-searchable) application log.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClientDeletionAuditService {

    private final ClientDeletionAuditLogRepository auditLogRepository;

    /**
     * Log a client deletion. Must be called before the client row is removed from the DB
     * (only the id/name/email are snapshotted here, so the entity can still be attached).
     */
    @Transactional
    public void logDeletion(Client client,
                             Agent agent,
                             int deletedCallNotesCount,
                             int deletedViewingsCount,
                             int deletedFileAttachmentsCount,
                             boolean hadSearchCriteria) {
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
            log.warn("Could not extract request information for client deletion audit log", e);
        }

        ClientDeletionAuditLog auditLog = ClientDeletionAuditLog.builder()
                .agent(agent)
                .deletedClientId(client.getId())
                .clientDisplayName(client.getFirstName() + " " + client.getLastName())
                .clientEmail(client.getEmail())
                .deletionTimestamp(LocalDateTime.now())
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .deletedCallNotesCount(deletedCallNotesCount)
                .deletedViewingsCount(deletedViewingsCount)
                .deletedFileAttachmentsCount(deletedFileAttachmentsCount)
                .hadSearchCriteria(hadSearchCriteria)
                .build();

        auditLogRepository.save(auditLog);

        log.info("Client deletion audit log created: Client={}, Agent={}, CallNotes={}, Viewings={}, FileAttachments={}",
                client.getId(), agent.getId(), deletedCallNotesCount, deletedViewingsCount, deletedFileAttachmentsCount);
    }

    private String extractIpAddress(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");

        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("X-Real-IP");
        }

        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }

        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }

        return ipAddress;
    }
}
