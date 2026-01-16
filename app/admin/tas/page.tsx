import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TAsManagement } from "@/components/admin/tas-management"

export default async function TAsPage() {
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

  const { data: tas } = await supabase.from("tas").select("*").order("name")

  return <TAsManagement admin={admin} tas={tas || []} />
}
