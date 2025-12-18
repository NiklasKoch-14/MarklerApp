-- Quick fix for image upload constraint violation
-- Run this script manually if the application hasn't applied V7 migration yet

-- Add columns for Base64 image data (if they don't exist)
ALTER TABLE property_images
ADD COLUMN IF NOT EXISTS image_data TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_data TEXT;

-- Make file_path nullable since we're storing in database
ALTER TABLE property_images
ALTER COLUMN file_path DROP NOT NULL;

-- Verify the change
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'property_images'
  AND column_name IN ('file_path', 'image_data', 'thumbnail_data');
