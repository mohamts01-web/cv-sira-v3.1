"use client"

import { useState, useRef, useCallback } from "react"
import { Loader2, Sparkles, ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ReferenceImage {
  id: string
  base64: string
  mimeType: string
  previewUrl: string
  name: string
}

const EXAMPLE_PROMPTS = [
  "Product landing page for a wireless noise-cancelling headphone",
  "Smartwatch app mockup showing health & fitness dashboard",
  "Packaging mockup for a premium skincare serum bottle",
  "Electric scooter product detail page with specs",
  "Sneaker product card with 3D view and colorway picker",
]

interface PromptFormProps {
  onGenerate: (prompt: string, refs: ReferenceImage[]) => void
  isLoading: boolean
}

const MAX_IMAGES = 5

export function PromptForm({ onGenerate, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState("")
  const [refs, setRefs] = useState<ReferenceImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const readFileAsBase64 = (file: File): Promise<ReferenceImage> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const [header, base64] = result.split(",")
        const mimeType = header.replace("data:", "").replace(";base64", "")
        resolve({
          id: crypto.randomUUID(),
          base64,
          mimeType,
          previewUrl: result,
          name: file.name,
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))
      const remaining = MAX_IMAGES - refs.length
      const toProcess = imageFiles.slice(0, remaining)
      if (!toProcess.length) return
      const newRefs = await Promise.all(toProcess.map(readFileAsBase64))
      setRefs((prev) => [...prev, ...newRefs])
    },
    [refs.length]
  )

  const removeRef = (id: string) => setRefs((prev) => prev.filter((r) => r.id !== id))

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return
    onGenerate(prompt, refs)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="صِف النموذج الذي تريده — مثال: زجاجة عناية بالبشرة على خلفية بيضاء…"
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#141418] px-4 py-3",
            "font-sans text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",
            "focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors leading-relaxed"
          )}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            صور مرجعية للمنتج
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {refs.length}/{MAX_IMAGES}
          </span>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => refs.length < MAX_IMAGES && fileInputRef.current?.click()}
          className={cn(
            "relative flex min-h-[80px] cursor-pointer flex-col items-center justify-center gap-2",
            "rounded-lg border-2 border-dashed transition-colors",
            isDragging
              ? "border-purple-500 bg-purple-500/5"
              : refs.length >= MAX_IMAGES
              ? "cursor-not-allowed border-gray-200 dark:border-[#1F1F23] opacity-40"
              : "border-gray-200 dark:border-[#1F1F23] hover:border-purple-400 hover:bg-purple-500/5"
          )}
        >
          {refs.length === 0 ? (
            <>
              <ImagePlus className="h-5 w-5 text-gray-400" />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
                اسحب الصور هنا أو{" "}
                <span className="text-purple-400 underline underline-offset-2">تصفح</span>
                <br />
                PNG, JPG, WEBP — حتى {MAX_IMAGES} صور
              </p>
            </>
          ) : (
            <div className="flex w-full flex-wrap gap-2 p-3">
              {refs.map((ref) => (
                <div key={ref.id} className="group relative h-16 w-16 shrink-0">
                  <img
                    src={ref.previewUrl}
                    alt={ref.name}
                    className="h-full w-full rounded-md object-cover border border-gray-200 dark:border-[#1F1F23]"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeRef(ref.id) }}
                    className={cn(
                      "absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center",
                      "rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow",
                      "opacity-0 group-hover:opacity-100 transition-opacity"
                    )}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {refs.length < MAX_IMAGES && (
                <div className={cn(
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-md",
                  "border-2 border-dashed border-gray-200 dark:border-[#1F1F23] hover:border-purple-400 transition-colors"
                )}>
                  <ImagePlus className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setPrompt(ex)}
            className={cn(
              "rounded-full border border-gray-200 dark:border-[#1F1F23] px-3 py-1 text-xs text-gray-500 dark:text-gray-400",
              "hover:border-purple-400 hover:text-purple-400 transition-colors"
            )}
          >
            {ex.length > 36 ? ex.slice(0, 36) + "…" : ex}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={!prompt.trim() || isLoading}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-6 py-3",
          "bg-purple-600 text-white font-sans text-sm font-medium",
          "hover:bg-purple-700 active:bg-purple-800 transition-colors",
          "disabled:opacity-30 disabled:cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            جارٍ التوليد…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            توليد النموذج
            {refs.length > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {refs.length} مرجع
              </span>
            )}
          </>
        )}
      </button>
    </form>
  )
}
