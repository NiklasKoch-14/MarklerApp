-- Migration: Add Supabase Storage path columns to property_images
-- Replaces Base64 in-DB storage with signed URLs from Supabase Storage.
-- Legacy image_data / thumbnail_data columns remain for backward-compatibility
-- (old rows still readable); they can be dropped once all images are migrated.

ALTER TABLE property_images
    ADD COLUMN IF NOT EXISTS storage_path           VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS thumbnail_storage_path VARCHAR(1000);

COMMENT ON COLUMN property_images.storage_path
    IS 'Supabase Storage object path, e.g. properties/{property_id}/{uuid}.jpg';
COMMENT ON COLUMN property_images.thumbnail_storage_path
    IS 'Supabase Storage thumbnail path, e.g. properties/{property_id}/{uuid}_thumb.jpg';
