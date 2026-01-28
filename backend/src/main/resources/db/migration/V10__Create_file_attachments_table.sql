-- Migration V10: Create file_attachments table
-- Purpose: Add support for file attachments (contracts, floor plans, documents) for properties and clients
-- Author: Claude Sonnet 4.5
-- Date: 2026-01-28

-- Create file_attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships (at least one must be set)
    property_id UUID,
    client_id UUID,
    agent_id UUID NOT NULL,

    -- File information
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255),
    file_data TEXT NOT NULL,  -- Base64 encoded file data
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    mime_type VARCHAR(100) NOT NULL,

    -- Categorization
    file_type VARCHAR(50) NOT NULL,
    description VARCHAR(500),

    -- Timestamps
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_file_attachment_property FOREIGN KEY (property_id)
        REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_attachment_client FOREIGN KEY (client_id)
        REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_attachment_agent FOREIGN KEY (agent_id)
        REFERENCES agents(id) ON DELETE CASCADE,

    -- Ensure attachment is associated with either property or client
    CONSTRAINT chk_attachment_relationship CHECK (
        (property_id IS NOT NULL AND client_id IS NULL) OR
        (property_id IS NULL AND client_id IS NOT NULL)
    )
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_file_attachment_property ON file_attachments(property_id);
CREATE INDEX IF NOT EXISTS idx_file_attachment_client ON file_attachments(client_id);
CREATE INDEX IF NOT EXISTS idx_file_attachment_agent ON file_attachments(agent_id);
CREATE INDEX IF NOT EXISTS idx_file_attachment_type ON file_attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_file_attachment_upload_date ON file_attachments(upload_date DESC);

-- Add comments for documentation
COMMENT ON TABLE file_attachments IS 'Stores file attachments (documents, images) associated with properties or clients';
COMMENT ON COLUMN file_attachments.file_data IS 'Base64 encoded file data stored in database';
COMMENT ON COLUMN file_attachments.file_type IS 'Category of file: CONTRACT, FLOOR_PLAN, ID_DOCUMENT, CERTIFICATE, FINANCIAL, INSPECTION_REPORT, OTHER';
COMMENT ON COLUMN file_attachments.mime_type IS 'MIME type of file: application/pdf, image/jpeg, application/vnd.openxmlformats-officedocument.wordprocessingml.document, etc.';
COMMENT ON CONSTRAINT chk_attachment_relationship ON file_attachments IS 'Ensures each attachment belongs to either a property or client, but not both';
