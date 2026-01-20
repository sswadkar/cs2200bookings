create or replace function public.cancel_booking_atomic(
  p_booking_id uuid,
  p_student_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from bookings
  where id = p_booking_id
    and student_id = p_student_id;
end;
