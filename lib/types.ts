export interface Admin {
  id: string
  auth_user_id: string | null
  email: string
  name: string
  created_at: string
}

export interface TA {
  id: string
  auth_user_id: string | null
  email: string
  name: string
  created_at: string
}

export interface Student {
  id: string
  email: string
  name: string
  created_at: string
}

export type BookingGroupStatus = "hidden" | "published" | "locked" | "inactive"

export interface BookingGroup {
  id: string
  name: string
  description: string | null
  slug: string
  status: BookingGroupStatus
  ta_required_minutes: number
  date_range_start: string | null
  date_range_end: string | null
  daily_start_time: string
  daily_end_time: string
  created_at: string
}

export interface BookingSlot {
  id: string
  booking_group_id: string
  start_time: string
  end_time: string
  capacity: number
  ta_id: string | null
  created_at: string
  ta?: TA
  booking_group?: BookingGroup
}

export interface Booking {
  id: string
  booking_slot_id: string
  booking_group_id: string
  student_id: string
  booked_at: string
  student?: Student
  slot?: BookingSlot
}

export interface TAWithStats extends TA {
  total_minutes: number
  required_minutes: number
  slots_count: number
}
