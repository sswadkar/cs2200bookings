import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminDashboard } from "@/components/admin/dashboard"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  let { data: admin } = await supabase.from("admins").select("*").eq("auth_user_id", user.id).single()

  if (!admin && user.email) {
    const { data: adminByEmail } = await supabase.from("admins").select("*").eq("email", user.email).single()

    if (adminByEmail) {
      await supabase.from("admins").update({ auth_user_id: user.id }).eq("id", adminByEmail.id)
      admin = adminByEmail
    }
  }

  if (!admin) {
    redirect("/admin/login")
  }

  const { data: bookingGroups } = await supabase
    .from("booking_groups")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: tas } = await supabase.from("tas").select("*").order("name")

  const { count: studentsCount } = await supabase.from("students").select("*", { count: "exact", head: true })

  const { data: recentBookings } = await supabase
    .from("bookings")
    .select(`
      *,
      student:students(*),
      slot:booking_slots(
        *,
        booking_group:booking_groups(*)
      )
    `)
    .order("booked_at", { ascending: false })
    .limit(10)

  return (
    <AdminDashboard
      admin={admin}
      bookingGroups={bookingGroups || []}
      recentBookings={recentBookings || []}
      tas={tas || []}
      studentsCount={studentsCount || 0}
    />
  )
}
