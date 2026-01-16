-- Seed data for the new role-based structure

-- Insert sample TAs (will need to be linked to Supabase Auth users)
INSERT INTO tas (id, auth_user_id, name, email) VALUES
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'TA Jane', 'ta@example.com')
ON CONFLICT (id) DO NOTHING;

-- Insert sample students (renamed from users)
INSERT INTO students (id, name, email) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Alice Student', 'alice@student.edu'),
  ('44444444-4444-4444-4444-444444444444', 'Bob Student', 'bob@student.edu'),
  ('55555555-5555-5555-5555-555555555555', 'Carol Student', 'carol@student.edu')
ON CONFLICT (id) DO NOTHING;

-- Fixed column names to match migration schema
-- Update existing booking group with new fields
UPDATE booking_groups 
SET 
  status = 'hidden',
  ta_required_minutes = 120, -- 2 hours in minutes
  date_range_start = CURRENT_DATE,
  date_range_end = CURRENT_DATE + INTERVAL '14 days',
  daily_start_time = '09:00:00',
  daily_end_time = '17:00:00'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Fixed column name from created_by_ta_id to ta_id
-- Update existing slots to have TA reference
UPDATE booking_slots 
SET ta_id = '22222222-2222-2222-2222-222222222222'
WHERE booking_group_id = '11111111-1111-1111-1111-111111111111';
