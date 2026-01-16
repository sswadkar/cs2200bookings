-- Add slug column to booking_groups for URL-friendly identifiers

ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Update existing booking groups with a slug based on their name
UPDATE booking_groups 
SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '''', ''))
WHERE slug IS NULL;

-- Make slug required for future inserts
ALTER TABLE booking_groups ALTER COLUMN slug SET NOT NULL;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_booking_groups_slug ON booking_groups(slug);
