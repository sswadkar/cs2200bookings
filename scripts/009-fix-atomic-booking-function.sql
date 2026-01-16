-- Fix the atomic booking function to run with elevated privileges
-- The function needs SECURITY DEFINER to bypass RLS since students 
-- can't directly query booking_slots

DROP FUNCTION IF EXISTS create_booking_atomic(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_booking_slot_id UUID,
  p_booking_group_id UUID,
  p_student_id UUID
) RETURNS JSON 
SECURITY DEFINER  -- Run with function owner's privileges, not caller's
SET search_path = public  -- Security best practice when using SECURITY DEFINER
AS $$
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

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION create_booking_atomic(UUID, UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION create_booking_atomic(UUID, UUID, UUID) TO authenticated;
