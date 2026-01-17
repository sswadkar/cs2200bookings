"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Calendar, ArrowLeft, Plus, Trash2, Clock, Info, Users, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { createClient } from "@/lib/supabase/client"
import type { TA, BookingGroup, BookingSlot, Booking, Student } from "@/lib/types"
import {
  formatDate,
  formatTime,
  createTimezoneAwareDateTime,
  formatTimezoneShort,
  getBrowserTimezone,
  formatPlainDate,
} from "@/lib/utils/date"

interface SlotWithBookings extends BookingSlot {
  bookings?: Array<Booking & { student: Student }>
}

export default function TASlotManagementPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [ta, setTA] = useState<TA | null>(null)
  const [group, setGroup] = useState<BookingGroup | null>(null)
  const [slots, setSlots] = useState<SlotWithBookings[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("11:00")
  const [slotDuration, setSlotDuration] = useState("10")
  const [capacity, setCapacity] = useState("1")
  const [isCreating, setIsCreating] = useState(false)

  const browserTimezone = formatTimezoneShort()
  const fullTimezone = getBrowserTimezone()

  const minTime = group?.daily_start_time?.slice(0, 5) || "00:00"
  const maxTime = group?.daily_end_time?.slice(0, 5) || "23:59"

  const isEditable = group?.status === "hidden"
  const isViewMode = group?.status === "published" || group?.status === "locked"

  useEffect(() => {
    checkAuth()
  }, [groupId])

  async function checkAuth() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/ta/login")
      return
    }

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

    // Get booking group
    const { data: groupData } = await supabase.from("booking_groups").select("*").eq("id", groupId).single()

    if (!groupData || groupData.status === "inactive") {
      toast.error("Cannot access", {
        description: "This booking group is inactive.",
      })
      router.push("/ta/dashboard")
      return
    }

    setGroup(groupData)

    const today = new Date().toISOString().split("T")[0]
    if (groupData.date_range_start && groupData.date_range_start > today) {
      setSelectedDate(groupData.date_range_start)
    } else if (groupData.date_range_end && groupData.date_range_end < today) {
      setSelectedDate(groupData.date_range_start || today)
    } else {
      setSelectedDate(today)
    }

    if (groupData.daily_start_time) {
      setStartTime(groupData.daily_start_time.slice(0, 5))
    }
    if (groupData.daily_end_time) {
      setEndTime(groupData.daily_end_time.slice(0, 5))
    }

    const { data: slotsData } = await supabase
      .from("booking_slots")
      .select("*")
      .eq("booking_group_id", groupId)
      .eq("ta_id", taId)
      .order("start_time")

    if (slotsData && (groupData.status === "published" || groupData.status === "locked")) {
      // Fetch bookings for each slot
      const slotIds = slotsData.map((s) => s.id)
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, student:students(*)")
        .in("booking_slot_id", slotIds)

      // Attach bookings to slots
      const slotsWithBookings = slotsData.map((slot) => ({
        ...slot,
        bookings: bookingsData?.filter((b) => b.booking_slot_id === slot.id) || [],
      }))

      setSlots(slotsWithBookings)
    } else {
      setSlots(slotsData || [])
    }

    setIsLoading(false)
  }

  async function handleCreateSlots(e: React.FormEvent) {
    e.preventDefault()
    if (!ta || !group || !isEditable) return

    const duration = Number.parseInt(slotDuration)
    const cap = Number.parseInt(capacity)

    // Calculate total minutes in the time range
    const [startH, startM] = startTime.split(":").map(Number)
    const [endH, endM] = endTime.split(":").map(Number)
    const totalMinutes = endH * 60 + endM - (startH * 60 + startM)

    if (totalMinutes <= 0) {
      toast.error("Invalid time range", {
        description: "End time must be after start time.",
      })
      return
    }

    if (group.daily_start_time && group.daily_end_time) {
      const [minH, minM] = group.daily_start_time.slice(0, 5).split(":").map(Number)
      const [maxH, maxM] = group.daily_end_time.slice(0, 5).split(":").map(Number)
      const minMinutes = minH * 60 + minM
      const maxMinutes = maxH * 60 + maxM
      const startMinutes = startH * 60 + startM
      const endMinutes = endH * 60 + endM

      if (startMinutes < minMinutes || endMinutes > maxMinutes) {
        toast.error("Time out of range", {
          description: `Times must be between ${group.daily_start_time.slice(0, 5)} and ${group.daily_end_time.slice(0, 5)}.`,
        })
        return
      }
    }

    if (totalMinutes % duration !== 0) {
      toast.error("Invalid duration", {
        description: `${totalMinutes} minutes is not divisible by ${duration} minute slots. Try a different slot duration.`,
      })
      return
    }

    const existingSlotsOnDate = slots.filter((slot) => {
      const slotDate = new Date(slot.start_time).toISOString().split("T")[0]
      return slotDate === selectedDate
    })

    // Build proposed slots and check for overlaps
    const proposedSlots: Array<{ startMinutes: number; endMinutes: number }> = []
    let currentMinutes = startH * 60 + startM
    const endMinutesTotal = endH * 60 + endM

    while (currentMinutes < endMinutesTotal) {
      proposedSlots.push({
        startMinutes: currentMinutes,
        endMinutes: currentMinutes + duration,
      })
      currentMinutes += duration
    }

    // Check each proposed slot against existing slots
    for (const proposed of proposedSlots) {
      for (const existing of existingSlotsOnDate) {
        const existingStart = new Date(existing.start_time)
        const existingEnd = new Date(existing.end_time)
        const existingStartMins = existingStart.getHours() * 60 + existingStart.getMinutes()
        const existingEndMins = existingEnd.getHours() * 60 + existingEnd.getMinutes()

        // Check for overlap: slots overlap if one starts before the other ends
        const overlaps =
          (proposed.startMinutes >= existingStartMins && proposed.startMinutes < existingEndMins) ||
          (proposed.endMinutes > existingStartMins && proposed.endMinutes <= existingEndMins) ||
          (proposed.startMinutes <= existingStartMins && proposed.endMinutes >= existingEndMins)

        if (overlaps) {
          const proposedStartStr = `${String(Math.floor(proposed.startMinutes / 60)).padStart(2, "0")}:${String(proposed.startMinutes % 60).padStart(2, "0")}`
          const existingTimeStr = `${formatTime(existing.start_time)} - ${formatTime(existing.end_time)}`
          toast.error("Overlapping slot detected", {
            description: `A slot starting at ${proposedStartStr} would overlap with your existing slot (${existingTimeStr}). Please choose a different time range.`,
          })
          return
        }
      }
    }

    setIsCreating(true)

    try {
      const supabase = createClient()
      const slotsToCreate: Array<{
        booking_group_id: string
        ta_id: string
        start_time: string
        end_time: string
        capacity: number
      }> = []

      currentMinutes = startH * 60 + startM

      while (currentMinutes < endMinutesTotal) {
        const slotStartH = Math.floor(currentMinutes / 60)
        const slotStartM = currentMinutes % 60
        const slotEndMinutes = currentMinutes + duration
        const slotEndH = Math.floor(slotEndMinutes / 60)
        const slotEndM = slotEndMinutes % 60

        const slotStartTime = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`
        const slotEndTime = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`

        slotsToCreate.push({
          booking_group_id: groupId,
          ta_id: ta.id,
          start_time: createTimezoneAwareDateTime(selectedDate, slotStartTime),
          end_time: createTimezoneAwareDateTime(selectedDate, slotEndTime),
          capacity: cap,
        })

        currentMinutes = slotEndMinutes
      }

      if (slotsToCreate.length === 0) {
        toast.error("No slots to create", {
          description: "Please check your time settings.",
        })
        setIsCreating(false)
        return
      }

      const { error } = await supabase.from("booking_slots").insert(slotsToCreate)

      if (error) {
        toast.error("Failed to create slots", {
          description: error.message,
        })
      } else {
        toast.success(
          `Created ${slotsToCreate.length} slots for ${new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}!`,
        )
        await loadData(ta.id)
      }
    } catch (err) {
      toast.error("Failed to create slots")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteSlot(slotId: string) {
    if (!ta || !isEditable) return

    const supabase = createClient()
    const { error } = await supabase.from("booking_slots").delete().eq("id", slotId).eq("ta_id", ta.id)

    if (error) {
      toast.error("Failed to delete slot")
    } else {
      toast.success("Slot deleted")
      setSlots(slots.filter((s) => s.id !== slotId))
    }
  }

  if (isLoading || !ta || !group) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const totalMinutes = slots.reduce((total, slot) => {
    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)
    return total + (end.getTime() - start.getTime()) / 60000
  }, 0)

  const slotsByDate = slots.reduce(
    (acc, slot) => {
      const dateKey = new Date(slot.start_time).toLocaleDateString()
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(slot)
      return acc
    },
    {} as Record<string, SlotWithBookings[]>,
  )

  const totalSlots = slots.length
  const bookedSlots = slots.filter((s) => s.bookings && s.bookings.length > 0).length
  const totalCapacity = slots.reduce((sum, s) => sum + s.capacity, 0)
  const totalBooked = slots.reduce((sum, s) => sum + (s.bookings?.length || 0), 0)

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

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/ta/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {isEditable ? "Add your demo slots for this booking group." : "View your slots and student bookings."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isViewMode ? "default" : "secondary"}>
              {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
            </Badge>
            <Badge variant="outline">
              {Math.round(totalMinutes)} / {group.ta_required_minutes} min
            </Badge>
          </div>
        </div>

        {isViewMode && (
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{totalSlots}</p>
                  <p className="text-sm text-muted-foreground">Total Slots</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{bookedSlots}</p>
                  <p className="text-sm text-muted-foreground">Slots with Bookings</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{totalBooked}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Capacity Filled</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Slot Creation - Only show for hidden groups */}
        {isEditable && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Slots
              </CardTitle>
              <CardDescription>
                Select a date and time range to generate slots. The time range must be perfectly divisible by the slot
                duration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <Info className="h-4 w-4" />
                <span>
                  All times are in your local timezone: <strong>{browserTimezone}</strong> ({fullTimezone})
                </span>
              </div>

              <form onSubmit={handleCreateSlots} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="selectedDate">Date</Label>
                  <Input
                    id="selectedDate"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={group.date_range_start || undefined}
                    max={group.date_range_end || undefined}
                    required
                  />
                  {group.date_range_start && group.date_range_end && (
                    <p className="text-xs text-muted-foreground">
                      Allowed range: {formatPlainDate(group.date_range_start)} - {formatPlainDate(group.date_range_end)}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      min={minTime}
                      max={maxTime}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      min={minTime}
                      max={maxTime}
                      required
                    />
                  </div>
                </div>

                {minTime && maxTime && (
                  <p className="text-xs text-muted-foreground">
                    Allowed time range: {minTime} - {maxTime}
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Slot Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(e.target.value)}
                      min="5"
                      step="5"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity per Slot</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                </div>

                {selectedDate && startTime && endTime && slotDuration && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium">Preview:</p>
                    <p className="text-muted-foreground">
                      {(() => {
                        const [startH, startM] = startTime.split(":").map(Number)
                        const [endH, endM] = endTime.split(":").map(Number)
                        const totalMins = endH * 60 + endM - (startH * 60 + startM)
                        const duration = Number.parseInt(slotDuration) || 1
                        const slotCount = totalMins > 0 && totalMins % duration === 0 ? totalMins / duration : 0
                        const dateDisplay = new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })
                        if (slotCount > 0) {
                          return `${slotCount} slots on ${dateDisplay}, each ${duration} minutes long`
                        }
                        return totalMins % duration !== 0
                          ? `Time range (${totalMins} min) is not divisible by ${duration} min slots`
                          : "Configure the form to see preview"
                      })()}
                    </p>
                  </div>
                )}

                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Slots"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isViewMode && (
          <div className="mt-8 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              This booking group is {group.status}. You can view your slots and see which students have booked, but you
              cannot modify slots.
            </span>
          </div>
        )}

        {/* Slots List */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Your Slots ({slots.length})</h2>
          {slots.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {isEditable
                ? "You haven't added any slots yet. Use the form above to create slots."
                : "You don't have any slots for this booking group."}
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {Object.entries(slotsByDate)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([dateKey, dateSlots]) => (
                  <div key={dateKey}>
                    <h3 className="mb-3 font-medium text-foreground">{formatDate(dateSlots[0].start_time)}</h3>
                    <div className="space-y-2">
                      {dateSlots.map((slot) => {
                        const bookingCount = slot.bookings?.length || 0
                        const isFull = bookingCount >= slot.capacity
                        const hasBookings = bookingCount > 0

                        return (
                          <div
                            key={slot.id}
                            className={`rounded-lg border bg-card p-4 ${
                              isViewMode && isFull
                                ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-card-foreground">
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </span>
                                {isViewMode && (
                                  <Badge variant={isFull ? "default" : hasBookings ? "secondary" : "outline"}>
                                    {bookingCount} / {slot.capacity} booked
                                  </Badge>
                                )}
                              </div>
                              {isEditable && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Slot?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete this slot. Any existing bookings will also be
                                        removed.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteSlot(slot.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>

                            {isViewMode && slot.bookings && slot.bookings.length > 0 && (
                              <div className="mt-3 border-t border-border pt-3">
                                <p className="mb-2 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  Students:
                                </p>
                                <div className="space-y-1">
                                  {slot.bookings.map((booking) => (
                                    <div
                                      key={booking.id}
                                      className="flex items-center gap-2 text-sm text-card-foreground"
                                    >
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <span className="font-medium">{booking.student?.name}</span>
                                      <span className="text-muted-foreground">({booking.student?.email})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isViewMode && (!slot.bookings || slot.bookings.length === 0) && (
                              <div className="mt-3 border-t border-border pt-3">
                                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <XCircle className="h-3 w-3" />
                                  No students have booked this slot yet
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
