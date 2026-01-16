-- Fix RLS policy to allow new users to register as admins
-- The current policy requires is_admin() which fails for new registrations

-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Admins can insert admins" ON admins;

-- Create a new policy that allows a user to insert their own admin record
-- This checks that the auth_user_id matches the current user's ID
CREATE POLICY "Users can register as admin" ON admins
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Also allow admins to view their own record (needed for auth checks)
DROP POLICY IF EXISTS "Admins can view all admins" ON admins;

CREATE POLICY "Admins can view their own record" ON admins
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all admins if admin" ON admins
  FOR SELECT USING (is_admin());
