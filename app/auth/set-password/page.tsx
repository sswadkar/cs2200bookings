import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { SetPasswordClient } from "@/components/auth/set-password-client"

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SetPasswordClient />
    </Suspense>
  )
}
