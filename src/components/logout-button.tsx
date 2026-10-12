"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export const LogoutButton = () => {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    if (isPending) return
    setIsPending(true)
    setError(null)
    const { error } = await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    })
    if (error) {
      setError(error.message ?? "Could not log out. Please try again.")
      setIsPending(false)
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={handleLogout}
        aria-label="Log out"
      >
        {isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
        {isPending ? "Logging out…" : "Log out"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  )
}
