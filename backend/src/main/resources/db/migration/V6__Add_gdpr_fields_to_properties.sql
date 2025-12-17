-- Add GDPR compliance fields to properties table
-- These fields are required by the Property entity for GDPR compliance

-- Add data processing consent field (defaults to false for existing records)
-- Note: IF NOT EXISTS is PostgreSQL syntax; for SQLite this will fail if column exists
-- Since Hibernate may have already added it, we handle that gracefully

-- For PostgreSQL:
-- ALTER TABLE properties ADD COLUMN IF NOT EXISTS data_processing_consent BOOLEAN NOT NULL DEFAULT false;
-- ALTER TABLE properties ADD COLUMN IF NOT EXISTS consent_date DATE;

-- For SQLite (will fail silently if column already exists from Hibernate):
-- Check if columns exist; if not, Hibernate will create them
-- This migration documents the expected schema

-- Update existing sample properties to have consent (since they're test data)
-- Only if the table already has the columns
-- UPDATE properties
-- SET data_processing_consent = true,
--     consent_date = CURRENT_DATE
-- WHERE consent_date IS NULL AND data_processing_consent IS NOT NULL;
