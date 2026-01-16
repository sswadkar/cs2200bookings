"use client"

import type React from "react"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Mail, CheckCircle } from "lucide-react"

export function TALoginForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data: ta, error: taError } = await supabase
        .from("tas")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .single()

      if (taError || !ta) {
        toast.error("No TA account found with this email")
        setIsLoading(false)
        return
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
            ? `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL}/auth/callback?role=ta`
            : `${window.location.origin}/auth/callback?role=ta`,
        },
      })

      if (error) {
        toast.error("Failed to send magic link", {
          description: error.message,
        })
        setIsLoading(false)
        return
      }

      setEmailSent(true)
      toast.success("Magic link sent!", {
        description: "Check your email for a login link.",
      })
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Check your email</h3>
          <p className="text-sm text-muted-foreground">
            We sent a magic link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">Click the link in the email to sign in.</p>
        </div>
        <Button variant="outline" onClick={() => setEmailSent(false)} className="mt-4">
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="ta@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <p className="text-sm text-muted-foreground">We'll send you a magic link to sign in - no password needed.</p>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending link...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Magic Link
          </>
        )}
      </Button>
    </form>
  )
}
