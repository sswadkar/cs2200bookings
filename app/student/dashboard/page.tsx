"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, LogOut, Clock, CheckCircle, Lock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import type { BookingGroup, Booking, Student } from "@/lib/types"
import { formatDate, formatTime } from "@/lib/utils/date"

export default function StudentDashboardPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [bookingGroups, setBookingGroups] = useState<BookingGroup[]>([])
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const session = localStorage.getItem("student_session")
    if (!session) {
      router.push("/student/login")
      return
    }

    const studentData = JSON.parse(session)
    setStudent(studentData)
    loadData(studentData.id)
  }, [router])

  async function loadData(studentId: string) {
    const supabase = createClient()

    const { data: groups } = await supabase
      .from("booking_groups")
      .select("*")
      .in("status", ["published", "locked"])
      .order("name")

    // Load student's bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, slot:booking_slots(*, booking_group:booking_groups(*))")
      .eq("student_id", studentId)
      .order("booked_at", { ascending: false })

    setBookingGroups(groups || [])
    setMyBookings(bookings || [])
    setIsLoading(false)
  }

  function handleLogout() {
    localStorage.removeItem("student_session")
    router.push("/")
  }

  function getBookingForGroup(groupId: string): Booking | undefined {
    return myBookings.find((b) => b.booking_group_id === groupId)
  }

  if (isLoading || !student) {
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
            <span className="text-sm text-muted-foreground">{student.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Browse available demo slots and manage your bookings.</p>

        {/* My Bookings */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">My Bookings</h2>
          {myBookings.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">You have no bookings yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myBookings.map((booking) => {
                const isLocked = booking.slot?.booking_group?.status === "locked"
                return (
                  <Card key={booking.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{booking.slot?.booking_group?.name || "Demo"}</CardTitle>
                        <Badge variant={isLocked ? "destructive" : "secondary"} className="gap-1">
                          {isLocked ? <Lock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                          {isLocked ? "Locked" : "Booked"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {booking.slot
                            ? `${formatDate(booking.slot.start_time)} at ${formatTime(booking.slot.start_time)}`
                            : "Time TBD"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* Available Booking Groups */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-foreground">Available Demos</h2>
          {bookingGroups.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No demos are currently available for booking.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bookingGroups.map((group) => {
                const booking = getBookingForGroup(group.id)
                const hasBooked = !!booking
                const isLocked = group.status === "locked"

                return (
                  <Card key={group.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        {isLocked && (
                          <Badge variant="destructive" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        )}
                      </div>
                      {group.description && <CardDescription>{group.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      {hasBooked ? (
                        <div className="space-y-2">
                          <Badge variant="outline" className="w-full justify-center gap-1 py-2">
                            <CheckCircle className="h-3 w-3" />
                            Already Booked
                          </Badge>
                          {!isLocked && (
                            <Link href={`/student/book/${group.slug}`}>
                              <Button variant="ghost" size="sm" className="w-full">
                                View / Reschedule
                              </Button>
                            </Link>
                          )}
                        </div>
                      ) : isLocked ? (
                        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-center">
                          <AlertTriangle className="mx-auto h-5 w-5 text-amber-600" />
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Booking closed - contact TA</p>
                        </div>
                      ) : (
                        <Link href={`/student/book/${group.slug}`}>
                          <Button className="w-full">View Slots</Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
