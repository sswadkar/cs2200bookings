import Link from "next/link"
import { Calendar, ArrowLeft } from "lucide-react"
import { TALoginForm } from "@/components/ta/login-form"

export default function TALoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">CS 2200 Bookings</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="rounded-lg border border-border bg-card p-8">
          <h1 className="text-2xl font-bold text-card-foreground">TA Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your TA account to manage your demo slots.</p>
          <div className="mt-8">
            <TALoginForm />
          </div>
        </div>
      </main>
    </div>
  )
}
