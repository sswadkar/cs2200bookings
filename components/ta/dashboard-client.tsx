"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, LogOut, Clock, Plus, AlertCircle, CheckCircle, Users, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import type { TA, BookingGroup, BookingSlot, Student } from "@/lib/types"
import { formatDate, formatTime } from "@/lib/utils/date"

interface GroupWithProgress extends BookingGroup {
  my_minutes: number
  my_slots: BookingSlot[]
}

export function TADashboardClient() {
  const [ta, setTA] = useState<TA | null>(null)
  const [groups, setGroups] = useState<GroupWithProgress[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [studentSearch, setStudentSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/ta/login")
      return
    }

    // Get TA record
    const { data: taData } = await supabase.from("tas").select("*").eq("auth_user_id", user.id).single()

    if (!taData) {
      router.push("/ta/login")
      return
    }

    setTA(taData)
    await loadData(taData.id)
  }

  async function loadData(taId: string) {
    const supabase = createClient()

    // Get all non-inactive booking groups (hidden + published for TAs)
    const { data: groupsData } = await supabase
      .from("booking_groups")
      .select("*")
      .in("status", ["hidden", "published"])
      .order("created_at", { ascending: false })

    // For each group, get TA's slots and calculate minutes
    const groupsWithProgress = await Promise.all(
      (groupsData || []).map(async (group) => {
        const { data: slots } = await supabase
          .from("booking_slots")
          .select("*")
          .eq("booking_group_id", group.id)
          .eq("ta_id", taId)
          .order("start_time")

        const myMinutes = (slots || []).reduce((total, slot) => {
          const start = new Date(slot.start_time)
          const end = new Date(slot.end_time)
          return total + (end.getTime() - start.getTime()) / 60000
        }, 0)

        return {
          ...group,
          my_minutes: myMinutes,
          my_slots: slots || [],
        }
      }),
    )

    // Load all students (read-only for TAs)
    const { data: studentsData } = await supabase.from("students").select("*").order("name")

    setGroups(groupsWithProgress)
    setStudents(studentsData || [])
    setIsLoading(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const filteredStudents = students.filter((student) => {
    if (!studentSearch.trim()) return true
    const search = studentSearch.toLowerCase()
    return student.name.toLowerCase().includes(search) || student.email.toLowerCase().includes(search)
  })

  if (isLoading || !ta) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">CS 2200 Bookings</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{ta.name} (TA)</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground">TA Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Manage your demo slots and track your hour requirements.</p>

        <Tabs defaultValue="groups" className="mt-8">
          <TabsList>
            <TabsTrigger value="groups">Booking Groups</TabsTrigger>
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="mt-6">
            {groups.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No booking groups available.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {groups.map((group) => {
                  const progress =
                    group.ta_required_minutes > 0
                      ? Math.min(100, (group.my_minutes / group.ta_required_minutes) * 100)
                      : 100
                  const isComplete = group.my_minutes >= group.ta_required_minutes
                  const canEdit = group.status === "hidden"

                  return (
                    <Card key={group.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle>{group.name}</CardTitle>
                              <Badge
                                variant={
                                  group.status === "hidden"
                                    ? "secondary"
                                    : group.status === "published"
                                      ? "default"
                                      : "outline"
                                }
                              >
                                {group.status}
                              </Badge>
                            </div>
                            {group.description && (
                              <CardDescription className="mt-1">{group.description}</CardDescription>
                            )}
                          </div>
                          {canEdit && (
                            <Link href={`/ta/groups/${group.id}/slots`}>
                              <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Slots
                              </Button>
                            </Link>
                          )}
                          {group.status === "published" && (
                            <Link href={`/ta/groups/${group.id}/slots`}>
                              <Button variant="outline">
                                <Users className="mr-2 h-4 w-4" />
                                View Breakdown
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Hour requirement progress */}
                        {group.ta_required_minutes > 0 && (
                          <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                {isComplete ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                )}
                                Hour Requirement
                              </span>
                              <span className="font-medium">
                                {Math.round(group.my_minutes)} / {group.ta_required_minutes} min
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}

                        {/* Date range info */}
                        {group.date_range_start && group.date_range_end && (
                          <p className="mb-4 text-sm text-muted-foreground">
                            <Clock className="mr-2 inline-block h-4 w-4" />
                            {formatDate(group.date_range_start)} - {formatDate(group.date_range_end)},{" "}
                            {group.daily_start_time?.slice(0, 5)} - {group.daily_end_time?.slice(0, 5)}
                          </p>
                        )}

                        {/* My slots */}
                        {group.my_slots.length > 0 ? (
                          <div>
                            <h4 className="mb-2 text-sm font-medium">Your Slots ({group.my_slots.length})</h4>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {group.my_slots.slice(0, 6).map((slot) => (
                                <div
                                  key={slot.id}
                                  className="rounded border border-border bg-muted/50 px-3 py-2 text-sm"
                                >
                                  {formatDate(slot.start_time)} {formatTime(slot.start_time)}
                                </div>
                              ))}
                              {group.my_slots.length > 6 && (
                                <div className="flex items-center justify-center rounded border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                                  +{group.my_slots.length - 6} more
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {canEdit
                              ? "You haven't added any slots yet."
                              : "No slots added. The group is now published - contact an admin to make changes."}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Students
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-64 pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">
                      {studentSearch ? "No students match your search" : "No students registered yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
