import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudentsManagement } from "@/components/admin/students-management"

export default async function StudentsPage() {
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

  const { data: students } = await supabase.from("students").select("*").order("name")

  return <StudentsManagement admin={admin} students={students || []} />
}
