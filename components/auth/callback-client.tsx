"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AuthCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get("role") || "admin"
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()

        // Get the session - Supabase handles the token exchange from URL
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setErrorMessage("Failed to authenticate. The link may have expired.")
          setStatus("error")
          return
        }

        const email = session.user.email

        if (!email) {
          setErrorMessage("No email found in session")
          setStatus("error")
          return
        }

        // Verify the user belongs to the correct role
        if (role === "admin") {
          const { data: admin, error: adminError } = await supabase
            .from("admins")
            .select("id, auth_user_id")
            .eq("email", email.toLowerCase().trim())
            .single()

          if (adminError || !admin) {
            await supabase.auth.signOut()
            setErrorMessage("You are not authorized as an admin")
            setStatus("error")
            return
          }

          // Link auth user to admin record if not already linked
          if (admin.auth_user_id !== session.user.id) {
            await supabase.from("admins").update({ auth_user_id: session.user.id }).eq("id", admin.id)
          }

          setStatus("success")
          toast.success("Login successful!")

          setTimeout(() => {
            router.push("/admin/dashboard")
            router.refresh()
          }, 1000)
        } else if (role === "ta") {
          const { data: ta, error: taError } = await supabase
            .from("tas")
            .select("id, auth_user_id, name")
            .eq("email", email.toLowerCase().trim())
            .single()

          if (taError || !ta) {
            await supabase.auth.signOut()
            setErrorMessage("You are not registered as a TA")
            setStatus("error")
            return
          }

          // Link auth user to TA record if not already linked
          if (ta.auth_user_id !== session.user.id) {
            await supabase.from("tas").update({ auth_user_id: session.user.id }).eq("id", ta.id)
          }

          setStatus("success")
          toast.success(`Welcome back, ${ta.name}!`)

          setTimeout(() => {
            router.push("/ta/dashboard")
            router.refresh()
          }, 1000)
        }
      } catch {
        setErrorMessage("An unexpected error occurred")
        setStatus("error")
      }
    }

    handleCallback()
  }, [role, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="rounded-full bg-red-100 p-3 w-fit mx-auto">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold">Authentication Failed</h2>
          <p className="text-muted-foreground">{errorMessage}</p>
          <Button onClick={() => router.push(role === "admin" ? "/admin/login" : "/ta/login")}>Back to Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="rounded-full bg-green-100 p-3 w-fit mx-auto">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold">Login Successful!</h2>
        <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
      </div>
    </div>
  )
}
