import { AdminLoginForm } from "@/components/admin/login-form"
import { Calendar } from "lucide-react"
import Link from "next/link"

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold text-foreground">CS 2200 Bookings</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Admin Login</h1>
          <p className="mt-2 text-muted-foreground">Sign in to manage your booking groups and slots</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  )
}
