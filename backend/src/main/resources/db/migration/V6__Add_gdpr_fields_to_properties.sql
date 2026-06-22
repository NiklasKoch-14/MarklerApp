-- Add GDPR compliance fields to properties table
-- Required by the Property entity for GDPR Art. 13/14 compliance

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS data_processing_consent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS consent_date DATE;

-- Backfill existing sample data with consent (safe for dev seed data)
UPDATE properties SET data_processing_consent = true WHERE data_processing_consent = false;
