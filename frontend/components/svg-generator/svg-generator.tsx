"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Sparkles, Download, Copy, Check, Eye, Code,
  Loader2, AlertCircle, X, ZoomIn, ZoomOut, Dices, Save,
} from "lucide-react"
import { EXAMPLE_SVG, EXAMPLE_PROMPT } from "@/lib/example-svg"
import { useAuth } from "@/lib/auth-context"
import { useSaveProject } from "@/hooks/use-save-project"

const EXAMPLE_PROMPTS = [
  "A sunset over mountains with layered silhouettes",
  "A geometric logo with overlapping shapes",
  "A cute robot character with expressive eyes",
  "A forest scene at night with fireflies",
  "Abstract ocean waves with gradient colors",
]

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
  { label: "9:16", value: "9:16" },
]

function extractSvg(raw: string, forceClose: boolean): string {
  const text = raw.replace(/```[\w]*\s*/g, "").replace(/```/g, "")
  const start = text.indexOf("<svg")
  if (start === -1) return ""
  const svgText = text.substring(start)
  const end = svgText.lastIndexOf("</svg>")
  if (end !== -1) return svgText.substring(0, end + 6)
  if (!forceClose) return ""
  const lastGt = svgText.lastIndexOf(">")
  if (lastGt === -1) return ""
  const trimmed = svgText.substring(0, lastGt + 1) + "</svg>"
  if (typeof DOMParser !== "undefined") {
    const xmlDoc = new DOMParser().parseFromString(wrapStylesInCdata(trimmed), "image/svg+xml")
    if (!xmlDoc.querySelector("parsererror")) return trimmed
    const htmlDoc = new DOMParser().parseFromString(trimmed, "text/html")
    if (!htmlDoc.querySelector("svg")) return ""
  }
  return trimmed
}

function extractPartialSvg(raw: string): string {
  const text = raw.replace(/```[\w]*\s*/g, "").replace(/```/g, "")
  const start = text.indexOf("<svg")
  if (start === -1) return ""
  const svgText = text.substring(start)
  const end = svgText.lastIndexOf("</svg>")
  if (end !== -1) return svgText.substring(0, end + 6)
  const lastGt = svgText.lastIndexOf(">")
  if (lastGt === -1) return ""
  return svgText.substring(0, lastGt + 1) + "</svg>"
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  return `${(bytes / 1024).toFixed(1)}KB`
}

function wrapStylesInCdata(svg: string): string {
  return svg.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, css) => {
    if (css.includes("<![CDATA[")) return match
    return `<style${attrs}><![CDATA[\n${css}\n]]></style>`
  })
}

function parseSvgElement(svgString: string): SVGSVGElement | null {
  try {
    const xmlSafe = wrapStylesInCdata(svgString)
    const xmlDoc = new DOMParser().parseFromString(xmlSafe, "image/svg+xml")
    const xmlErr = xmlDoc.querySelector("parsererror")
    if (!xmlErr) {
      const el = xmlDoc.documentElement as unknown as SVGSVGElement
      if (el.tagName.toLowerCase() === "svg") return el
    }
  } catch {}
  try {
    const container = document.createElement("div")
    container.innerHTML = svgString
    const svgEl = container.querySelector("svg")
    if (svgEl) return svgEl as unknown as SVGSVGElement
  } catch {}
  return null
}

async function readSSEStream(
  response: Response,
  onChunk: (fullText: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response stream")
  const decoder = new TextDecoder()
  let fullText = ""
  let buffer = ""
  while (true) {
    if (signal?.aborted) { reader.cancel(); throw new DOMException("Aborted", "AbortError") }
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data: ")) continue
      const payload = trimmed.slice(6)
      if (payload === "[DONE]") continue
      try {
        const parsed = JSON.parse(payload)
        if (typeof parsed === "object" && parsed !== null && parsed.error) throw new Error(parsed.error)
        if (typeof parsed === "string") { fullText += parsed; onChunk(fullText) }
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith("Unexpected token")) throw e
      }
    }
  }
  return fullText
}

