-- Create an atomic booking function that prevents race conditions
-- This function checks capacity and creates the booking in a single transaction with row locking

CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_booking_slot_id UUID,
  p_booking_group_id UUID,
  p_student_id UUID
) RETURNS JSON AS $$
DECLARE
  v_slot RECORD;
  v_current_count INTEGER;
  v_existing_booking RECORD;
  v_new_booking RECORD;
BEGIN
  -- First check if student already has a booking for this group
  SELECT * INTO v_existing_booking
  FROM bookings
  WHERE student_id = p_student_id
    AND booking_group_id = p_booking_group_id
  LIMIT 1;

  IF v_existing_booking.id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ALREADY_BOOKED',
      'message', 'You already have a booking for this demo group'
    );
  END IF;

  -- Lock the slot row to prevent concurrent modifications
  SELECT * INTO v_slot
  FROM booking_slots
  WHERE id = p_booking_slot_id
  FOR UPDATE;

  IF v_slot.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'SLOT_NOT_FOUND',
      'message', 'The selected slot no longer exists'
    );
  END IF;

  -- Count current bookings for this slot
  SELECT COUNT(*) INTO v_current_count
  FROM bookings
  WHERE booking_slot_id = p_booking_slot_id;

  -- Check if slot is full
  IF v_current_count >= v_slot.capacity THEN
    RETURN json_build_object(
      'success', false,
      'error', 'SLOT_FULL',
      'message', 'This slot is now full. Please select another slot.'
    );
  END IF;

  -- Create the booking
  INSERT INTO bookings (booking_slot_id, booking_group_id, student_id)
  VALUES (p_booking_slot_id, p_booking_group_id, p_student_id)
  RETURNING * INTO v_new_booking;

  RETURN json_build_object(
    'success', true,
    'booking_id', v_new_booking.id,
    'message', 'Booking created successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Also add a unique constraint to prevent duplicate bookings per student per group
-- (in case the function check is somehow bypassed)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS unique_student_booking_per_group;
ALTER TABLE bookings ADD CONSTRAINT unique_student_booking_per_group 
  UNIQUE (student_id, booking_group_id);
