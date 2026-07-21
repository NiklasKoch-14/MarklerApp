package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Immutable audit trail entry for a client deletion.
 * No repository method or service in this codebase deletes rows from this table.
 */
@Entity
@Table(name = "client_deletion_audit_logs", indexes = {
    @Index(name = "idx_client_deletion_audit_agent", columnList = "agent_id"),
    @Index(name = "idx_client_deletion_audit_client", columnList = "deleted_client_id"),
    @Index(name = "idx_client_deletion_audit_timestamp", columnList = "deletion_timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientDeletionAuditLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    @NotNull(message = "Agent is required")
    private Agent agent;

    @Column(name = "deleted_client_id", nullable = false)
    @NotNull(message = "Deleted client id is required")
    private UUID deletedClientId;

    @Column(name = "client_display_name", nullable = false, length = 200)
    private String clientDisplayName;

    @Column(name = "client_email", length = 255)
    private String clientEmail;

    @Column(name = "deletion_timestamp", nullable = false)
    @NotNull(message = "Deletion timestamp is required")
    @Builder.Default
    private LocalDateTime deletionTimestamp = LocalDateTime.now();

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "deleted_call_notes_count", nullable = false)
    @Builder.Default
    private Integer deletedCallNotesCount = 0;

    @Column(name = "deleted_viewings_count", nullable = false)
    @Builder.Default
    private Integer deletedViewingsCount = 0;

    @Column(name = "deleted_file_attachments_count", nullable = false)
    @Builder.Default
    private Integer deletedFileAttachmentsCount = 0;

    @Column(name = "had_search_criteria", nullable = false)
    @Builder.Default
    private Boolean hadSearchCriteria = false;

    @Override
    public String toString() {
        return "ClientDeletionAuditLog{" +
                "id=" + getId() +
                ", deletedClientId=" + deletedClientId +
                ", deletionTimestamp=" + deletionTimestamp +
                '}';
    }
}
