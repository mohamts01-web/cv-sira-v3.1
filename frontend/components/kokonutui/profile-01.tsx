"use client"

import { LogOut, Settings, CreditCard, Coins } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface Profile01Props {
  name: string
  role: string
  points: number
}

export default function Profile01({ name, role, points }: Profile01Props) {
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const initials = name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative px-6 pt-8 pb-6">
          {/* Avatar + info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center ring-4 ring-white dark:ring-zinc-900">
                <span className="text-white font-bold text-lg">{initials}</span>
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">{name}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{role}</p>
            </div>
          </div>

          {/* Points badge */}
          <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <Coins className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {points} نقطة متاحة
            </span>
          </div>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800 mb-4" />

          <div className="space-y-1">
            <Link href="#" className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">الخطة الحالية</span>
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{role}</span>
            </Link>
            <Link href="#" className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">الإعدادات</span>
            </Link>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="w-full flex items-center gap-2 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
