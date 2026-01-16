-- Restructure database for Student, TA, Admin roles
-- Run this migration to update the schema

-- 1. Create TAs table (like admins, uses Supabase Auth)
CREATE TABLE IF NOT EXISTS tas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL, -- References Supabase auth.users
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rename 'users' table to 'students' for clarity
ALTER TABLE users RENAME TO students;

-- 3. Add new columns to booking_groups
-- Status: 'hidden' (only Admin/TA), 'published' (visible to students), 'inactive'
ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'hidden' CHECK (status IN ('hidden', 'published', 'inactive'));

-- TA hour requirement in minutes
ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS ta_hour_requirement INTEGER DEFAULT 0;

-- Date range for the booking group
ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS end_date DATE;

-- Daily time range (stored as TIME)
ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS daily_start_time TIME DEFAULT '09:00:00';
ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS daily_end_time TIME DEFAULT '17:00:00';

-- Remove is_active since we now use status
ALTER TABLE booking_groups DROP COLUMN IF EXISTS is_active;

-- 4. Add TA reference to booking_slots (who created this slot)
ALTER TABLE booking_slots ADD COLUMN IF NOT EXISTS created_by_ta_id UUID REFERENCES tas(id) ON DELETE SET NULL;

-- 5. Update bookings to reference students (was users)
-- The foreign key constraint should auto-update with table rename

-- 6. Create indexes for new tables/columns
CREATE INDEX IF NOT EXISTS idx_tas_email ON tas(email);
CREATE INDEX IF NOT EXISTS idx_tas_auth_user ON tas(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_groups_status ON booking_groups(status);
CREATE INDEX IF NOT EXISTS idx_booking_slots_ta ON booking_slots(created_by_ta_id);

-- 7. Update RLS policies for new structure
-- Drop old policies first
DROP POLICY IF EXISTS "Users can view active booking groups" ON booking_groups;
DROP POLICY IF EXISTS "Users can view active slots" ON booking_slots;
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;

-- New policies for booking_groups
CREATE POLICY "Anyone can view published booking groups"
  ON booking_groups FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can view all booking groups"
  ON booking_groups FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "TAs can view hidden and published booking groups"
  ON booking_groups FOR SELECT
  USING (
    status IN ('hidden', 'published') AND
    EXISTS (SELECT 1 FROM tas WHERE auth_user_id = auth.uid())
  );

-- New policies for booking_slots
CREATE POLICY "Students can view slots of published groups"
  ON booking_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_groups bg 
      WHERE bg.id = booking_slots.booking_group_id 
      AND bg.status = 'published'
    )
  );

CREATE POLICY "TAs can view slots of hidden and published groups"
  ON booking_slots FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "TAs can create slots for hidden groups"
  ON booking_slots FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM tas WHERE auth_user_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM booking_groups bg 
      WHERE bg.id = booking_group_id 
      AND bg.status = 'hidden'
    )
  );

CREATE POLICY "TAs can update their own slots in hidden groups"
  ON booking_slots FOR UPDATE
  USING (
    created_by_ta_id = (SELECT id FROM tas WHERE auth_user_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM booking_groups bg 
      WHERE bg.id = booking_group_id 
      AND bg.status = 'hidden'
    )
  );

CREATE POLICY "TAs can delete their own slots in hidden groups"
  ON booking_slots FOR DELETE
  USING (
    created_by_ta_id = (SELECT id FROM tas WHERE auth_user_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM booking_groups bg 
      WHERE bg.id = booking_group_id 
      AND bg.status = 'hidden'
    )
  );

CREATE POLICY "Admins can manage all slots"
  ON booking_slots FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid())
  );

-- New policies for bookings (students booking slots)
CREATE POLICY "Students can view their own bookings"
  ON bookings FOR SELECT
  USING (
    user_id IN (SELECT id FROM students WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Students can create bookings for published groups"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM booking_groups bg 
      WHERE bg.id = booking_group_id 
      AND bg.status = 'published'
    )
  );

CREATE POLICY "TAs and Admins can view all bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tas WHERE auth_user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "TAs and Admins can delete bookings"
  ON bookings FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM tas WHERE auth_user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid())
  );

-- RLS for students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage students"
  ON students FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "TAs can view students"
  ON students FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Anyone can check if student exists by email"
  ON students FOR SELECT
  USING (true);

-- RLS for tas table
ALTER TABLE tas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view TAs"
  ON tas FOR SELECT
  USING (true);

CREATE POLICY "Users can register as TA"
  ON tas FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admins can manage TAs"
  ON tas FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid())
  );
