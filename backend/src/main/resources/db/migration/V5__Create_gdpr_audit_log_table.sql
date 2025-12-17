-- Create GDPR export audit log table for compliance tracking
CREATE TABLE gdpr_export_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    export_type VARCHAR(50) NOT NULL,
    export_format VARCHAR(20) NOT NULL,
    export_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    records_exported INTEGER,
    export_size_bytes BIGINT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message VARCHAR(1000),
    processing_time_ms BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Create indexes for GDPR audit logs
CREATE INDEX idx_gdpr_audit_agent ON gdpr_export_audit_logs(agent_id);
CREATE INDEX idx_gdpr_audit_timestamp ON gdpr_export_audit_logs(export_timestamp);
CREATE INDEX idx_gdpr_audit_type ON gdpr_export_audit_logs(export_type);
CREATE INDEX idx_gdpr_audit_format ON gdpr_export_audit_logs(export_format);
CREATE INDEX idx_gdpr_audit_success ON gdpr_export_audit_logs(success);
CREATE INDEX idx_gdpr_audit_agent_timestamp ON gdpr_export_audit_logs(agent_id, export_timestamp DESC);

-- Compound indexes for common queries
CREATE INDEX idx_gdpr_audit_agent_type ON gdpr_export_audit_logs(agent_id, export_type, export_timestamp DESC);
CREATE INDEX idx_gdpr_audit_agent_success ON gdpr_export_audit_logs(agent_id, success, export_timestamp DESC);

-- Create view for GDPR audit statistics
CREATE VIEW v_gdpr_audit_stats AS
SELECT
    agent_id,
    COUNT(*) as total_exports,
    COUNT(CASE WHEN success = true THEN 1 END) as successful_exports,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_exports,
    COUNT(CASE WHEN export_type = 'FULL_EXPORT' THEN 1 END) as full_exports,
    COUNT(CASE WHEN export_type = 'CLIENTS_ONLY' THEN 1 END) as client_exports,
    COUNT(CASE WHEN export_type = 'PROPERTIES_ONLY' THEN 1 END) as property_exports,
    COUNT(CASE WHEN export_type = 'CALL_NOTES_ONLY' THEN 1 END) as callnote_exports,
    COUNT(CASE WHEN export_format = 'JSON' THEN 1 END) as json_exports,
    COUNT(CASE WHEN export_format = 'PDF' THEN 1 END) as pdf_exports,
    MAX(export_timestamp) as last_export_date,
    AVG(processing_time_ms) as avg_processing_time_ms,
    SUM(records_exported) as total_records_exported,
    SUM(export_size_bytes) as total_bytes_exported
FROM gdpr_export_audit_logs
GROUP BY agent_id;

-- Add comment explaining the table's purpose
COMMENT ON TABLE gdpr_export_audit_logs IS 'Audit log for GDPR data export requests to track all data access for compliance purposes as required by GDPR Article 15 (Right of Access)';
