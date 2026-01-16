"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
  Calendar,
  Plus,
  LogOut,
  Users,
  Clock,
  MoreVertical,
  Settings,
  UserCog,
  GraduationCap,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import type { Admin, BookingGroup, Booking, TA } from "@/lib/types"
import { CreateBookingGroupDialog } from "./create-booking-group-dialog"

interface AdminDashboardProps {
  admin: Admin
  bookingGroups: BookingGroup[]
  recentBookings: Booking[]
  tas: TA[]
  studentsCount: number
}

export function AdminDashboard({ admin, bookingGroups, recentBookings, tas, studentsCount }: AdminDashboardProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("Logged out successfully")
    router.push("/admin/login")
    router.refresh()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge variant="default">Published</Badge>
      case "hidden":
        return (
          <Badge variant="secondary">
            <EyeOff className="mr-1 h-3 w-3" />
            Hidden
          </Badge>
        )
      case "inactive":
        return <Badge variant="outline">Inactive</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const publishedGroups = bookingGroups.filter((g) => g.status === "published").length
  const hiddenGroups = bookingGroups.filter((g) => g.status === "hidden").length

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

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage booking groups, TAs, and students</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Booking Group
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Booking Groups</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{bookingGroups.length}</div>
              <p className="text-xs text-muted-foreground">
                {publishedGroups} published, {hiddenGroups} hidden
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Teaching Assistants</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{tas.length}</div>
              <Link href="/admin/tas" className="text-xs text-primary hover:underline">
                View all TAs
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{studentsCount}</div>
              <Link href="/admin/students" className="text-xs text-primary hover:underline">
                Manage students
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Bookings</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{recentBookings.length}</div>
              <p className="text-xs text-muted-foreground">Last 10 bookings</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Booking Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookingGroups.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No booking groups yet</p>
                  <Button variant="outline" className="mt-4 bg-transparent" onClick={() => setShowCreateDialog(true)}>
                    Create your first booking group
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookingGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{group.name}</h3>
                          {getStatusBadge(group.status)}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{group.description || "No description"}</p>
                        {group.ta_required_minutes > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            TA requirement: {group.ta_required_minutes} minutes
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/groups/${group.id}`}>
                              <Settings className="mr-2 h-4 w-4" />
                              Manage Group
                            </Link>
                          </DropdownMenuItem>
                          {group.status === "published" && (
                            <DropdownMenuItem asChild>
                              <Link href={`/student/book/${group.slug}`} target="_blank">
                                <Eye className="mr-2 h-4 w-4" />
                                View Booking Page
                              </Link>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No bookings yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div>
                        <p className="font-medium text-foreground">{booking.student?.name || "Unknown Student"}</p>
                        <p className="text-sm text-muted-foreground">{booking.student?.email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {booking.slot?.booking_group?.name} - {formatDate(booking.slot?.start_time || "")}
                        </p>
                      </div>
                      <Badge variant="default">Confirmed</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <CreateBookingGroupDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  )
}
