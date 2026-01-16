"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Calendar, ArrowLeft, Clock, User, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import type { BookingGroup, BookingSlot, Student, Booking } from "@/lib/types"
import { formatTime, formatDate, isSameDay, getCalendarDays } from "@/lib/utils/date"
import { cn } from "@/lib/utils"

interface SlotWithCount extends BookingSlot {
  bookings_count: number
  ta?: { name: string }
}

export default function StudentBookingPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [student, setStudent] = useState<Student | null>(null)
  const [bookingGroup, setBookingGroup] = useState<BookingGroup | null>(null)
  const [slots, setSlots] = useState<SlotWithCount[]>([])
  const [existingBooking, setExistingBooking] = useState<Booking | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    const session = localStorage.getItem("student_session")
    if (!session) {
      router.push("/student/login")
      return
    }

    const studentData = JSON.parse(session)
    setStudent(studentData)
    loadData(studentData.id)
  }, [router, slug])

  async function loadData(studentId: string) {
    const supabase = createClient()

    // Load booking group
    const { data: group } = await supabase
      .from("booking_groups")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single()

    if (!group) {
      router.push("/student/dashboard")
      return
    }

    setBookingGroup(group)

    // Check if student already has a booking for this group
    const { data: existing } = await supabase
      .from("bookings")
      .select("*, slot:booking_slots(*)")
      .eq("student_id", studentId)
      .eq("booking_group_id", group.id)
      .single()

    if (existing) {
      setExistingBooking(existing)
      setIsLoading(false)
      return
    }

    // Load available slots with booking counts
    const { data: slotsData } = await supabase
      .from("booking_slots")
      .select("*, ta:tas(name)")
      .eq("booking_group_id", group.id)
      .gte("start_time", new Date().toISOString())
      .order("start_time")

    // Get booking counts for each slot
    const slotsWithCounts = await Promise.all(
      (slotsData || []).map(async (slot) => {
        const { count } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("booking_slot_id", slot.id)

        return { ...slot, bookings_count: count || 0 }
      }),
    )

    // Filter to only show slots with available capacity
    const availableSlots = slotsWithCounts.filter((s) => s.bookings_count < s.capacity)
    setSlots(availableSlots)

    // Set initial selected date to first available slot date
    if (availableSlots.length > 0) {
      const firstSlotDate = new Date(availableSlots[0].start_time)
      setSelectedDate(firstSlotDate)
      setCurrentMonth(new Date(firstSlotDate.getFullYear(), firstSlotDate.getMonth(), 1))
    }

    setIsLoading(false)
  }

  const datesWithSlots = useMemo(() => {
    const dates = new Map<string, number>()
    slots.forEach((slot) => {
      const dateKey = new Date(slot.start_time).toDateString()
      dates.set(dateKey, (dates.get(dateKey) || 0) + 1)
    })
    return dates
  }, [slots])

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    return slots.filter((slot) => isSameDay(new Date(slot.start_time), selectedDate))
  }, [slots, selectedDate])

  const calendarDays = useMemo(() => {
    return getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth())
  }, [currentMonth])

  async function handleBookSlot(slotId: string) {
    if (!student || !bookingGroup) return

    setBookingSlotId(slotId)
    const supabase = createClient()

    // Use atomic database function to prevent race conditions
    const { data, error } = await supabase.rpc("create_booking_atomic", {
      p_booking_slot_id: slotId,
      p_booking_group_id: bookingGroup.id,
      p_student_id: student.id,
    })

    if (error) {
      toast.error("Booking failed", {
        description: "An unexpected error occurred. Please try again.",
      })
      setBookingSlotId(null)
      return
    }

    const result = data as { success: boolean; error?: string; message: string }

    if (!result.success) {
      if (result.error === "ALREADY_BOOKED") {
        toast.error("Already booked", {
          description: result.message,
        })
        // Reload to show existing booking
        loadData(student.id)
      } else if (result.error === "SLOT_FULL") {
        toast.error("Slot full", {
          description: result.message,
        })
        // Reload to refresh slot availability
        loadData(student.id)
      } else {
        toast.error("Booking failed", {
          description: result.message,
        })
      }
      setBookingSlotId(null)
      return
    }

    toast.success("Booking confirmed!", {
      description: "Your demo slot has been reserved.",
    })

    router.push("/student/dashboard")
  }

  function navigateMonth(direction: "prev" | "next") {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev)
      if (direction === "prev") {
        newMonth.setMonth(newMonth.getMonth() - 1)
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1)
      }
      return newMonth
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (existingBooking) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-foreground">CS 2200 Bookings</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="rounded-lg border border-border bg-card p-8">
            <Calendar className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Already Booked</h1>
            <p className="mt-4 text-muted-foreground">
              You already have a booking for <span className="font-medium">{bookingGroup?.name}</span>.
            </p>
            {existingBooking.slot && (
              <div className="mt-4 rounded-lg bg-muted p-4">
                <p className="font-medium text-foreground">{formatDate(existingBooking.slot.start_time)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(existingBooking.slot.start_time)} - {formatTime(existingBooking.slot.end_time)}
                </p>
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              If you need to change your slot, please contact a TA to delete your existing booking first.
            </p>
            <Link href="/student/dashboard">
              <Button className="mt-6">Back to Dashboard</Button>
            </Link>
          </div>
        </main>
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link
          href="/student/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold text-foreground">{bookingGroup?.name}</h1>
        {bookingGroup?.description && <p className="mt-2 text-muted-foreground">{bookingGroup.description}</p>}

        {slots.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No slots are currently available. Please check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Select a Date</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-32 text-center font-medium">
                      {currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                    const dateKey = day.toDateString()
                    const slotCount = datesWithSlots.get(dateKey) || 0
                    const hasSlots = slotCount > 0
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const isToday = isSameDay(day, new Date())

                    return (
                      <button
                        key={index}
                        onClick={() => hasSlots && setSelectedDate(day)}
                        disabled={!hasSlots}
                        className={cn(
                          "relative flex h-12 flex-col items-center justify-center rounded-lg text-sm transition-colors",
                          isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                          hasSlots && "cursor-pointer hover:bg-muted",
                          isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                          isToday && !isSelected && "ring-1 ring-primary",
                          !hasSlots && "cursor-default opacity-50",
                        )}
                      >
                        <span>{day.getDate()}</span>
                        {hasSlots && (
                          <span
                            className={cn(
                              "absolute bottom-1 text-[10px]",
                              isSelected ? "text-primary-foreground" : "text-primary",
                            )}
                          >
                            {slotCount} slot{slotCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Time Slots for Selected Date */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? (
                    <>Available Slots for {formatDate(selectedDate.toISOString())}</>
                  ) : (
                    <>Select a Date</>
                  )}
                </CardTitle>
                <CardDescription>
                  {slotsForSelectedDate.length > 0
                    ? `${slotsForSelectedDate.length} slot${slotsForSelectedDate.length > 1 ? "s" : ""} available`
                    : "Click on a highlighted date to see available slots"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slotsForSelectedDate.length === 0 ? (
                  <div className="py-8 text-center">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      {selectedDate
                        ? "No slots available for this date"
                        : "Select a date from the calendar to view slots"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {slotsForSelectedDate.map((slot) => {
                      const spotsLeft = slot.capacity - slot.bookings_count

                      return (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-lg border border-border p-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </span>
                            </div>
                            {slot.ta && (
                              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                TA: {slot.ta.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={spotsLeft <= 2 ? "destructive" : "secondary"}>{spotsLeft} left</Badge>
                            <Button
                              onClick={() => handleBookSlot(slot.id)}
                              disabled={bookingSlotId === slot.id}
                              size="sm"
                            >
                              {bookingSlotId === slot.id ? "Booking..." : "Book"}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
