"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export function TALoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
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
        <Label htmlFor="password">Password</Label>
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
    </form>
  )
}
