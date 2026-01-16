import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { ResetPasswordClient } from "@/components/auth/reset-password-client"

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  )
}
