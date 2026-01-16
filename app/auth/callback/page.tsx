import { Suspense } from "react"
import { AuthCallbackClient } from "@/components/auth/callback-client"

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Signing you in...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  )
}