export function SvgGenerator() {
  const { user } = useAuth()
  const { save: saveProject, isSaving: isSavingProject } = useSaveProject("svg-generator")
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPT)
  const [svgContent, setSvgContent] = useState(EXAMPLE_SVG)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview")
  const [mode, setMode] = useState<"static" | "animated">("static")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<"idle" | "thinking" | "streaming" | "done">("idle")
  const [isExample, setIsExample] = useState(true)
  const [exampleIndex, setExampleIndex] = useState(0)
  const [optimizedSvg, setOptimizedSvg] = useState<string | null>(null)
  const [optimizeStats, setOptimizeStats] = useState<{ originalSize: number; optimizedSize: number; percent: number } | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showOptimized, setShowOptimized] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const previewWrapperRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const codeRef = useRef<HTMLDivElement>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const streamingContainerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [svgParseError, setSvgParseError] = useState(false)

  const rawCompleteSvg = extractSvg(svgContent, !isGenerating)
  const completeSvg = showOptimized && optimizedSvg ? optimizedSvg : rawCompleteSvg
  const hasSvg = rawCompleteSvg.length > 0

  useEffect(() => {
    const container = svgContainerRef.current
    if (!container) return
    container.innerHTML = ""
    setSvgParseError(false)
    if (!hasSvg || isGenerating) return
    const svgEl = parseSvgElement(completeSvg)
    if (!svgEl) { setSvgParseError(true); return }
    const imported = document.importNode(svgEl, true) as SVGSVGElement
    imported.style.maxWidth = "100%"
    imported.style.maxHeight = "100%"
    imported.style.width = "auto"
    imported.style.height = "auto"
    imported.style.display = "block"
    if (!imported.getAttribute("viewBox") && imported.getAttribute("width") && imported.getAttribute("height")) {
      imported.setAttribute("viewBox", `0 0 ${imported.getAttribute("width")!.replace("px", "")} ${imported.getAttribute("height")!.replace("px", "")}`)
    }
    imported.removeAttribute("width")
    imported.removeAttribute("height")
    container.appendChild(imported)
  }, [completeSvg, hasSvg, isGenerating])

  useEffect(() => {
    const container = streamingContainerRef.current
    if (!container) return
    if (!isGenerating) { container.innerHTML = ""; return }
    const partial = extractPartialSvg(svgContent)
    if (!partial) { container.innerHTML = ""; return }
    try {
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = partial
      const svgEl = tempDiv.querySelector("svg")
      if (svgEl) {
        svgEl.style.display = "block"
        if (!svgEl.getAttribute("viewBox") && svgEl.getAttribute("width") && svgEl.getAttribute("height")) {
          svgEl.setAttribute("viewBox", `0 0 ${svgEl.getAttribute("width")!.replace("px", "")} ${svgEl.getAttribute("height")!.replace("px", "")}`)
        }
        svgEl.removeAttribute("width")
        svgEl.removeAttribute("height")
        svgEl.style.maxWidth = "100%"
        svgEl.style.maxHeight = "100%"
        svgEl.style.width = "auto"
        svgEl.style.height = "auto"
        container.innerHTML = ""
        container.appendChild(svgEl)
      }
    } catch {}
  }, [svgContent, isGenerating])

  const startProgressTimer = useCallback(() => {
    progressRef.current = 0
    setProgress(0)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    progressIntervalRef.current = setInterval(() => {
      const p = progressRef.current
      let increment = p >= 95 ? 0 : p >= 90 ? 0.05 : p >= 80 ? 0.1 : p >= 60 ? 0.15 : p >= 40 ? 0.2 : p >= 20 ? 0.25 : 0.3
      progressRef.current = Math.min(p + increment, 95)
      setProgress(progressRef.current)
    }, 300)
  }, [])

  const stopProgressTimer = useCallback(() => {
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }
  }, [])

  const optimizeSvg = useCallback(async (svg: string) => {
    setIsOptimizing(true)
    try {
      const res = await fetch("/api/optimize-svg", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ svg }) })
      if (!res.ok) return
      const data = await res.json()
      setOptimizedSvg(data.svg)
      setOptimizeStats({ originalSize: data.originalSize, optimizedSize: data.optimizedSize, percent: data.percent })
    } catch {} finally { setIsOptimizing(false) }
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!user) return
    if (!prompt.trim() || isGenerating) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    if (svgContainerRef.current) svgContainerRef.current.innerHTML = ""
    if (streamingContainerRef.current) streamingContainerRef.current.innerHTML = ""
    setIsGenerating(true)
    setError(null)
    setSvgContent("")
    setOptimizedSvg(null)
    setOptimizeStats(null)
    setActiveTab("preview")
    setPhase("thinking")
    setIsExample(false)
    startProgressTimer()
    try {
      const res = await fetch("/api/generate-svg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), mode, aspectRatio }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`Generation failed (${res.status})`)
      setPhase("streaming")
      const fullText = await readSSEStream(res, (acc) => setSvgContent(acc), controller.signal)
      setSvgContent(fullText)
      stopProgressTimer()
      const hasSvgEnd = fullText.includes("</svg>")
      const hasSvgStart = fullText.includes("<svg")
      if (hasSvgStart && !hasSvgEnd) {
        setError("تم قطع التوليد. جرب وصفاً أبسط.")
        setProgress(100)
        setPhase("done")
      } else if (!hasSvgStart) {
        setError("لم يتم توليد SVG. جرب وصفاً مختلفاً.")
        setProgress(0)
        setPhase("idle")
      } else {
        setProgress(100)
        setPhase("done")
        const finalSvg = extractSvg(fullText, true)
        if (finalSvg) optimizeSvg(finalSvg)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "حدث خطأ")
      stopProgressTimer()
      setProgress(0)
      setPhase("idle")
    } finally { stopProgressTimer(); setIsGenerating(false) }
  }, [user, prompt, isGenerating, mode, aspectRatio, startProgressTimer, stopProgressTimer, optimizeSvg])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    stopProgressTimer()
    setIsGenerating(false)
    setProgress(0)
    setPhase("idle")
  }, [stopProgressTimer])

  const handleCopy = useCallback(async () => {
    if (!completeSvg) return
    try { await navigator.clipboard.writeText(completeSvg) } catch {
      const ta = document.createElement("textarea")
      ta.value = completeSvg
      ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0"
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [completeSvg])

  const handleDownload = useCallback(() => {
    if (!completeSvg) return
    const safeSvg = wrapStylesInCdata(completeSvg)
    const blob = new Blob([safeSvg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "generated.svg"
    a.click()
    URL.revokeObjectURL(url)
  }, [completeSvg])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleGenerate() }
  }, [handleGenerate])

  useEffect(() => {
    if (activeTab === "code" && codeRef.current && isGenerating) codeRef.current.scrollTop = codeRef.current.scrollHeight
  }, [svgContent, activeTab, isGenerating])

  useEffect(() => { return () => { stopProgressTimer() } }, [stopProgressTimer])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = -e.deltaY * 0.001
    setZoom((z) => Math.min(Math.max(z + delta * z, 0.1), 10))
  }, [])

  useEffect(() => {
    const el = previewWrapperRef.current
    if (!el) return
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsPanning(true)
      panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY }
    }
  }, [panX, panY])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setPanX(panStartRef.current.panX + (e.clientX - panStartRef.current.x))
    setPanY(panStartRef.current.panY + (e.clientY - panStartRef.current.y))
  }, [isPanning])

  const handlePanEnd = useCallback(() => { setIsPanning(false) }, [])

  const resetZoom = useCallback(() => { setZoom(1); setPanX(0); setPanY(0) }, [])

  useEffect(() => {
    if (!isGenerating && hasSvg) resetZoom()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating])

  const checkerBg = {
    backgroundImage: [
      "linear-gradient(45deg, #f0f0f0 25%, transparent 25%)",
      "linear-gradient(-45deg, #f0f0f0 25%, transparent 25%)",
      "linear-gradient(45deg, transparent 75%, #f0f0f0 75%)",
      "linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)",
    ].join(", "),
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
    backgroundColor: "#ffffff",
  }

  const darkCheckerBg = {
    backgroundImage: [
      "linear-gradient(45deg, #1a1a1a 25%, transparent 25%)",
      "linear-gradient(-45deg, #1a1a1a 25%, transparent 25%)",
      "linear-gradient(45deg, transparent 75%, #1a1a1a 75%)",
      "linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)",
    ].join(", "),
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
    backgroundColor: "#141414",
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:flex-row rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden bg-white dark:bg-[#0F0F12]">
      <aside className="flex max-h-[50vh] w-full shrink-0 flex-col border-b border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418] md:max-h-none md:w-72 md:border-b-0 md:border-s lg:w-80">
        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">الوضع</label>
            <div className="flex gap-2">
              {(["static", "animated"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  disabled={isGenerating}
                  className={`flex-1 rounded-lg border py-2 text-center text-sm font-medium transition-colors disabled:opacity-50 ${
                    mode === m
                      ? "border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                      : "border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#1F1F23]"
                  }`}
                >
                  {m === "static" ? "ثابت" : "متحرك"}
                </button>
              ))}
            </div>
          </div>

          <div className="my-4 border-t border-gray-200 dark:border-[#1F1F23]" />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">نسبة الأبعاد</span>
            <div className="grid grid-cols-4 gap-1.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  type="button"
                  onClick={() => setAspectRatio(ar.value)}
                  disabled={isGenerating}
                  className={`rounded-lg border py-2 text-center text-sm font-medium transition-colors disabled:opacity-50 ${
                    aspectRatio === ar.value
                      ? "border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                      : "border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#1F1F23]"
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          <div className="my-4 border-t border-gray-200 dark:border-[#1F1F23]" />

          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">الوصف</label>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  setPrompt(EXAMPLE_PROMPTS[exampleIndex % EXAMPLE_PROMPTS.length])
                  setExampleIndex((i) => i + 1)
                }}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-[#1F1F23] px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
              >
                <Dices className="size-3" />
                عشوائي
              </button>
            </div>
            <Textarea
              placeholder="صِف الرسم الذي تريده..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 resize-none text-sm leading-relaxed"
              style={{ minHeight: "120px" }}
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              <kbd className="rounded border border-gray-200 dark:border-[#1F1F23] px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>
              {" + "}
              <kbd className="rounded border border-gray-200 dark:border-[#1F1F23] px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
              {" للتوليد"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-gray-200 dark:border-[#1F1F23] p-4">
          <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" size="lg">
            {isGenerating ? (
              <><Loader2 className="animate-spin ml-2" />{`${Math.round(progress)}% — ${phase === "thinking" ? "يُجهّز" : "يُولّد"}...`}</>
            ) : (
              <><Sparkles className="ml-2" />توليد SVG</>
            )}
          </Button>
          {isGenerating && (
            <Button variant="outline" size="lg" onClick={handleCancel} className="shrink-0">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#0F0F12]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-[#1F1F23] px-3 py-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-100 dark:bg-[#141418] p-0.5">
            {(["preview", "code"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {tab === "preview" ? <Eye className="size-3.5" /> : <Code className="size-3.5" />}
                {tab === "preview" ? "معاينة" : "الكود"}
              </button>
            ))}
          </div>

          {isExample && activeTab === "preview" && (
            <span className="rounded-md border border-dashed border-gray-300 dark:border-[#1F1F23] px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">مثال</span>
          )}

          {activeTab === "preview" && hasSvg && !isGenerating && (
            <div className="hidden items-center gap-2 sm:flex">
              <ZoomOut className="size-3 text-gray-500" />
              <input type="range" min={10} max={500} step={1} value={Math.round(zoom * 100)} onChange={(e) => setZoom(Number(e.target.value) / 100)} className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-[#1F1F23] accent-purple-500 md:w-28" />
              <ZoomIn className="size-3 text-gray-500" />
              <button type="button" onClick={resetZoom} className="min-w-10 rounded px-1.5 py-0.5 text-center font-mono text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white">
                {Math.round(zoom * 100)}%
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isOptimizing && <span className="flex items-center gap-1.5 text-xs text-gray-500"><Loader2 className="size-3 animate-spin" />يُحسّن...</span>}
            {optimizeStats && !isOptimizing && (
              <button
                type="button"
                onClick={() => setShowOptimized((v) => !v)}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                  showOptimized
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    : "border-gray-200 dark:border-[#1F1F23] text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {showOptimized ? "محسّن" : "أصلي"}
                <span className="text-gray-400">{formatBytes(showOptimized ? optimizeStats.optimizedSize : optimizeStats.originalSize)}</span>
                {showOptimized && optimizeStats.percent > 0 && <span className="text-emerald-500">-{optimizeStats.percent}%</span>}
              </button>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!hasSvg}>
              {copied ? <><Check className="size-3.5" /><span className="hidden sm:inline">تم النسخ</span></> : <><Copy className="size-3.5" /><span className="hidden sm:inline">نسخ</span></>}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!hasSvg}>
              <Download className="size-3.5" /><span className="hidden sm:inline">تحميل</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => saveProject({ title: prompt.slice(0, 40), data: { prompt, svgContent }, thumbnail: svgContent ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}` : undefined })} disabled={!hasSvg || isSavingProject}>
              {isSavingProject ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}<span className="hidden sm:inline">حفظ</span>
            </Button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0" style={{ display: activeTab === "preview" ? "flex" : "none", ...checkerBg }}>
            {isGenerating ? (
              <div key="streaming-view" className="relative flex h-full w-full overflow-hidden">
                <div ref={streamingContainerRef} className="flex h-full w-full items-center justify-center p-4" />
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute inset-y-0 right-0 transition-[width] duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: "rgba(40, 40, 40, 0.55)" }}>
                    <div className="absolute inset-y-0 w-1/3" style={{ background: "linear-gradient(to left, transparent, rgba(255,255,255,0.06), transparent)", animation: "shimmerSweep 2s ease-in-out infinite" }} />
                  </div>
                  <div className="absolute inset-y-0 transition-[right] duration-500 ease-out" style={{ right: `${progress}%`, transform: "translateX(50%)", width: "60px", background: "linear-gradient(to left, transparent, rgba(168,85,247,0.55), rgba(168,85,247,0.75), rgba(168,85,247,0.55), transparent)", filter: "blur(8px)", animation: "glowPulse 1.2s ease-in-out infinite" }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <span className="font-sans text-7xl font-extrabold tabular-nums text-gray-900 dark:text-white/80 md:text-8xl">{Math.round(progress)}%</span>
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <Loader2 className="size-4 animate-spin" />{phase === "thinking" ? "يُجهّز SVG..." : "يبث..."}
                    </span>
                  </div>
                </div>
                <style>{`@keyframes glowPulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } } @keyframes shimmerSweep { 0% { right: -33%; } 100% { right: 133%; } }`}</style>
              </div>
            ) : hasSvg && !svgParseError ? (
              <div key="preview-view" className="flex h-full w-full flex-col">
                {error && (
                  <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 px-4 py-2">
                    <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="flex-1 text-xs text-amber-800 dark:text-amber-200">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleGenerate} className="text-xs">إعادة</Button>
                  </div>
                )}
                <div ref={previewWrapperRef} className="relative min-h-0 flex-1 overflow-hidden" onMouseDown={handlePanStart} onMouseMove={handlePanMove} onMouseUp={handlePanEnd} onMouseLeave={handlePanEnd} onDoubleClick={resetZoom} style={{ cursor: isPanning ? "grabbing" : zoom !== 1 ? "grab" : "default" }}>
                  <div ref={svgContainerRef} className="flex h-full w-full items-center justify-center p-4" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: "center center", transition: isPanning ? "none" : "transform 0.15s ease-out" }} role="img" aria-label="Generated SVG preview" />
                </div>
              </div>
            ) : error || svgParseError ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10"><AlertCircle className="size-6 text-red-500" /></div>
                  <p className="font-medium text-gray-900 dark:text-white">{svgParseError ? "لم يتم عرض SVG" : "فشل التوليد"}</p>
                  <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{svgParseError ? "لا يمكن عرض SVG. انتقل لتبويب الكود." : error}</p>
                  <Button variant="outline" size="sm" onClick={handleGenerate}>حاول مرة أخرى</Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white dark:bg-[#0F0F12]" style={darkCheckerBg}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-[#1F1F23]"><Sparkles className="size-7 text-gray-400" /></div>
                  <p className="font-medium text-gray-900 dark:text-white">لا يوجد SVG بعد</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">أدخل وصفاً واضغط توليد SVG</p>
                </div>
              </div>
            )}
          </div>

          <div ref={codeRef} className="absolute inset-0 overflow-auto bg-gray-50/30 dark:bg-[#141418]/30" style={{ display: activeTab === "code" ? "block" : "none" }}>
            {svgContent ? (
              <pre className="min-h-full p-5 text-sm leading-relaxed text-gray-900 dark:text-white"><code className="block whitespace-pre-wrap break-words font-mono">{hasSvg ? completeSvg : svgContent}</code></pre>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">سيظهر كود SVG هنا</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
