-- Add property expose/brochure fields to properties table
-- Allows agents to upload and manage PDF property brochures (expose documents)

ALTER TABLE properties
ADD COLUMN expose_file_name VARCHAR(255);

ALTER TABLE properties
ADD COLUMN expose_file_data TEXT;

ALTER TABLE properties
ADD COLUMN expose_file_size BIGINT;

ALTER TABLE properties
ADD COLUMN expose_uploaded_at TIMESTAMP;

-- Add index for performance when filtering properties with exposes
CREATE INDEX idx_properties_has_expose ON properties(expose_file_name)
WHERE expose_file_name IS NOT NULL;

-- Add comments to explain the columns
COMMENT ON COLUMN properties.expose_file_name IS 'Original filename of the uploaded property brochure PDF';
COMMENT ON COLUMN properties.expose_file_data IS 'Base64 encoded PDF data for property expose/brochure';
COMMENT ON COLUMN properties.expose_file_size IS 'File size in bytes of the expose PDF';
COMMENT ON COLUMN properties.expose_uploaded_at IS 'Timestamp when the expose was uploaded';
