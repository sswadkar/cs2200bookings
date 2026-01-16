"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Mail, CheckCircle } from "lucide-react"

export function AdminLoginForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .single()

      if (adminError || !admin) {
        toast.error("No admin account found with this email")
        setIsLoading(false)
        return
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
            ? `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL}/auth/callback?role=admin`
            : `${window.location.origin}/auth/callback?role=admin`,
        },
      })

      if (error) {
        toast.error(error.message)
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
      <Card className="border-border">
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <p className="text-sm text-muted-foreground">We'll send you a magic link to sign in - no password needed.</p>
        </CardContent>
        <CardFooter>
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
        </CardFooter>
      </form>
    </Card>
  )
}
