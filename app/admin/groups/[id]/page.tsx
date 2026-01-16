import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ManageBookingGroup } from "@/components/admin/manage-booking-group"

export default async function ManageGroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const { data: admin } = await supabase.from("admins").select("*").eq("auth_user_id", user.id).single()

  if (!admin) {
    redirect("/admin/login")
  }

  const { data: bookingGroup } = await supabase.from("booking_groups").select("*").eq("id", id).single()

  if (!bookingGroup) {
    notFound()
  }

  const { data: slots } = await supabase
    .from("booking_slots")
    .select("*, ta:tas(*)")
    .eq("booking_group_id", id)
    .order("start_time", { ascending: true })

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      student:students(*),
      slot:booking_slots(*)
    `)
    .eq("booking_group_id", id)
    .order("booked_at", { ascending: false })

  const { data: tas } = await supabase.from("tas").select("*").order("name")

  const { data: allStudents } = await supabase.from("students").select("*").order("name")

  // Calculate TA stats
  const taStats = (tas || []).map((ta) => {
    const taSlots = (slots || []).filter((s) => s.ta_id === ta.id)
    const totalMinutes = taSlots.reduce((sum, slot) => {
      const start = new Date(slot.start_time)
      const end = new Date(slot.end_time)
      return sum + (end.getTime() - start.getTime()) / 60000
    }, 0)

    return {
      ...ta,
      total_minutes: totalMinutes,
      required_minutes: bookingGroup.ta_required_minutes,
      slots_count: taSlots.length,
    }
  })

  return (
    <ManageBookingGroup
      admin={admin}
      bookingGroup={bookingGroup}
      slots={slots || []}
      bookings={bookings || []}
      taStats={taStats}
      allStudents={allStudents || []}
    />
  )
}
