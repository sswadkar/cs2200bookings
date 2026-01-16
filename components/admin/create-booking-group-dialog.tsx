"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CreateBookingGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBookingGroupDialog({ open, onOpenChange }: CreateBookingGroupDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [slug, setSlug] = useState("")
  const [status, setStatus] = useState<"hidden" | "published" | "inactive">("hidden")
  const [taRequiredMinutes, setTaRequiredMinutes] = useState("120")
  const [dateRangeStart, setDateRangeStart] = useState("")
  const [dateRangeEnd, setDateRangeEnd] = useState("")
  const [dailyStartTime, setDailyStartTime] = useState("09:00")
  const [dailyEndTime, setDailyEndTime] = useState("17:00")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("booking_groups").insert({
        name,
        description: description || null,
        slug,
        status,
        ta_required_minutes: Number.parseInt(taRequiredMinutes) || 0,
        date_range_start: dateRangeStart || null,
        date_range_end: dateRangeEnd || null,
        daily_start_time: dailyStartTime,
        daily_end_time: dailyEndTime,
      })

      if (error) {
        if (error.code === "23505") {
          toast.error("A booking group with this slug already exists")
        } else {
          toast.error(error.message)
        }
        return
      }

      toast.success("Booking group created!")
      onOpenChange(false)
      // Reset form
      setName("")
      setDescription("")
      setSlug("")
      setStatus("hidden")
      setTaRequiredMinutes("120")
      setDateRangeStart("")
      setDateRangeEnd("")
      setDailyStartTime("09:00")
      setDailyEndTime("17:00")
      router.refresh()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Booking Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Week 5 Demo"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  placeholder="e.g., week-5-demo"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "hidden" | "published" | "inactive")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hidden">Hidden (TAs only)</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this booking group..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taMinutes">TA Hour Requirement (minutes)</Label>
              <Input
                id="taMinutes"
                type="number"
                placeholder="120"
                value={taRequiredMinutes}
                onChange={(e) => setTaRequiredMinutes(e.target.value)}
                min="0"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Each TA must contribute this many minutes of demo slots.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateStart">Date Range Start</Label>
                <Input
                  id="dateStart"
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateEnd">Date Range End</Label>
                <Input
                  id="dateEnd"
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  min={dateRangeStart}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeStart">Daily Start Time</Label>
                <Input
                  id="timeStart"
                  type="time"
                  value={dailyStartTime}
                  onChange={(e) => setDailyStartTime(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeEnd">Daily End Time</Label>
                <Input
                  id="timeEnd"
                  type="time"
                  value={dailyEndTime}
                  onChange={(e) => setDailyEndTime(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
