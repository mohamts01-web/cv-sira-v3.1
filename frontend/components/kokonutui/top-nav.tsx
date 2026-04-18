"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { Bell, ChevronRight, User } from "lucide-react"
import Profile01 from "./profile-01"
import Link from "next/link"
import { ThemeToggle } from "../theme-toggle"
import { useAuth } from "@/lib/auth-context"

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function TopNav() {
  const { user } = useAuth()
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "CvSira", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
  ]

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full">
      <div className="font-medium text-sm hidden sm:flex items-center space-x-1 truncate max-w-[300px]">
        {breadcrumbs.map((item, index) => (
          <div key={item.label} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mx-1" />}
            {item.href ? (
              <Link
                href={item.href}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
        <button
          type="button"
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-full transition-colors"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
        </button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center ring-2 ring-gray-200 dark:ring-[#2B2B30] cursor-pointer">
              <User className="h-4 w-4 text-white" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[280px] sm:w-80 bg-background border-border rounded-lg shadow-lg"
          >
            <Profile01
              name={user?.name || "المستخدم"}
              role={user?.plan_name || "Free"}
              points={user?.points ?? 0}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
