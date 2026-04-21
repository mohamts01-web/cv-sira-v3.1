"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  Download, Maximize2, X, ImageIcon, Loader2,
  ChevronDown, ArrowUp, Coins, Sparkles, History,
  AlertCircle, Info, Save, Folder
} from "lucide-react"
import { useSaveProject } from "@/hooks/use-save-project"

const API = process.env.NEXT_PUBLIC_BACKEND_URL || ""

const IMAGE_SIZES = [
  { label: "Landscape 16:9", value: "landscape_16_9" },
  { label: "Portrait 9:16", value: "portrait_9_16" },
  { label: "Square 1:1", value: "square" },
  { label: "Square HD", value: "square_hd" },
  { label: "Landscape 4:3", value: "landscape_4_3" },
  { label: "Portrait 3:4", value: "portrait_3_4" },
]

interface GeneratedImage { url: string; width: number; height: number }

const POINTS_PER_IMAGE = 2

export default function InfographicService() {
  const { user } = useAuth()
  const { save: saveProject, isSaving: isSavingProject } = useSaveProject("infographic")
  const [prompt, setPrompt] = useState("")
  const [imageSize, setImageSize] = useState("landscape_16_9")
  const [numImages, setNumImages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [error, setError] = useState("")
  const [fullscreen, setFullscreen] = useState<string | null>(null)
  const [sizeOpen, setSizeOpen] = useState(false)
  const [remainingPoints, setRemainingPoints] = useState<number | null>(null)
  const [isMock, setIsMock] = useState(false)

  const cost = POINTS_PER_IMAGE * numImages
  const points = remainingPoints !== null ? remainingPoints : (user?.points ?? 0)
  const canGenerate = points >= cost && prompt.trim().length > 0 && !loading

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError("")
    setImages([])
    setIsMock(false)

    try {
      const res = await fetch(`${API}/api/services/infographic/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image_size: imageSize, num_images: numImages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "فشل التوليد")
      setImages(data.images)
      setRemainingPoints(data.remaining_points)
      setIsMock(data.mock_mode)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (url: string, index: number) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = `cvsira-infographic-${Date.now()}-${index + 1}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, "_blank")
    }
  }

  const selectedSize = IMAGE_SIZES.find((s) => s.value === imageSize)

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">مولّد الإنفوجرافيك بالذكاء الاصطناعي</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">حوّل أفكارك إلى صور مذهلة بـ ByteDance SeedDream v4.5</p>
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

      {/* Points Bar */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-[#1F1F23]">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">نقاطك المتاحة:</span>
          <span className="font-bold text-gray-900 dark:text-white" data-testid="points-display">{points}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Info className="w-3.5 h-3.5" />
          <span>كل صورة = {POINTS_PER_IMAGE} نقطة</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-[#1F1F23] rounded-2xl p-6 mb-6">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 block">
          وصف الصورة
        </label>

        {/* Input area */}
        <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500/50 transition-all overflow-visible mb-2">
          <textarea
            data-testid="infographic-prompt"
            className="w-full min-h-[120px] resize-none bg-transparent px-4 pt-4 pb-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none leading-relaxed"
            placeholder="اكتب وصفاً دقيقاً للصورة التي تريد توليدها... مثال: إنفوجرافيك احترافي يوضح مراحل التطور التقني بألوان زرقاء وبيضاء"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate() }}
            dir="auto"
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Size dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSizeOpen(!sizeOpen)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-xs font-medium text-gray-600 dark:text-gray-300 transition-all"
                >
                  {selectedSize?.label}
                  <ChevronDown className={`w-3 h-3 transition-transform ${sizeOpen ? "rotate-180" : ""}`} />
                </button>
                {sizeOpen && (
                  <div className="absolute bottom-full mb-1.5 left-0 z-20 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                    {IMAGE_SIZES.map((s) => (
                      <button key={s.value} onClick={() => { setImageSize(s.value); setSizeOpen(false) }}
                        className={`w-full text-right px-3 py-2 text-xs transition-colors ${imageSize === s.value ? "text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-900/20" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700"}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700" />

              {/* Count */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} onClick={() => setNumImages(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium border transition-all ${numImages === n ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700"}`}>
                    {n}
                  </button>
                ))}
              </div>

              <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <Coins className="w-3 h-3 text-yellow-500" />
                {cost} نقطة
              </div>
            </div>

            {/* Generate button */}
            <button
              data-testid="generate-btn"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        {points < cost && prompt.trim() && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            نقاطك غير كافية لهذه العملية. تحتاج {cost} نقطة ولديك {points} نقطة فقط.
          </div>
        )}
      </div>

      {/* Mock mode notice */}
      {isMock && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-semibold">وضع العرض التجريبي:</span> هذه صور نموذجية. لتفعيل التوليد الحقيقي بالذكاء الاصطناعي، أضف مفتاح FAL_KEY في إعدادات المنصة.
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-zinc-700" />
            <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">جارٍ توليد الصورة...</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SeedDream v4.5 يعمل على إبداعك</p>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {!loading && images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {images.length} صورة {images.length > 1 ? "مولّدة" : "مولّدة"}
              </span>
              {isMock && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">تجريبي</span>}
            </div>
            <button onClick={() => setImages([])} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              مسح الكل
            </button>
          </div>

          <div className={`grid gap-4 ${images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {images.map((img, i) => (
              <div key={i} className="group relative rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 shadow-sm">
                <img src={img.url} alt={`صورة ${i + 1}`} className="w-full h-auto block" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button onClick={() => setFullscreen(img.url)}
                    className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                    <Maximize2 className="w-4 h-4 text-black" />
                  </button>
                  <button onClick={() => handleDownload(img.url, i)}
                    className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                    <Download className="w-4 h-4 text-black" />
                  </button>
                  <button onClick={() => saveProject({ title: prompt.slice(0, 40), data: { prompt, imageSize, url: img.url }, thumbnail: img.url })} disabled={isSavingProject}
                    className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-md hover:scale-105 transition-transform disabled:opacity-50">
                    {isSavingProject ? <Loader2 className="w-4 h-4 text-black animate-spin" /> : <Save className="w-4 h-4 text-black" />}
                  </button>
                </div>
                {images.length > 1 && (
                  <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {i + 1}/{images.length}
                  </div>
                )}
              </div>
            ))}
          </div>

          {images.length > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => images.forEach((img, i) => handleDownload(img.url, i))}
                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all">
                <Download className="w-4 h-4" />
                تنزيل الكل
              </button>
              <button
                onClick={() => saveProject({ title: prompt.slice(0, 40), data: { prompt, imageSize, numImages, images: images.map(i => i.url) }, thumbnail: images[0]?.url })}
                disabled={isSavingProject}
                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all disabled:opacity-50"
              >
                {isSavingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ المشروع
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && images.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 flex items-center justify-center">
            <ImageIcon className="w-7 h-7 text-gray-300 dark:text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">لا توجد صور بعد</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">اكتب وصفاً واضغط على زر التوليد</p>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFullscreen(null)}>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={fullscreen} alt="معاينة" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain shadow-2xl" />
            <button onClick={() => setFullscreen(null)}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
              <X className="w-4 h-4" />
            </button>
            <button onClick={() => handleDownload(fullscreen, 0)}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-xs font-medium shadow-lg hover:scale-105 transition-transform">
              <Download className="w-3.5 h-3.5" />
              تنزيل
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
