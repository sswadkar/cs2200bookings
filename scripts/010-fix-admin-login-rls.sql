-- ============================================
-- FIX ADMIN LOGIN RLS POLICY
-- ============================================
-- Allow anyone to check if an email exists in admins table (for login)

CREATE POLICY "Anyone can view admins for login" ON admins
  FOR SELECT USING (true);
