"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export function AdminLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (data.user) {
        const { data: admin, error: adminError } = await supabase
          .from("admins")
          .select("id, auth_user_id")
          .eq("email", email)
          .single()

        if (adminError || !admin) {
          await supabase.auth.signOut()
          toast.error("You are not authorized as an admin")
          return
        }

        if (admin.auth_user_id !== data.user.id) {
          await supabase.from("admins").update({ auth_user_id: data.user.id }).eq("id", admin.id)
        }

        toast.success("Login successful!")
        router.push("/admin/dashboard")
        router.refresh()
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first")
      return
    }

    setIsResettingPassword(true)

    try {
      const supabase = createClient()

      // Check if user is an admin first
      const { data: admin } = await supabase
        .from("admins")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .single()

      if (!admin) {
        toast.error("No admin account found with this email")
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
          ? `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL}/auth/reset-password?role=admin`
          : `${window.location.origin}/auth/reset-password?role=admin`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success("Password reset email sent!", {
        description: "Check your inbox for a link to reset your password.",
      })
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsResettingPassword(false)
    }
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResettingPassword}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {isResettingPassword ? "Sending..." : "Forgot password?"}
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            First time?{" "}
            <Link href="/auth/set-password?role=admin" className="text-primary hover:underline">
              Set up your password
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
