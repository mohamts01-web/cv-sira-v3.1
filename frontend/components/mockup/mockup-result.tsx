"use client"

import { useState, useEffect } from "react"
import { Download, Copy, Check, Maximize2, X, ZoomIn, ZoomOut, Save, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSaveProject } from "@/hooks/use-save-project"

interface MockupResultProps {
  imageUrl: string
  prompt: string
}

function ImageFrame({
  imageUrl,
  prompt,
  inModal = false,
  zoomed = false,
  onToggleZoom,
}: {
  imageUrl: string
  prompt: string
  inModal?: boolean
  zoomed?: boolean
  onToggleZoom?: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418] w-full">
      <img
        src={imageUrl}
        alt={`Generated mockup: ${prompt}`}
        className={cn(
          "w-full object-contain transition-transform duration-300",
          inModal && zoomed ? "scale-150 cursor-zoom-out" : inModal ? "cursor-zoom-in" : ""
        )}
        onClick={inModal ? onToggleZoom : undefined}
        draggable={false}
      />
    </div>
  )
}

export function MockupResult({ imageUrl, prompt }: MockupResultProps) {
  const [copied, setCopied] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const { save: saveProject, isSaving: isSavingProject } = useSaveProject("mockup-generator")

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setFullscreen(false); setZoomed(false) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fullscreen])

  useEffect(() => {
    document.body.style.overflow = fullscreen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [fullscreen])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `mockup-${Date.now()}.png`
    link.target = "_blank"
    link.click()
  }

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#1F1F23] px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-400 hover:border-purple-400 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-purple-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "تم النسخ" : "نسخ الوصف"}
          </button>
          <button
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#1F1F23] px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-400 hover:border-purple-400 transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            شاشة كاملة
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-purple-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            تحميل
          </button>
          <button
            onClick={() => saveProject({ title: prompt.slice(0, 40), data: { prompt }, thumbnail: imageUrl })}
            disabled={isSavingProject}
            className="flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors disabled:opacity-50"
          >
            {isSavingProject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            حفظ
          </button>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            <ImageFrame imageUrl={imageUrl} prompt={prompt} />
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="text-purple-500 mr-1">›</span>
          {prompt}
        </p>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white/95 dark:bg-[#0F0F12]/95 backdrop-blur-lg animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) { setFullscreen(false); setZoomed(false) } }}
        >
          <div className="flex shrink-0 items-center justify-end border-b border-gray-200 dark:border-[#1F1F23] px-5 py-3 gap-2">
            <button
              onClick={() => setZoomed((z) => !z)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#1F1F23] px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-400 hover:border-purple-400 transition-colors"
            >
              {zoomed ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
              {zoomed ? "تصغير" : "تكبير"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-purple-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              تحميل
            </button>
            <button
              onClick={() => saveProject({ title: prompt.slice(0, 40), data: { prompt }, thumbnail: imageUrl })}
              disabled={isSavingProject}
              className="flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors disabled:opacity-50"
            >
              {isSavingProject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              حفظ
            </button>
            <button
              onClick={() => { setFullscreen(false); setZoomed(false) }}
              className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#1F1F23] p-1.5 text-gray-500 dark:text-gray-400 hover:text-purple-400 hover:border-purple-400 transition-colors"
              title="إغلاق (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-1 overflow-auto items-start justify-center p-6">
            <div className="w-full max-w-6xl">
              <ImageFrame
                imageUrl={imageUrl}
                prompt={prompt}
                inModal
                zoomed={zoomed}
                onToggleZoom={() => setZoomed((z) => !z)}
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 dark:border-[#1F1F23] px-5 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed truncate">
              <span className="text-purple-500 mr-1">›</span>{prompt}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
