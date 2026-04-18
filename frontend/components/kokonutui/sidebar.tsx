"use client"

import {
  BarChart2, Receipt, Building2, CreditCard,
  Folder, Wallet, Users2, Shield, MessagesSquare,
  Video, Settings, HelpCircle, Menu, Home, Sparkles,
  LayoutGrid,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  function handleNavigation() {
    setIsMobileMenuOpen(false)
  }

  function NavItem({
    href,
    icon: Icon,
    children,
    badge,
  }: {
    href: string
    icon: React.ComponentType<{ className?: string }>
    children: React.ReactNode
    badge?: string
  }) {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        onClick={handleNavigation}
        className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors group ${
          isActive
            ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
        }`}
      >
        <div className="flex items-center">
          <Icon className={`h-4 w-4 mr-3 flex-shrink-0 ${isActive ? "text-purple-600 dark:text-purple-400" : ""}`} />
          {children}
        </div>
        {badge && (
          <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-medium">{badge}</span>
        )}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      <nav className={`
        fixed inset-y-0 left-0 z-[70] w-64 bg-white dark:bg-[#0F0F12] transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:w-64 border-r border-gray-200 dark:border-[#1F1F23]
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <Link href="/" className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-[#1F1F23]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">CvSira</span>
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto py-4 px-4 space-y-6">
            {/* Overview */}
            <div>
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Overview
              </div>
              <div className="space-y-1">
                <NavItem href="/dashboard" icon={Home}>Dashboard</NavItem>
                <NavItem href="#" icon={BarChart2}>Analytics</NavItem>
                <NavItem href="#" icon={Folder}>Projects</NavItem>
              </div>
            </div>

            {/* Services */}
            <div>
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                الخدمات
              </div>
              <div className="space-y-1">
                <NavItem href="/dashboard/services" icon={LayoutGrid}>جميع الخدمات</NavItem>
                <NavItem href="/dashboard/services/infographic" icon={Sparkles} badge="جديد">
                  مولّد الإنفوجرافيك
                </NavItem>
              </div>
            </div>

            {/* Finance */}
            <div>
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Finance
              </div>
              <div className="space-y-1">
                <NavItem href="#" icon={Wallet}>Transactions</NavItem>
                <NavItem href="#" icon={Receipt}>Invoices</NavItem>
                <NavItem href="#" icon={CreditCard}>Payments</NavItem>
              </div>
            </div>

            {/* Team */}
            <div>
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Team
              </div>
              <div className="space-y-1">
                <NavItem href="#" icon={Users2}>Members</NavItem>
                <NavItem href="#" icon={Shield}>Permissions</NavItem>
                <NavItem href="#" icon={MessagesSquare}>Chat</NavItem>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="px-4 py-4 border-t border-gray-200 dark:border-[#1F1F23] space-y-1">
            <NavItem href="#" icon={Settings}>Settings</NavItem>
            <NavItem href="#" icon={HelpCircle}>Help</NavItem>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[65] lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </>
  )
}
