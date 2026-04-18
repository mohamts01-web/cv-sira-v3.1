"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import DashboardUI from "@/components/kokonutui/dashboard"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user === null) router.push("/login")
  }, [user, router])

  if (user === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F0F12]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!user) return null

  return <DashboardUI />
}
