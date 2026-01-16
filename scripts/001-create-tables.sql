-- Bookings Platform Database Schema
-- All times are stored in EST timezone

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admins table (separate from Supabase auth users for admin-specific data)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL, -- References Supabase auth.users
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (pre-approved users who can book demos)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking Groups table (e.g., "CS Project Demo – Fall 2026")
CREATE TABLE booking_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking Slots table (individual demo time slots)
CREATE TABLE booking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_group_id UUID NOT NULL REFERENCES booking_groups(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  capacity INTEGER DEFAULT 1 CHECK (capacity >= 1),
  created_by UUID REFERENCES admins(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Bookings table (user bookings for slots)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_group_id UUID NOT NULL REFERENCES booking_groups(id) ON DELETE CASCADE,
  booking_slot_id UUID NOT NULL REFERENCES booking_slots(id) ON DELETE CASCADE,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one booking per user per booking group
  UNIQUE (user_id, booking_group_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_booking_slots_group ON booking_slots(booking_group_id);
CREATE INDEX idx_booking_slots_active ON booking_slots(is_active);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_slot ON bookings(booking_slot_id);
CREATE INDEX idx_bookings_group ON bookings(booking_group_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_auth_user ON admins(auth_user_id);
