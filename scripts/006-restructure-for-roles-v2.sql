-- ============================================
-- RESTRUCTURE DATABASE FOR ROLE-BASED SYSTEM
-- ============================================

-- Step 1: Drop ALL existing policies on all tables first
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Step 2: Drop the old is_admin function
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- ============================================
-- CREATE TAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  auth_user_id UUID UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RENAME USERS TABLE TO STUDENTS
-- ============================================
ALTER TABLE IF EXISTS users RENAME TO students;

-- ============================================
-- MODIFY BOOKING_GROUPS TABLE
-- ============================================

-- Add new columns for booking group configuration
ALTER TABLE booking_groups 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'hidden' CHECK (status IN ('hidden', 'published', 'inactive')),
  ADD COLUMN IF NOT EXISTS ta_required_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_range_start DATE,
  ADD COLUMN IF NOT EXISTS date_range_end DATE,
  ADD COLUMN IF NOT EXISTS daily_start_time TIME DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS daily_end_time TIME DEFAULT '17:00';

-- Now drop the is_active column (policies already dropped)
ALTER TABLE booking_groups DROP COLUMN IF EXISTS is_active;

-- ============================================
-- MODIFY BOOKING_SLOTS TABLE
-- ============================================

-- Add TA reference to slots
ALTER TABLE booking_slots 
  ADD COLUMN IF NOT EXISTS ta_id UUID REFERENCES tas(id) ON DELETE CASCADE;

-- Drop is_active if it exists (policies already dropped)
ALTER TABLE booking_slots DROP COLUMN IF EXISTS is_active;

-- ============================================
-- MODIFY BOOKINGS TABLE
-- ============================================

-- Update foreign key reference from user_id to student_id
ALTER TABLE bookings RENAME COLUMN user_id TO student_id;

-- ============================================
-- CREATE HELPER FUNCTIONS
-- ============================================

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is a TA
CREATE OR REPLACE FUNCTION is_ta()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tas WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current TA's ID
CREATE OR REPLACE FUNCTION get_ta_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM tas WHERE auth_user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tas ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - ADMINS TABLE
-- ============================================
CREATE POLICY "Admins can view all admins" ON admins
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can register as admin" ON admins
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Admins can delete admins" ON admins
  FOR DELETE USING (is_admin());

-- ============================================
-- RLS POLICIES - TAS TABLE
-- ============================================
CREATE POLICY "Admins can manage TAs" ON tas
  FOR ALL USING (is_admin());

CREATE POLICY "TAs can view all TAs" ON tas
  FOR SELECT USING (is_ta());

CREATE POLICY "TAs can view their own record" ON tas
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Anyone can view TAs for login" ON tas
  FOR SELECT USING (true);

-- ============================================
-- RLS POLICIES - STUDENTS TABLE
-- ============================================
CREATE POLICY "Admins can manage students" ON students
  FOR ALL USING (is_admin());

CREATE POLICY "TAs can view students" ON students
  FOR SELECT USING (is_ta());

CREATE POLICY "Anyone can view students for login" ON students
  FOR SELECT USING (true);

-- ============================================
-- RLS POLICIES - BOOKING_GROUPS TABLE
-- ============================================
-- Admins can do everything
CREATE POLICY "Admins can manage booking groups" ON booking_groups
  FOR ALL USING (is_admin());

-- TAs can view hidden and published groups
CREATE POLICY "TAs can view non-inactive groups" ON booking_groups
  FOR SELECT USING (is_ta() AND status IN ('hidden', 'published'));

-- Students can only view published groups
CREATE POLICY "Students can view published groups" ON booking_groups
  FOR SELECT USING (status = 'published');

-- ============================================
-- RLS POLICIES - BOOKING_SLOTS TABLE
-- ============================================
-- Admins can do everything
CREATE POLICY "Admins can manage slots" ON booking_slots
  FOR ALL USING (is_admin());

-- TAs can view all slots
CREATE POLICY "TAs can view all slots" ON booking_slots
  FOR SELECT USING (is_ta());

-- TAs can insert their own slots (only in hidden groups)
CREATE POLICY "TAs can insert own slots in hidden groups" ON booking_slots
  FOR INSERT WITH CHECK (
    is_ta() 
    AND ta_id = get_ta_id()
    AND EXISTS (
      SELECT 1 FROM booking_groups 
      WHERE id = booking_group_id AND status = 'hidden'
    )
  );

-- TAs can update their own slots (only in hidden groups)
CREATE POLICY "TAs can update own slots in hidden groups" ON booking_slots
  FOR UPDATE USING (
    is_ta() 
    AND ta_id = get_ta_id()
    AND EXISTS (
      SELECT 1 FROM booking_groups 
      WHERE id = booking_group_id AND status = 'hidden'
    )
  );

-- TAs can delete their own slots (only in hidden groups)
CREATE POLICY "TAs can delete own slots in hidden groups" ON booking_slots
  FOR DELETE USING (
    is_ta() 
    AND ta_id = get_ta_id()
    AND EXISTS (
      SELECT 1 FROM booking_groups 
      WHERE id = booking_group_id AND status = 'hidden'
    )
  );

-- Students can view slots from published groups
CREATE POLICY "Students can view published slots" ON booking_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM booking_groups 
      WHERE id = booking_group_id AND status = 'published'
    )
  );

-- ============================================
-- RLS POLICIES - BOOKINGS TABLE
-- ============================================
-- Admins can do everything
CREATE POLICY "Admins can manage bookings" ON bookings
  FOR ALL USING (is_admin());

-- TAs can view bookings for their slots
CREATE POLICY "TAs can view bookings for their slots" ON bookings
  FOR SELECT USING (
    is_ta() AND EXISTS (
      SELECT 1 FROM booking_slots 
      WHERE id = booking_slot_id AND ta_id = get_ta_id()
    )
  );

-- TAs can delete bookings (to allow students to rebook)
CREATE POLICY "TAs can delete bookings for their slots" ON bookings
  FOR DELETE USING (
    is_ta() AND EXISTS (
      SELECT 1 FROM booking_slots 
      WHERE id = booking_slot_id AND ta_id = get_ta_id()
    )
  );

-- Students can view their own bookings
CREATE POLICY "Students can view own bookings" ON bookings
  FOR SELECT USING (true);

-- Students can create bookings in published groups
CREATE POLICY "Students can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM booking_slots bs
      JOIN booking_groups bg ON bs.booking_group_id = bg.id
      WHERE bs.id = booking_slot_id AND bg.status = 'published'
    )
  );

-- ============================================
-- CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tas_email ON tas(email);
CREATE INDEX IF NOT EXISTS idx_tas_auth_user_id ON tas(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_groups_status ON booking_groups(status);
CREATE INDEX IF NOT EXISTS idx_booking_slots_ta_id ON booking_slots(ta_id);
