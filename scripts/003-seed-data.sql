-- Seed Data for Bookings Platform

-- Insert sample users (pre-approved)
INSERT INTO users (name, email) VALUES
  ('Alice Johnson', 'alice@example.com'),
  ('Bob Smith', 'bob@example.com'),
  ('Charlie Brown', 'charlie@example.com'),
  ('Diana Ross', 'diana@example.com'),
  ('Edward Chen', 'edward@example.com');

-- Insert sample booking groups
INSERT INTO booking_groups (id, name, description, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'CS 101 Project Demo - Spring 2026', 'Final project demonstrations for Computer Science 101', true),
  ('22222222-2222-2222-2222-222222222222', 'Web Development Showcase - Q1 2026', 'Quarterly web development project presentations', true),
  ('33333333-3333-3333-3333-333333333333', 'Machine Learning Workshop - Fall 2025', 'ML workshop demos (completed)', false);

-- Insert sample booking slots for the active booking groups
-- CS 101 Project Demo slots (future dates)
INSERT INTO booking_slots (booking_group_id, start_time, end_time, capacity, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', '2026-02-15 09:00:00-05', '2026-02-15 09:30:00-05', 1, true),
  ('11111111-1111-1111-1111-111111111111', '2026-02-15 09:30:00-05', '2026-02-15 10:00:00-05', 1, true),
  ('11111111-1111-1111-1111-111111111111', '2026-02-15 10:00:00-05', '2026-02-15 10:30:00-05', 1, true),
  ('11111111-1111-1111-1111-111111111111', '2026-02-15 10:30:00-05', '2026-02-15 11:00:00-05', 1, true),
  ('11111111-1111-1111-1111-111111111111', '2026-02-15 14:00:00-05', '2026-02-15 14:30:00-05', 1, true),
  ('11111111-1111-1111-1111-111111111111', '2026-02-15 14:30:00-05', '2026-02-15 15:00:00-05', 1, true);

-- Web Development Showcase slots
INSERT INTO booking_slots (booking_group_id, start_time, end_time, capacity, is_active) VALUES
  ('22222222-2222-2222-2222-222222222222', '2026-03-10 13:00:00-05', '2026-03-10 13:30:00-05', 2, true),
  ('22222222-2222-2222-2222-222222222222', '2026-03-10 13:30:00-05', '2026-03-10 14:00:00-05', 2, true),
  ('22222222-2222-2222-2222-222222222222', '2026-03-10 14:00:00-05', '2026-03-10 14:30:00-05', 2, true),
  ('22222222-2222-2222-2222-222222222222', '2026-03-10 14:30:00-05', '2026-03-10 15:00:00-05', 2, true);

-- Past ML Workshop slots (for history view)
INSERT INTO booking_slots (booking_group_id, start_time, end_time, capacity, is_active) VALUES
  ('33333333-3333-3333-3333-333333333333', '2025-10-01 10:00:00-05', '2025-10-01 10:30:00-05', 1, false),
  ('33333333-3333-3333-3333-333333333333', '2025-10-01 10:30:00-05', '2025-10-01 11:00:00-05', 1, false);
