"use client"

import { useState, useCallback } from "react"
import { Sparkles, AlertCircle, Folder } from "lucide-react"
import { PromptForm, type ReferenceImage } from "@/components/mockup/prompt-form"
import { MockupResult } from "@/components/mockup/mockup-result"
import { EmptyState } from "@/components/mockup/empty-state"
import { HistorySidebar, type HistoryItem } from "@/components/mockup/history-sidebar"
import { WaveLoader } from "@/components/mockup/wave-loader"

export default function MockupGeneratorPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ imageUrl: string; prompt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleGenerate = useCallback(async (prompt: string, refs: ReferenceImage[]) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const body: Record<string, unknown> = { prompt }
      if (refs.length > 0) {
        body.referenceImages = refs.map((r) => ({ base64: r.base64, mimeType: r.mimeType }))
      }

      const res = await fetch("/api/generate-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء التوليد")
      }

      setResult({ imageUrl: data.imageUrl, prompt: data.prompt })

      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        imageUrl: data.imageUrl,
        prompt: data.prompt,
        createdAt: new Date(),
      }
      setHistory((prev) => [newItem, ...prev])
      setActiveId(newItem.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSelectHistory = useCallback((item: HistoryItem) => {
    setResult({ imageUrl: item.imageUrl, prompt: item.prompt })
    setActiveId(item.id)
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Sparkles className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white font-sans">
              مولّد نماذج المنتجات بالذكاء الاصطناعي
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-sans">
              صِف منتجك واحصل على نموذج احترافي بثوانٍ
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

      <div className="flex gap-6">
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          <PromptForm onGenerate={handleGenerate} isLoading={isLoading} />

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {isLoading && <WaveLoader />}

          {!isLoading && result && (
            <MockupResult imageUrl={result.imageUrl} prompt={result.prompt} />
          )}

          {!isLoading && !result && !error && <EmptyState />}
        </div>

        <HistorySidebar
          items={history}
          activeId={activeId}
          onSelect={handleSelectHistory}
        />
      </div>
    </div>
  )
}
