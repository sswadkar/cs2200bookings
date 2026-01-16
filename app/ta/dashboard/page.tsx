import { Suspense } from "react"
import { TADashboardClient } from "@/components/ta/dashboard-client"

export default function TADashboardPage() {
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>}
    >
      <TADashboardClient />
    </Suspense>
  )
}
