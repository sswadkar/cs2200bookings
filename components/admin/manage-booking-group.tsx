"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Calendar,
  ArrowLeft,
  Plus,
  Trash2,
  ExternalLink,
  LogOut,
  Clock,
  UserCog,
  CheckCircle,
  AlertCircle,
  Search,
  Users,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type {
  Admin,
  BookingGroup,
  BookingSlot,
  Booking,
  TAWithStats,
  Student,
} from "@/lib/types";
import { CreateSlotDialog } from "./create-slot-dialog";
import {
  formatRelativeTime,
  formatPlainDate,
  formatPlainTime,
  formatDate,
  formatTime,
} from "@/lib/utils/date";

interface ManageBookingGroupProps {
  admin: Admin;
  bookingGroup: BookingGroup;
  slots: BookingSlot[];
  bookings: Booking[];
  taStats: TAWithStats[];
  allStudents: Student[];
}

export function ManageBookingGroup({
  admin,
  bookingGroup,
  slots,
  bookings,
  taStats,
  allStudents,
}: ManageBookingGroupProps) {
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [status, setStatus] = useState(bookingGroup.status);
  const [taFilter, setTaFilter] = useState<"all" | "complete" | "incomplete">(
    "all",
  );
  const [bookingSearch, setBookingSearch] = useState("");
  const [slotTaFilter, setSlotTaFilter] = useState<string>("all");
  const [slotDateFilter, setSlotDateFilter] = useState<string>("all");
  const [studentBookingFilter, setStudentBookingFilter] = useState<
    "all" | "booked" | "not_booked"
  >("all");
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const handleStatusChange = async (newStatus: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("booking_groups")
      .update({ status: newStatus })
      .eq("id", bookingGroup.id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    setStatus(newStatus as "hidden" | "published" | "locked" | "inactive");
    toast.success(`Status changed to ${newStatus}`);
    router.refresh();
  };

  const handleDeleteSlot = async (slotId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("booking_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast.error("Failed to delete slot. It may have existing bookings.");
      return;
    }

    toast.success("Slot deleted");
    router.refresh();
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (error) {
      toast.error("Failed to delete booking");
      return;
    }

    toast.success("Booking deleted - student can now rebook");
    router.refresh();
  };

  const getBookingCountForSlot = (slotId: string) => {
    return bookings.filter((b) => b.booking_slot_id === slotId).length;
  };

  const uniqueTAs = useMemo(() => {
    const tas = new Map<string, string>();
    slots.forEach((slot) => {
      if (slot.ta) {
        tas.set(slot.ta_id!, slot.ta.name);
      }
    });
    return Array.from(tas.entries()).map(([id, name]) => ({ id, name }));
  }, [slots]);

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    slots.forEach((slot) => {
      const date = new Date(slot.start_time).toLocaleDateString();
      dates.add(date);
    });
    return Array.from(dates).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
  }, [slots]);

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const matchesTA = slotTaFilter === "all" || slot.ta_id === slotTaFilter;
      const matchesDate =
        slotDateFilter === "all" ||
        new Date(slot.start_time).toLocaleDateString() === slotDateFilter;
      return matchesTA && matchesDate;
    });
  }, [slots, slotTaFilter, slotDateFilter]);

  const upcomingSlots = filteredSlots.filter(
    (slot) => new Date(slot.start_time) > new Date(),
  );
  const pastSlots = filteredSlots.filter(
    (slot) => new Date(slot.start_time) <= new Date(),
  );

  const filteredBookings = useMemo(() => {
    if (!bookingSearch.trim()) return bookings;
    const search = bookingSearch.toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.student?.name?.toLowerCase().includes(search) ||
        booking.student?.email?.toLowerCase().includes(search),
    );
  }, [bookings, bookingSearch]);

  const bookedStudentIds = useMemo(() => {
    return new Set(bookings.map((b) => b.student_id));
  }, [bookings]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter((student) => {
      if (studentBookingFilter === "all") return true;
      const hasBooked = bookedStudentIds.has(student.id);
      return studentBookingFilter === "booked" ? hasBooked : !hasBooked;
    });
  }, [allStudents, studentBookingFilter, bookedStudentIds]);

  const filteredTAs = taStats.filter((ta) => {
    if (taFilter === "all") return true;
    const isComplete = ta.total_minutes >= ta.required_minutes;
    return taFilter === "complete" ? isComplete : !isComplete;
  });

  const completeTAs = taStats.filter(
    (ta) => ta.total_minutes >= ta.required_minutes,
  ).length;
  const incompleteTAs = taStats.length - completeTAs;
  const studentsNotBooked = allStudents.length - bookedStudentIds.size;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">
              CS 2200 Bookings
            </span>
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

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {bookingGroup.name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {bookingGroup.description || "No description"}
            </p>
            {bookingGroup.date_range_start && bookingGroup.date_range_end && (
              <p className="mt-2 text-sm text-muted-foreground">
                {formatPlainDate(bookingGroup.date_range_start)} -{" "}
                {formatPlainDate(bookingGroup.date_range_end)},{" "}
                {formatPlainTime(bookingGroup.daily_start_time)} -{" "}
                {formatPlainTime(bookingGroup.daily_end_time)}
              </p>
            )}
            {(status === "published" || status === "locked") && (
              <Link
                href={`/student/book/${bookingGroup.slug}`}
                target="_blank"
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View booking page <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">
                Status
              </Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="locked">
                    <span className="flex items-center gap-2">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  </SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowCreateSlot(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Slot
            </Button>
          </div>
        </div>

        {status === "locked" && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
            <Lock className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              This booking group is <strong>locked</strong>. Students can no
              longer book or reschedule their demos.
            </p>
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-5">
          <Card>
            <CardContent className="">
              <div className="text-2xl font-bold">{slots.length}</div>
              <p className="text-sm text-muted-foreground">Total Slots</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="">
              <div className="text-2xl font-bold">{bookings.length}</div>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="">
              <div className="text-2xl font-bold text-emerald-600">
                {completeTAs}
              </div>
              <p className="text-sm text-muted-foreground">TAs Complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="">
              <div className="text-2xl font-bold text-amber-600">
                {incompleteTAs}
              </div>
              <p className="text-sm text-muted-foreground">TAs Incomplete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="">
              <div className="text-2xl font-bold text-rose-600">
                {studentsNotBooked}
              </div>
              <p className="text-sm text-muted-foreground">
                Students Not Booked
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="slots" className="space-y-6">
          <TabsList>
            <TabsTrigger value="slots">Time Slots</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="tas">TA Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="slots">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Time Slots ({upcomingSlots.length} upcoming)
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={slotTaFilter}
                      onValueChange={setSlotTaFilter}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by TA" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All TAs</SelectItem>
                        {uniqueTAs.map((ta) => (
                          <SelectItem key={ta.id} value={ta.id}>
                            {ta.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={slotDateFilter}
                      onValueChange={setSlotDateFilter}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Dates</SelectItem>
                        {uniqueDates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingSlots.length === 0 ? (
                  <div className="py-8 text-center">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">
                      No slots match your filters
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 bg-transparent"
                      onClick={() => setShowCreateSlot(true)}
                    >
                      Add a slot
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingSlots.map((slot) => {
                      const currentBookings = getBookingCountForSlot(slot.id);
                      const isFull = currentBookings >= slot.capacity;
                      return (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-lg border border-border p-4"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {formatDate(slot.start_time)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(slot.start_time)} -{" "}
                              {formatTime(slot.end_time)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {currentBookings} / {slot.capacity} booked
                              {slot.ta && ` • TA: ${slot.ta.name}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={isFull ? "secondary" : "default"}>
                              {isFull ? "Full" : "Available"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSlot(slot.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {pastSlots.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-muted-foreground">
                    Past Slots ({pastSlots.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pastSlots.slice(0, 5).map((slot) => {
                      const currentBookings = getBookingCountForSlot(slot.id);
                      return (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-lg border border-border/50 p-3 opacity-60"
                        >
                          <div>
                            <p className="text-sm text-foreground">
                              {formatDate(slot.start_time)} at{" "}
                              {formatTime(slot.start_time)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {currentBookings} bookings
                              {slot.ta && ` • TA: ${slot.ta.name}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Bookings ({filteredBookings.length})
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by student name..."
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className="w-64 pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredBookings.length === 0 ? (
                  <div className="py-8 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">
                      {bookingSearch
                        ? "No bookings match your search"
                        : "No bookings yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {booking.student?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.student?.email}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(booking.slot?.start_time || "")} at{" "}
                            {formatTime(booking.slot?.start_time || "")}
                            {booking.booked_at &&
                              ` • Booked ${formatRelativeTime(booking.booked_at)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Confirmed</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBooking(booking.id)}
                            title="Delete booking (allows student to rebook)"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Students ({filteredStudents.length})
                  </CardTitle>
                  <Select
                    value={studentBookingFilter}
                    onValueChange={(v) =>
                      setStudentBookingFilter(
                        v as "all" | "booked" | "not_booked",
                      )
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="booked">Booked</SelectItem>
                      <SelectItem value="not_booked">Not Booked Yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">
                      No students match this filter
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((student) => {
                      const hasBooked = bookedStudentIds.has(student.id);
                      const studentBooking = bookings.find(
                        (b) => b.student_id === student.id,
                      );
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between rounded-lg border border-border p-3"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {student.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {student.email}
                            </p>
                          </div>
                          {hasBooked ? (
                            <div className="text-right">
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Booked
                              </Badge>
                              {studentBooking?.slot && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatPlainDate(
                                    studentBooking.slot.start_time,
                                  )}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 text-amber-600"
                            >
                              <AlertCircle className="h-3 w-3" />
                              Not Booked
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tas">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    TA Progress
                  </CardTitle>
                  <Select
                    value={taFilter}
                    onValueChange={(v) =>
                      setTaFilter(v as "all" | "complete" | "incomplete")
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All TAs</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="incomplete">Incomplete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTAs.length === 0 ? (
                  <div className="py-8 text-center">
                    <UserCog className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">
                      No TAs match this filter
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTAs.map((ta) => {
                      const progress =
                        ta.required_minutes > 0
                          ? Math.min(
                              100,
                              (ta.total_minutes / ta.required_minutes) * 100,
                            )
                          : 100;
                      const isComplete =
                        ta.total_minutes >= ta.required_minutes;

                      return (
                        <div
                          key={ta.id}
                          className="rounded-lg border border-border p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isComplete ? (
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                              )}
                              <div>
                                <p className="font-medium text-foreground">
                                  {ta.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {ta.email}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {Math.round(ta.total_minutes)} /{" "}
                                {ta.required_minutes} min
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {ta.slots_count} slots
                              </p>
                            </div>
                          </div>
                          <Progress value={progress} className="mt-3 h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <CreateSlotDialog
        open={showCreateSlot}
        onOpenChange={setShowCreateSlot}
        bookingGroupId={bookingGroup.id}
      />
    </div>
  );
}
