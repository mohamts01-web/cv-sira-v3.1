"use client"

import { SvgGenerator } from "@/components/svg-generator/svg-generator"
import { Folder } from "lucide-react"

export default function SvgGeneratorPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
            <svg className="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white font-sans">
              مولّد SVG بالذكاء الاصطناعي
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-sans">
              صِف رسمك واحصل على SVG قابل للتعديل فوراً
            </p>
          </div>
        </div>

        <button
          onClick={() => window.location.href = "/dashboard/projects"}
          className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418] px-3 py-1.5 text-xs text-gray-900 dark:text-white transition-colors hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
        >
          <Folder className="h-4 w-4" />
          <span>مشاريعي</span>
        </button>
      </div>

      <SvgGenerator />
    </div>
  )
}
