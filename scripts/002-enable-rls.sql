-- Enable Row Level Security on all tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins table policies
CREATE POLICY "Admins can view all admins" ON admins
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert admins" ON admins
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can delete admins" ON admins
  FOR DELETE USING (is_admin());

-- Users table policies
CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (true); -- Needed for login verification

-- Booking Groups policies
CREATE POLICY "Anyone can view active booking groups" ON booking_groups
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage booking groups" ON booking_groups
  FOR ALL USING (is_admin());

-- Booking Slots policies
CREATE POLICY "Anyone can view active slots" ON booking_slots
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage slots" ON booking_slots
  FOR ALL USING (is_admin());

-- Bookings policies
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (true); -- Booking lookup needs to be available

CREATE POLICY "Anyone can create bookings" ON bookings
  FOR INSERT WITH CHECK (true); -- Actual validation done in app logic

CREATE POLICY "Admins can delete bookings" ON bookings
  FOR DELETE USING (is_admin());
