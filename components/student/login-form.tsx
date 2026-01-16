"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export function StudentLoginForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Check if student exists with exact name and email match
      const { data: student, error } = await supabase
        .from("students")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("name", name.trim())
        .single()

      if (error || !student) {
        toast.error("Invalid credentials", {
          description: "No student found with that name and email combination.",
        })
        setIsLoading(false)
        return
      }

      // Store student info in localStorage for session
      localStorage.setItem(
        "student_session",
        JSON.stringify({
          id: student.id,
          name: student.name,
          email: student.email,
        }),
      )

      toast.success("Welcome back!", {
        description: `Logged in as ${student.name}`,
      })

      router.push("/student/dashboard")
    } catch (err) {
      toast.error("Login failed", {
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  )
}
