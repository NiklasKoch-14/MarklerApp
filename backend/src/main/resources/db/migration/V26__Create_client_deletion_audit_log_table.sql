-- Create audit log table for client deletions (GDPR compliance)
-- No FK on deleted_client_id: the client row is gone by the time this row exists,
-- so the deletion snapshot (name/email) is stored instead.
CREATE TABLE client_deletion_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    deleted_client_id UUID NOT NULL,
    client_display_name VARCHAR(200) NOT NULL,
    client_email VARCHAR(255),
    deletion_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    deleted_call_notes_count INTEGER NOT NULL DEFAULT 0,
    deleted_viewings_count INTEGER NOT NULL DEFAULT 0,
    deleted_file_attachments_count INTEGER NOT NULL DEFAULT 0,
    had_search_criteria BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_client_deletion_audit_agent ON client_deletion_audit_logs(agent_id);
CREATE INDEX idx_client_deletion_audit_client ON client_deletion_audit_logs(deleted_client_id);
CREATE INDEX idx_client_deletion_audit_timestamp ON client_deletion_audit_logs(deletion_timestamp);

COMMENT ON TABLE client_deletion_audit_logs IS 'Immutable audit trail for client deletions (who/when/what), required for GDPR accountability. No application code path deletes rows from this table.';
