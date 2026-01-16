"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Calendar, ArrowLeft, Plus, Trash2, LogOut, GraduationCap, Upload, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import type { Admin, Student } from "@/lib/types"

interface StudentsManagementProps {
  admin: Admin
  students: Student[]
}

export function StudentsManagement({ admin, students: initialStudents }: StudentsManagementProps) {
  const [students, setStudents] = useState(initialStudents)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [bulkData, setBulkData] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("students")
      .insert({
        name: newName.trim(),
        email: newEmail.toLowerCase().trim(),
      })
      .select()
      .single()

    if (error) {
      toast.error("Failed to add student", {
        description: error.code === "23505" ? "A student with this email already exists" : error.message,
      })
    } else {
      toast.success("Student added")
      setStudents([...students, data])
      setNewName("")
      setNewEmail("")
      setShowAddDialog(false)
    }

    setIsLoading(false)
  }

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Parse CSV-like data: "Name, Email" per line
    const lines = bulkData.split("\n").filter((line) => line.trim())
    const studentsToAdd: { name: string; email: string }[] = []

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim())
      if (parts.length >= 2) {
        studentsToAdd.push({
          name: parts[0],
          email: parts[1].toLowerCase(),
        })
      }
    }

    if (studentsToAdd.length === 0) {
      toast.error("No valid entries found", {
        description: "Use format: Name, Email (one per line)",
      })
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.from("students").insert(studentsToAdd).select()

    if (error) {
      toast.error("Failed to add some students", {
        description: error.message,
      })
    } else {
      toast.success(`Added ${data.length} students`)
      setStudents([...students, ...data])
      setBulkData("")
      setShowBulkDialog(false)
    }

    setIsLoading(false)
  }

  const handleDeleteStudent = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("students").delete().eq("id", id)

    if (error) {
      toast.error("Failed to delete student")
    } else {
      toast.success("Student deleted")
      setStudents(students.filter((s) => s.id !== id))
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">CS 2200 Bookings</span>
            <Badge variant="secondary" className="ml-2">
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{admin.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Student Management</h1>
            <p className="text-muted-foreground">{students.length} students registered</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Add
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Students
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {searchQuery ? "No students match your search" : "No students yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Student?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {student.name} and all their bookings.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteStudent(student.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Single Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStudent}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@student.edu"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Add Students</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkAdd}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bulk">Student List</Label>
                <Textarea
                  id="bulk"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="John Doe, john@student.edu&#10;Jane Smith, jane@student.edu"
                  rows={10}
                  required
                />
                <p className="text-xs text-muted-foreground">Format: Name, Email (one student per line)</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBulkDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Students"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
