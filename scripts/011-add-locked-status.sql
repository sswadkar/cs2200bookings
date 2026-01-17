-- Add 'locked' to the status check constraint for booking_groups
-- First drop the existing constraint, then add the new one with 'locked' included

ALTER TABLE booking_groups DROP CONSTRAINT IF EXISTS booking_groups_status_check;

ALTER TABLE booking_groups ADD CONSTRAINT booking_groups_status_check 
  CHECK (status IN ('hidden', 'published', 'locked', 'inactive'));
