-- Migration: Add Base64 image storage columns to property_images table
-- Date: 2025-12-18
-- Purpose: Store images as Base64 strings in PostgreSQL instead of file system

-- Add columns for Base64 image data
ALTER TABLE property_images
ADD COLUMN IF NOT EXISTS image_data TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_data TEXT;

-- Make file_path nullable since we're storing in database
ALTER TABLE property_images
ALTER COLUMN file_path DROP NOT NULL;

-- Add comment explaining the storage strategy
COMMENT ON COLUMN property_images.image_data IS 'Base64 encoded full-size image data stored directly in database';
COMMENT ON COLUMN property_images.thumbnail_data IS 'Base64 encoded thumbnail image data for faster loading';
COMMENT ON COLUMN property_images.file_path IS 'Legacy file path - nullable for Base64 storage';
