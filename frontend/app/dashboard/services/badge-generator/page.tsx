"use client"

import type React from "react"
import Image from "next/image"
import { useState, useTransition, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Camera,
  Upload,
  Grid3x3,
  X,
  ImageIcon,
  Download,
  RotateCcw,
  History,
  Settings,
  ArrowRight,
  ChevronDown,
  Save,
  Loader2,
} from "lucide-react"
import { BadgePreview } from "@/components/badge/badge-preview"
import { toPng } from "html-to-image"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { convertImageToPixelArt, DEFAULT_PIXEL_OPTIONS, PALETTE_PRESETS } from "@/lib/image-to-pixelart"
import { useSaveProject } from "@/hooks/use-save-project"

type GenerationMetadata = {
  requestId: string
  imageUrl: string
  createdAt: number
}

export default function BadgeStudioPage() {
  const { save: saveProject, isSaving: isSavingProject } = useSaveProject("badge-generator")
  const [eventName, setEventName] = useState("CVSIRA")
  const [eventDate, setEventDate] = useState("2025")
  const [badgeNumber, setBadgeNumber] = useState("0001")
  const [backgroundColor, setBackgroundColor] = useState("#262629")
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoText, setLogoText] = useState("your logo or name")
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [isInvert, setIsInvert] = useState(false)
  const [imageFilter, setImageFilter] = useState("sketch")
  const [imageScale, setImageScale] = useState(100)
  const [imagePositionX, setImagePositionX] = useState(50)
  const [imagePositionY, setImagePositionY] = useState(50)

  const [matrixEnabled, setMatrixEnabled] = useState(false)
  const [matrixHue, setMatrixHue] = useState(120)
  const [matrixSpeed, setMatrixSpeed] = useState(1)
  const [matrixDepth, setMatrixDepth] = useState(6)
  const [matrixChars, setMatrixChars] = useState("01")
  const [matrixCharSet, setMatrixCharSet] = useState<"01" | "japanese" | "blocks" | "alpha" | "custom">("01")
  const [customChars, setCustomChars] = useState("")
  const [matrixScale, setMatrixScale] = useState(100)
  const [matrixPositionX, setMatrixPositionX] = useState(50)
  const [matrixPositionY, setMatrixPositionY] = useState(50)

  const [openSection, setOpenSection] = useState<"presets" | "details" | "imageFormat" | "assets" | "matrix" | "converter" | null>(null)

  const openSections = {
    presets: openSection === "presets",
    details: openSection === "details",
    imageFormat: openSection === "imageFormat",
    assets: openSection === "assets",
    matrix: openSection === "matrix",
    converter: openSection === "converter",
  }

  const [pixelGridSize, setPixelGridSize] = useState(DEFAULT_PIXEL_OPTIONS.gridSize)
  const [pixelBrightness, setPixelBrightness] = useState(DEFAULT_PIXEL_OPTIONS.brightness)
  const [pixelContrast, setPixelContrast] = useState(DEFAULT_PIXEL_OPTIONS.contrast)
  const [pixelRemoveBg, setPixelRemoveBg] = useState(DEFAULT_PIXEL_OPTIONS.removeBg)
  const [pixelBgThreshold, setPixelBgThreshold] = useState(DEFAULT_PIXEL_OPTIONS.bgThreshold)
  const [pixelAlphaThreshold, setPixelAlphaThreshold] = useState(DEFAULT_PIXEL_OPTIONS.alphaThreshold)
  const [pixelEdgeSoftness, setPixelEdgeSoftness] = useState(DEFAULT_PIXEL_OPTIONS.edgeSoftness)
  const [pixelPalette, setPixelPalette] = useState(DEFAULT_PIXEL_OPTIONS.palette)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)

  const [generationError, setGenerationError] = useState<string | null>(null)
  const [galleryItems, setGalleryItems] = useState<GenerationMetadata[]>([])
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [showPlaceholder, setShowPlaceholder] = useState(true)

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      setStream(mediaStream)
      setShowCameraModal(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (error) {
      console.error("Camera access error:", error)
      cameraInputRef.current?.click()
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" })
            const dataUrl = canvas.toDataURL("image/jpeg")
            closeCamera()
            processImage(file, dataUrl)
          }
        },
        "image/jpeg",
        0.95,
      )
    }
  }

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setShowCameraModal(false)
  }

  const processImage = (file: File, dataUrl: string) => {
    setGenerationError(null)
    setResultUrl(null)
    const img = document.createElement("img")
    img.onload = () => {
      setImageFile(file)
      setPreviewUrl(dataUrl)
      setIsGenerating(true)
      generatePixelArt(dataUrl)
    }
    img.onerror = () => {
      setGenerationError("فشل تحميل الصورة. حاول مرة أخرى.")
    }
    img.src = dataUrl
  }

  const generatePixelArt = (base64String: string) => {
    startTransition(async () => {
      try {
        const pixelArtDataUrl = await convertImageToPixelArt(base64String, {
          gridSize: pixelGridSize,
          brightness: pixelBrightness,
          contrast: pixelContrast,
          removeBg: pixelRemoveBg,
          bgThreshold: pixelBgThreshold,
          alphaThreshold: pixelAlphaThreshold,
          edgeSoftness: pixelEdgeSoftness,
          palette: pixelPalette,
        })
        setResultUrl(pixelArtDataUrl)
        setGalleryItems((prev) => [
          { requestId: `local-${Date.now()}`, imageUrl: pixelArtDataUrl, createdAt: Date.now() },
          ...prev,
        ])
      } catch (error) {
        setGenerationError((error as Error).message || "فشل توليد البكسل آرت. حاول مرة أخرى.")
      } finally {
        setIsGenerating(false)
      }
    })
  }

  useEffect(() => {
    if (!previewUrl || isGenerating) return
    const timer = setTimeout(() => {
      setIsGenerating(true)
      generatePixelArt(previewUrl)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelGridSize, pixelBrightness, pixelContrast, pixelRemoveBg, pixelBgThreshold, pixelAlphaThreshold, pixelEdgeSoftness, pixelPalette])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      e.target.value = ""
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        processImage(file, base64String)
      }
      reader.onerror = () => {
        setGenerationError("فشل قراءة الملف. حاول مرة أخرى.")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    }
  }

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setBackgroundFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setBackgroundImage(reader.result as string)
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    }
  }

  const handleDownloadBadge = async () => {
    if (!badgeRef.current) return
    try {
      const dataUrl = await toPng(badgeRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        includeQueryParams: true,
        filter: (node) => {
          if (node.classList) {
            return !node.classList.contains("badge-helper")
          }
          return true
        },
      })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `badge-${badgeNumber}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const applyPreset = (preset: string) => {
    setShowPlaceholder(false)
    if (preset === "dark") {
      setEventName("CVSIRA")
      setEventDate("2025")
      setBackgroundColor("#262629")
      setBackgroundImage(null)
      setImageFilter("sketch")
      setIsInvert(false)
      setLogoUrl(null)
      setLogoText("your logo or name")
    } else if (preset === "neutral") {
      setEventName("EVENT")
      setEventDate("STYLE")
      setBackgroundColor("#491d26")
      setBackgroundImage(null)
      setImageFilter("none")
      setIsInvert(false)
      setLogoUrl(null)
      setLogoText("your logo or name")
    } else if (preset === "black") {
      setEventName("CONF")
      setEventDate("2025")
      setBackgroundColor("#000000")
      setBackgroundImage(null)
      setImageFilter("grayscale")
      setIsInvert(true)
      setLogoUrl(null)
      setLogoText("your logo or name")
    } else if (preset === "blue") {
      setEventName("TECH")
      setEventDate("SUMMIT")
      setBackgroundColor("#4275B2")
      setBackgroundImage(null)
      setImageFilter("blue")
      setIsInvert(false)
      setLogoUrl(null)
      setLogoText("your logo or name")
    }
  }

  const resetBadgeConfig = () => {
    setShowPlaceholder(true)
    setEventName("CVSIRA")
    setEventDate("2025")
    setBadgeNumber("0001")
    setBackgroundColor("#262629")
    setBackgroundImage(null)
    setImageFilter("sketch")
    setIsInvert(false)
    setImageScale(100)
    setImagePositionX(50)
    setImagePositionY(50)
    setLogoUrl(null)
    setLogoText("your logo or name")
    setLogoFile(null)
    setBackgroundFile(null)
    setMatrixEnabled(false)
    setMatrixHue(120)
    setMatrixSpeed(1)
    setMatrixDepth(6)
    setMatrixChars("01")
    setMatrixCharSet("01")
    setCustomChars("")
    setMatrixScale(100)
    setMatrixPositionX(50)
    setMatrixPositionY(50)
    setPixelGridSize(DEFAULT_PIXEL_OPTIONS.gridSize)
    setPixelBrightness(DEFAULT_PIXEL_OPTIONS.brightness)
    setPixelContrast(DEFAULT_PIXEL_OPTIONS.contrast)
    setPixelRemoveBg(DEFAULT_PIXEL_OPTIONS.removeBg)
    setPixelBgThreshold(DEFAULT_PIXEL_OPTIONS.bgThreshold)
    setPixelAlphaThreshold(DEFAULT_PIXEL_OPTIONS.alphaThreshold)
    setPixelEdgeSoftness(DEFAULT_PIXEL_OPTIONS.edgeSoftness)
    setPixelPalette(DEFAULT_PIXEL_OPTIONS.palette)
  }

  const CHAR_SETS: Record<string, { label: string; value: string }> = {
    "01": { label: "01", value: "01" },
    japanese: { label: "日本", value: "アイウエオカキクケコサシスセソタチツテト" },
    blocks: { label: "█▓", value: "█▓▒░▪▫■□" },
    alpha: { label: "A-Z", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" },
    custom: { label: "مخصص", value: customChars },
  }

  const handleCharSetChange = (key: string) => {
    setMatrixCharSet(key as typeof matrixCharSet)
    if (key === "custom") {
      setMatrixChars(customChars || "01")
    } else {
      setMatrixChars(CHAR_SETS[key].value)
    }
  }

  const handleCustomCharsChange = (value: string) => {
    setCustomChars(value)
    if (matrixCharSet === "custom") {
      setMatrixChars(value || "01")
    }
  }

  const toggleSection = (key: "presets" | "details" | "imageFormat" | "assets" | "matrix" | "converter") => {
    setOpenSection((prev) => (prev === key ? null : key))
    setShowPlaceholder(false)
  }

  const SettingsContent = useMemo(() => {
    return (
      <div className="space-y-2">
        <Collapsible open={openSections.presets} onOpenChange={() => toggleSection("presets")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition-all hover:bg-white/10">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-white/70">قوالب سريعة</h4>
            <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${openSections.presets ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2">
              <div className="hidden lg:grid lg:grid-cols-2 lg:gap-2">
                {[
                  { key: "dark", label: "داكن", sub: "Sketch Style", color: "#262629" },
                  { key: "black", label: "أبيض وأسود", sub: "B&W", color: "#000000" },
                  { key: "blue", label: "أزرق مزدوج", sub: "Duotone Blue", color: "#4275B2" },
                  { key: "neutral", label: "ملون", sub: "Color", color: "#491d26" },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-right transition-all hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 flex-shrink-0 rounded border border-white/20" style={{ backgroundColor: p.color }} />
                      <div>
                        <div className="font-mono text-[10px] font-semibold text-white">{p.label}</div>
                        <div className="font-mono text-[9px] text-white/50">{p.sub}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="lg:hidden">
                <select
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white backdrop-blur-sm focus:border-white/20 focus:outline-none"
                >
                  <option value="dark">داكن - Sketch</option>
                  <option value="black">أبيض وأسود - B&W</option>
                  <option value="blue">أزرق مزدوج - Duotone</option>
                  <option value="neutral">ملون - Color</option>
                </select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={openSections.details} onOpenChange={() => toggleSection("details")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition-all hover:bg-white/10">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-white/70">تفاصيل البطاقة</h4>
            <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${openSections.details ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 pt-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">اسم الحدث</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white placeholder-white/30 backdrop-blur-sm focus:border-white/20 focus:outline-none"
                  placeholder="CVSIRA"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">التاريخ / الموقع</label>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white placeholder-white/30 backdrop-blur-sm focus:border-white/20 focus:outline-none"
                  placeholder="2025"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">رقم البطاقة</label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white placeholder-white/30 backdrop-blur-sm focus:border-white/20 focus:outline-none"
                  placeholder="0001"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">لون الخلفية</label>
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded-lg border border-white/10 bg-white/5"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[10px] text-white placeholder-white/30 backdrop-blur-sm focus:border-white/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={openSections.imageFormat} onOpenChange={() => toggleSection("imageFormat")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition-all hover:bg-white/10">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-white/70">تنسيق الصورة</h4>
            <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${openSections.imageFormat ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 pt-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">نمط الصورة</label>
                <div className="hidden lg:grid lg:grid-cols-2 lg:gap-1">
                  {[
                    { key: "none", label: "ملون", gradient: "from-red-500 via-green-500 to-blue-500" },
                    { key: "grayscale", label: "أبيض وأسود", gradient: "from-gray-700 via-gray-500 to-gray-300" },
                    { key: "blue", label: "أزرق", gradient: "from-blue-900 via-blue-600 to-blue-300" },
                    { key: "sketch", label: "رسم", gradient: "from-gray-800 via-gray-400 to-white" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setImageFilter(f.key)}
                      className={`group relative overflow-hidden rounded-lg border px-2 py-1.5 text-left font-mono text-xs transition-all ${
                        imageFilter === f.key
                          ? "border-white/40 bg-white/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-3.5 w-3.5 rounded border border-white/20 bg-gradient-to-br ${f.gradient}`} />
                        <span>{f.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <select
                  value={imageFilter}
                  onChange={(e) => setImageFilter(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-xs text-white backdrop-blur-sm focus:border-white/20 focus:outline-none lg:hidden"
                >
                  <option value="none">ملون</option>
                  <option value="grayscale">أبيض وأسود</option>
                  <option value="blue">أزرق مزدوج</option>
                  <option value="sketch">رسم Sketch</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">تكبير: {imageScale}%</label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={imageScale}
                  onChange={(e) => setImageScale(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">الموضع X: {imagePositionX}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={imagePositionX}
                  onChange={(e) => setImagePositionX(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">الموضع Y: {imagePositionY}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={imagePositionY}
                  onChange={(e) => setImagePositionY(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={openSections.assets} onOpenChange={() => toggleSection("assets")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition-all hover:bg-white/10">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-white/70">الأصول</h4>
            <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${openSections.assets ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">شعار الحدث</label>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-xs text-white backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span className="truncate">{logoFile ? logoFile.name : "رفع شعار"}</span>
                  </button>
                  {!logoUrl && (
                    <input
                      type="text"
                      value={logoText}
                      onChange={(e) => setLogoText(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white placeholder-white/30 backdrop-blur-sm focus:border-white/20 focus:outline-none"
                      placeholder="your logo or name"
                    />
                  )}
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">صورة الخلفية</label>
                  <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => backgroundInputRef.current?.click()}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-xs text-white backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span className="truncate">{backgroundFile ? backgroundFile.name : "رفع خلفية"}</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="invert-toggle"
                  checked={isInvert}
                  onChange={(e) => setIsInvert(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-white/10 bg-white/5 text-white accent-white"
                />
                <label
                  htmlFor="invert-toggle"
                  className="cursor-pointer font-mono text-[10px] uppercase tracking-wide text-white/60 hover:text-white/80"
                >
                  عكس الشعار
                </label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={openSections.converter} onOpenChange={() => toggleSection("converter")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition-all hover:bg-white/10">
            <div className="flex items-center gap-2">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-white/70">إعدادات المحول</h4>
              <span className="font-mono text-[9px] text-white/40">{previewUrl ? "●" : "○"}</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${openSections.converter ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pt-2">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-white/60">البالتة</label>
                <div className="grid grid-cols-4 gap-1">
                  {Object.entries(PALETTE_PRESETS).map(([key, { label }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPixelPalette(key)}
                      className={`px-1 py-1.5 text-[10px] font-mono border rounded transition-colors ${
                        pixelPalette === key
                          ? "border-white/40 bg-white/10 text-white"
                          : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">حجم البكسل: {pixelGridSize}px</label>
                <input
                  type="range"
                  min="4"
                  max="32"
                  step="2"
                  value={pixelGridSize}
                  onChange={(e) => setPixelGridSize(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                />
                <div className="mt-0.5 flex justify-between font-mono text-[8px] text-white/30">
                  <span>دقيق</span>
                  <span>خشن</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">السطوع: {pixelBrightness > 0 ? "+" : ""}{pixelBrightness}</label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={pixelBrightness}
                  onChange={(e) => setPixelBrightness(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">التباين: {pixelContrast > 0 ? "+" : ""}{pixelContrast}</label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={pixelContrast}
                  onChange={(e) => setPixelContrast(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                />
              </div>

              <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-white/60">إزالة الخلفية</span>
                  <input
                    type="checkbox"
                    checked={pixelRemoveBg}
                    onChange={(e) => setPixelRemoveBg(e.target.checked)}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-white/10 bg-white/5 accent-white"
                  />
                </div>

                {pixelRemoveBg && (
                  <>
                    <div>
                      <label className="mb-0.5 block font-mono text-[10px] text-white/50">عتبة الخلفية: {pixelBgThreshold}</label>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        step="5"
                        value={pixelBgThreshold}
                        onChange={(e) => setPixelBgThreshold(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block font-mono text-[10px] text-white/50">نعومة الحواف: {pixelEdgeSoftness}%</label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={pixelEdgeSoftness}
                        onChange={(e) => setPixelEdgeSoftness(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block font-mono text-[10px] text-white/50">حد الشفافية: {pixelAlphaThreshold}</label>
                      <input
                        type="range"
                        min="0"
                        max="128"
                        step="5"
                        value={pixelAlphaThreshold}
                        onChange={(e) => setPixelAlphaThreshold(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                      />
                    </div>
                  </>
                )}
              </div>

              {previewUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setIsGenerating(true)
                    generatePixelArt(previewUrl)
                  }}
                  disabled={isGenerating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isGenerating ? "جارٍ التوليد..." : "إعادة التوليد"}
                </button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={openSections.matrix} onOpenChange={() => toggleSection("matrix")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition-all hover:bg-white/10">
            <div className="flex items-center gap-2">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-white/70">تأثير الماتريكس</h4>
              <span className="font-mono text-[9px] text-white/40">{matrixEnabled ? "●" : "○"}</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${openSections.matrix ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-white/50">{matrixEnabled ? "مفعّل" : "معطّل"}</span>
                <input
                  type="checkbox"
                  id="matrix-toggle"
                  checked={matrixEnabled}
                  onChange={(e) => setMatrixEnabled(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-white/10 bg-white/5 text-white accent-white"
                />
              </div>

              {matrixEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wide text-white/60">المجموعة</label>
                    <div className="grid grid-cols-5 gap-1">
                      {Object.entries(CHAR_SETS).map(([key, { label }]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleCharSetChange(key)}
                          className={`px-1 py-1.5 text-[10px] font-mono border rounded transition-colors ${
                            matrixCharSet === key
                              ? "border-green-500 bg-green-500/10 text-green-400"
                              : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {matrixCharSet === "custom" && (
                      <input
                        type="text"
                        value={customChars}
                        onChange={(e) => handleCustomCharsChange(e.target.value)}
                        placeholder="أدخل الرموز المخصصة..."
                        className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[10px] text-white placeholder-white/30 backdrop-blur-sm focus:border-white/20 focus:outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">اللون: {matrixHue}°</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="10"
                      value={matrixHue}
                      onChange={(e) => setMatrixHue(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                    />
                    <div className="mt-1 flex gap-1">
                      {[120, 180, 240, 300, 0, 60].map((hue) => (
                        <button
                          key={hue}
                          type="button"
                          onClick={() => setMatrixHue(hue)}
                          className={`h-4 w-4 rounded border ${matrixHue === hue ? "border-white/60" : "border-white/20"}`}
                          style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">السرعة: {matrixSpeed.toFixed(1)}x</label>
                    <input
                      type="range"
                      min="0.2"
                      max="3"
                      step="0.2"
                      value={matrixSpeed}
                      onChange={(e) => setMatrixSpeed(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">العمق: {matrixDepth}</label>
                    <input
                      type="range"
                      min="3"
                      max="8"
                      step="1"
                      value={matrixDepth}
                      onChange={(e) => setMatrixDepth(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">تكبير: {matrixScale}%</label>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="5"
                      value={matrixScale}
                      onChange={(e) => setMatrixScale(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">الموضع X: {matrixPositionX}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={matrixPositionX}
                      onChange={(e) => setMatrixPositionX(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-white/60">الموضع Y: {matrixPositionY}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={matrixPositionY}
                      onChange={(e) => setMatrixPositionY(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }, [
    eventName, eventDate, badgeNumber, backgroundColor, backgroundImage,
    imageFilter, imageScale, imagePositionX, imagePositionY,
    logoFile, backgroundFile, isInvert, logoUrl, logoText,
    matrixEnabled, matrixHue, matrixSpeed, matrixDepth, matrixChars,
    matrixCharSet, customChars, matrixScale, matrixPositionX, matrixPositionY, openSection,
    pixelGridSize, pixelBrightness, pixelContrast, pixelRemoveBg,
    pixelBgThreshold, pixelAlphaThreshold, pixelEdgeSoftness, pixelPalette,
    previewUrl, isGenerating, showPlaceholder,
  ])

  return (
    <div className="flex min-h-dvh flex-col bg-black rounded-xl overflow-hidden">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="duotone-blue">
            <feColorMatrix type="saturate" values="0" result="grayscale" />
            <feComponentTransfer result="contrast">
              <feFuncR type="gamma" amplitude="1.0" exponent="0.4" offset="0" />
              <feFuncG type="gamma" amplitude="1.0" exponent="0.4" offset="0" />
              <feFuncB type="gamma" amplitude="1.0" exponent="0.4" offset="0" />
            </feComponentTransfer>
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.0 0.059 0.216 0.471 0.765 1.0" />
              <feFuncG type="table" tableValues="0.039 0.176 0.373 0.627 0.824 1.0" />
              <feFuncB type="table" tableValues="0.235 0.412 0.588 0.765 0.882 1.0" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 py-4 md:gap-6 md:py-6">
        <aside className="hidden w-[30rem] flex-shrink-0 lg:block">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-white">الإعدادات</h3>
                <button
                  onClick={resetBadgeConfig}
                  className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>إعادة تعيين</span>
                </button>
              </div>
              <div className="pr-2">{SettingsContent}</div>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm md:p-4">
            <div className="hidden items-center justify-between md:flex">
              <div className="flex items-center gap-2">
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

                <button
                  onClick={openCamera}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
                >
                  <Camera className="h-4 w-4" />
                  <span>التقاط صورة</span>
                </button>

                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
                >
                  <Upload className="h-4 w-4" />
                  <span>رفع صورة</span>
                </button>

                <button
                  onClick={() => setShowGalleryModal(true)}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
                >
                  <History className="h-4 w-4" />
                  <span>السجل</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!resultUrl) return
                    saveProject({
                      title: `${eventName} - ${badgeNumber}`,
                      data: {
                        eventName, eventDate, badgeNumber, backgroundColor,
                        imageFilter, imageScale, imagePositionX, imagePositionY,
                        isInvert, logoText, matrixEnabled, matrixHue, matrixSpeed,
                        matrixDepth, matrixChars, matrixScale, matrixPositionX, matrixPositionY,
                        pixelGridSize, pixelBrightness, pixelContrast, pixelRemoveBg, pixelPalette,
                      },
                      thumbnail: resultUrl,
                    })
                  }}
                  disabled={!resultUrl || isSavingProject}
                  className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                >
                  {isSavingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>حفظ</span>
                </button>
                <button
                  onClick={handleDownloadBadge}
                  disabled={!resultUrl}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>تحميل</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 w-full gap-2 md:hidden">
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
              <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

              <button
                onClick={openCamera}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
              >
                <Camera className="h-4 w-4" />
                <span>التقاط</span>
              </button>

              <button
                onClick={() => uploadInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
              >
                <Upload className="h-4 w-4" />
                <span>رفع</span>
              </button>

              <button
                onClick={() => setShowGalleryModal(true)}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
              >
                <History className="h-4 w-4" />
                <span>السجل</span>
              </button>

              <button
                onClick={handleDownloadBadge}
                disabled={!resultUrl}
                className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>تحميل</span>
              </button>

              <button
                onClick={() => {
                  if (!resultUrl) return
                  saveProject({
                    title: `${eventName} - ${badgeNumber}`,
                    data: {
                      eventName, eventDate, badgeNumber, backgroundColor,
                      imageFilter, imageScale, imagePositionX, imagePositionY,
                      isInvert, logoText,
                    },
                    thumbnail: resultUrl,
                  })
                }}
                disabled={!resultUrl || isSavingProject}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                {isSavingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>حفظ</span>
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-4">
            {generationError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-red-500/20 p-2">
                    <X className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-mono text-sm font-semibold text-red-400">فشل التوليد</h4>
                    <p className="mt-1 font-mono text-xs text-red-300/80">{generationError}</p>
                  </div>
                  <button
                    onClick={() => setGenerationError(null)}
                    className="text-red-400/60 transition-colors hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            <div ref={badgeRef} className="w-full">
              <BadgePreview
                eventName={eventName}
                eventDate={eventDate}
                badgeNumber={badgeNumber}
                pixelArtUrl={resultUrl}
                logoUrl={logoUrl}
                logoText={logoText}
                isInvert={isInvert}
                isGenerating={isGenerating}
                backgroundColor={backgroundColor}
                backgroundImage={backgroundImage}
                imageFilter={imageFilter}
                imageScale={imageScale}
                imagePositionX={imagePositionX}
                imagePositionY={imagePositionY}
                matrixEnabled={matrixEnabled}
                matrixHue={matrixHue}
                matrixSpeed={matrixSpeed}
                matrixDepth={matrixDepth}
                matrixChars={matrixChars}
                matrixScale={matrixScale}
                matrixPositionX={matrixPositionX}
                matrixPositionY={matrixPositionY}
                showPlaceholder={showPlaceholder}
              />
            </div>

            {imageFile && (
              <p className="font-mono text-xs text-white/50">
                {isGenerating ? "جارٍ توليد البكسل آرت..." : `الصورة: ${imageFile.name}`}
              </p>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCameraModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={closeCamera}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeCamera}
                className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 text-black shadow-lg transition-transform hover:scale-110"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl">
                <video ref={videoRef} autoPlay playsInline className="w-full" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex justify-center gap-3 border-t border-white/10 bg-black/50 p-4 backdrop-blur-sm">
                  <button
                    onClick={capturePhoto}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-black shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                  >
                    <Camera className="h-4 w-4" />
                    <span>التقاط صورة</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGalleryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setShowGalleryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowGalleryModal(false)}
                className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 text-black shadow-lg transition-transform hover:scale-110"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="max-h-[80vh] overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl">
                <div className="border-b border-white/10 bg-black/50 p-4 backdrop-blur-sm">
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-white">اختر من السجل</h3>
                  <p className="mt-1 text-sm font-mono text-white/60">اختر صورة تم توليدها سابقاً</p>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-4">
                  {galleryItems.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                      {galleryItems.map((gen) => (
                        <motion.button
                          key={gen.requestId}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setResultUrl(gen.imageUrl)
                            setShowGalleryModal(false)
                          }}
                          className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-all hover:border-white/30"
                        >
                          <Image
                            src={gen.imageUrl || "/placeholder.svg"}
                            alt="Generated pixel art"
                            fill
                            className="object-contain transition-transform duration-300 group-hover:scale-110"
                            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          />
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-white/5 p-6">
                        <History className="h-12 w-12 text-white/40" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-white">لا توجد صور بعد</h3>
                      <p className="mt-2 text-sm text-white/60">قم بتوليد بعض البكسل آرت أولاً لتظهر هنا</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
