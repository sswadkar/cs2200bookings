import Link from "next/link"
import { Calendar, Users, GraduationCap, Shield, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
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

      <main className="mx-auto max-w-4xl px-4 py-16">
        <section className="text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Demo Booking Platform
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Students can book demo slots, TAs can manage their availability, and Admins can oversee everything.
          </p>
        </section>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <GraduationCap className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle className="mt-4">Student</CardTitle>
              <CardDescription>View available demo slots and book your session.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student/login">
                <Button className="w-full" variant="default">
                  Student Login
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <UserCog className="h-6 w-6 text-emerald-500" />
              </div>
              <CardTitle className="mt-4">Teaching Assistant</CardTitle>
              <CardDescription>Manage your demo slots and fulfill hour requirements.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/ta/login">
                <Button className="w-full" variant="default">
                  TA Login
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                <Shield className="h-6 w-6 text-amber-500" />
              </div>
              <CardTitle className="mt-4">Administrator</CardTitle>
              <CardDescription>Manage booking groups, TAs, and students.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/login">
                <Button className="w-full" variant="default">
                  Admin Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16 rounded-lg border border-border bg-muted/50 p-8">
          <div className="flex items-start gap-4">
            <Users className="mt-1 h-6 w-6 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-foreground">How it works</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong>Admins</strong> create booking groups and configure TA hour requirements.
                </li>
                <li>
                  <strong>TAs</strong> add their available demo slots to fulfill their requirements.
                </li>
                <li>
                  <strong>Students</strong> browse published slots and book one per booking group.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-muted-foreground">
          <p>CS 2200 Bookings - Demo Booking Platform</p>
        </div>
      </footer>
    </div>
  )
}
