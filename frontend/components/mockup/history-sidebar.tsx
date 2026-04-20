"use client"

import { cn } from "@/lib/utils"

export interface HistoryItem {
  id: string
  imageUrl: string
  prompt: string
  createdAt: Date
}

interface HistorySidebarProps {
  items: HistoryItem[]
  activeId: string | null
  onSelect: (item: HistoryItem) => void
}

export function HistorySidebar({ items, activeId, onSelect }: HistorySidebarProps) {
  if (items.length === 0) return null

  return (
    <aside className="hidden lg:flex flex-col gap-2 w-52 shrink-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 px-1">
        السجل
      </p>
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-12rem)]">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={cn(
              "group relative overflow-hidden rounded-lg border text-left transition-colors",
              activeId === item.id
                ? "border-purple-500 bg-purple-500/10"
                : "border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418] hover:border-purple-500/50"
            )}
          >
            <img
              src={item.imageUrl}
              alt={item.prompt}
              className="h-24 w-full object-cover object-top opacity-70 group-hover:opacity-90 transition-opacity"
            />
            <div className="px-2 py-1.5">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-relaxed">
                {item.prompt.length > 40 ? item.prompt.slice(0, 40) + "…" : item.prompt}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
