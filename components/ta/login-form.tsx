"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export function TALoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("Login failed", {
          description: error.message,
        })
        setIsLoading(false)
        return
      }

      // Check if user is a TA
      const { data: ta, error: taError } = await supabase
        .from("tas")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .single()

      if (taError || !ta) {
        toast.error("Not authorized", {
          description: "You are not registered as a TA.",
        })
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      // Link auth user to TA record if not already linked
      if (!ta.auth_user_id && data.user) {
        await supabase.from("tas").update({ auth_user_id: data.user.id }).eq("id", ta.id)
      }

      toast.success("Welcome back!", {
        description: `Logged in as ${ta.name}`,
      })

      router.push("/ta/dashboard")
    } catch (err) {
      toast.error("Login failed", {
        description: "An unexpected error occurred.",
      })
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

      // Check if user is a TA first
      const { data: ta } = await supabase.from("tas").select("id").eq("email", email.toLowerCase().trim()).single()

      if (!ta) {
        toast.error("No TA account found with this email")
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
          ? `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL}/auth/reset-password?role=ta`
          : `${window.location.origin}/auth/reset-password?role=ta`,
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
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        First time?{" "}
        <Link href="/auth/set-password?role=ta" className="text-primary hover:underline">
          Set up your password
        </Link>
      </p>
    </form>
  )
}
