package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity for auditing GDPR data export requests.
 * Tracks all data access requests for compliance and security purposes.
 */
@Entity
@Table(name = "gdpr_export_audit_logs", indexes = {
    @Index(name = "idx_gdpr_audit_agent", columnList = "agent_id"),
    @Index(name = "idx_gdpr_audit_timestamp", columnList = "export_timestamp"),
    @Index(name = "idx_gdpr_audit_type", columnList = "export_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GdprExportAuditLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    @NotNull(message = "Agent is required")
    private Agent agent;

    @Column(name = "export_type", nullable = false, length = 50)
    @NotBlank(message = "Export type is required")
    @Enumerated(EnumType.STRING)
    private ExportType exportType;

    @Column(name = "export_format", nullable = false, length = 20)
    @NotBlank(message = "Export format is required")
    @Enumerated(EnumType.STRING)
    private ExportFormat exportFormat;

    @Column(name = "export_timestamp", nullable = false)
    @NotNull(message = "Export timestamp is required")
    @Builder.Default
    private LocalDateTime exportTimestamp = LocalDateTime.now();

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "records_exported")
    private Integer recordsExported;

    @Column(name = "export_size_bytes")
    private Long exportSizeBytes;

    @Column(name = "success", nullable = false)
    @Builder.Default
    private Boolean success = true;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "processing_time_ms")
    private Long processingTimeMs;

    /**
     * Enum for export types
     */
    public enum ExportType {
        FULL_EXPORT,
        CLIENTS_ONLY,
        PROPERTIES_ONLY,
        CALL_NOTES_ONLY,
        EXPORT_SUMMARY
    }

    /**
     * Enum for export formats
     */
    public enum ExportFormat {
        JSON,
        PDF
    }

    @Override
    public String toString() {
        return "GdprExportAuditLog{" +
                "id=" + getId() +
                ", exportType=" + exportType +
                ", exportFormat=" + exportFormat +
                ", exportTimestamp=" + exportTimestamp +
                ", success=" + success +
                '}';
    }
}
