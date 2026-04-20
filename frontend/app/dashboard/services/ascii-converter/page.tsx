"use client"

import type React from "react"
import { useState, useEffect, useRef, type ChangeEvent } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Upload, Download, Copy, RotateCcw, ImageIcon, Save, Loader2 } from "lucide-react"
import { useSaveProject } from "@/hooks/use-save-project"

type ColoredChar = {
  char: string
  color: string
}

export default function AsciiConverterPage() {
  const { save: saveProject, isSaving: isSavingProject } = useSaveProject("ascii-converter")
  const [resolution, setResolution] = useState(0.11)
  const [inverted, setInverted] = useState(false)
  const [grayscale, setGrayscale] = useState(true)
  const [charSet, setCharSet] = useState("standard")
  const [loading, setLoading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [asciiArt, setAsciiArt] = useState<string>("")
  const [coloredAsciiArt, setColoredAsciiArt] = useState<ColoredChar[][]>([])
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)

  const charSets: Record<string, string> = {
    standard: " .:-=+*#%@",
    detailed: " .,:;i1tfLCG08@",
    blocks: " ░▒▓█",
    minimal: " .:█",
  }

  const charSetLabels: Record<string, string> = {
    standard: "قياسي",
    detailed: "مفصّل",
    blocks: "كتل",
    minimal: "بسيط",
  }

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (imageLoaded && imageRef.current) {
      convertToAscii()
    }
  }, [resolution, inverted, grayscale, charSet, imageLoaded])

  const loadImage = (src: string) => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        setError("أبعاد الصورة غير صالحة")
        setLoading(false)
        return
      }
      imageRef.current = img
      setImageLoaded(true)
      setLoading(false)
    }

    img.onerror = () => {
      setError("فشل تحميل الصورة")
      setLoading(false)
    }

    img.src = src
  }

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("يرجى رفع ملف صورة")
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        loadImage(e.target.result as string)
      }
    }
    reader.onerror = () => {
      setError("فشل قراءة الملف")
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
      e.target.value = ""
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  const handleDragLeave = () => {
    setIsDraggingFile(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const adjustColorBrightness = (r: number, g: number, b: number, factor: number): string => {
    const minBrightness = 40
    r = Math.max(Math.min(Math.round(r * factor), 255), minBrightness)
    g = Math.max(Math.min(Math.round(g * factor), 255), minBrightness)
    b = Math.max(Math.min(Math.round(b * factor), 255), minBrightness)
    return `rgb(${r}, ${g}, ${b})`
  }

  const renderToCanvas = () => {
    if (!outputCanvasRef.current || !asciiArt || coloredAsciiArt.length === 0) return

    const canvas = outputCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const fontSize = 8
    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = "top"

    const lineHeight = fontSize
    const charWidth = fontSize * 0.6

    if (grayscale) {
      const lines = asciiArt.split("\n")
      const maxLineLength = Math.max(...lines.map((line) => line.length))
      canvas.width = maxLineLength * charWidth
      canvas.height = lines.length * lineHeight
    } else {
      canvas.width = coloredAsciiArt[0].length * charWidth
      canvas.height = coloredAsciiArt.length * lineHeight
    }

    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = "top"

    if (grayscale) {
      ctx.fillStyle = "white"
      asciiArt.split("\n").forEach((line, lineIndex) => {
        ctx.fillText(line, 0, lineIndex * lineHeight)
      })
    } else {
      coloredAsciiArt.forEach((row, rowIndex) => {
        row.forEach((col, colIndex) => {
          ctx.fillStyle = col.color
          ctx.fillText(col.char, colIndex * charWidth, rowIndex * lineHeight)
        })
      })
    }
  }

  useEffect(() => {
    if (imageLoaded && !loading && !error) {
      renderToCanvas()
    }
  }, [asciiArt, coloredAsciiArt, grayscale, loading, error, imageLoaded])

  const convertToAscii = () => {
    try {
      if (!canvasRef.current || !imageRef.current) {
        throw new Error("اللوحة أو الصورة غير متوفرة")
      }

      const img = imageRef.current

      if (img.width === 0 || img.height === 0) {
        throw new Error("أبعاد الصورة غير صالحة")
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("فشل الحصول على سياق اللوحة")
      }

      const width = Math.floor(img.width * resolution)
      const height = Math.floor(img.height * resolution)

      canvas.width = img.width
      canvas.height = img.height

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, img.width, img.height)

      let imageData
      try {
        imageData = ctx.getImageData(0, 0, img.width, img.height)
      } catch {
        throw new Error("فشل الحصول على بيانات الصورة. قد تكون مشكلة CORS.")
      }

      const data = imageData.data
      const chars = charSets[charSet]

      const fontAspect = 0.5
      const widthStep = Math.ceil(img.width / width)
      const heightStep = Math.ceil(img.height / height / fontAspect)

      let result = ""
      const coloredResult: ColoredChar[][] = []

      for (let y = 0; y < img.height; y += heightStep) {
        const coloredRow: ColoredChar[] = []

        for (let x = 0; x < img.width; x += widthStep) {
          const pos = (y * img.width + x) * 4
          const r = data[pos]
          const g = data[pos + 1]
          const b = data[pos + 2]

          let brightness
          if (grayscale) {
            brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255
          } else {
            brightness = Math.sqrt(
              0.299 * (r / 255) * (r / 255) + 0.587 * (g / 255) * (g / 255) + 0.114 * (b / 255) * (b / 255),
            )
          }

          if (inverted) brightness = 1 - brightness

          const charIndex = Math.floor(brightness * (chars.length - 1))
          const char = chars[charIndex]

          result += char

          if (!grayscale) {
            const brightnessFactor = (charIndex / (chars.length - 1)) * 1.5 + 0.5
            const color = adjustColorBrightness(r, g, b, brightnessFactor)
            coloredRow.push({ char, color })
          } else {
            coloredRow.push({ char, color: "white" })
          }
        }

        result += "\n"
        coloredResult.push(coloredRow)
      }

      setAsciiArt(result)
      setColoredAsciiArt(coloredResult)
      setError(null)
    } catch (err) {
      console.error("Error converting to ASCII:", err)
      setError(err instanceof Error ? err.message : "حدث خطأ غير معروف")
      setAsciiArt("")
      setColoredAsciiArt([])
    }
  }

  const downloadAsciiArt = () => {
    if (!asciiArt) return
    const element = document.createElement("a")
    const file = new Blob([asciiArt], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `ascii-art-${Date.now()}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const copyToClipboard = async () => {
    if (!asciiArt) return
    try {
      await navigator.clipboard.writeText(asciiArt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement("textarea")
      el.value = asciiArt
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetAll = () => {
    setResolution(0.11)
    setInverted(false)
    setGrayscale(true)
    setCharSet("standard")
    setImageLoaded(false)
    setAsciiArt("")
    setColoredAsciiArt([])
    setError(null)
    setFileName(null)
    imageRef.current = null
  }

  if (!isHydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
      </div>
    )
  }

  return (
    <div
      className="flex min-h-[80vh] flex-col gap-6 rounded-xl border border-white/10 bg-black/40 p-4 md:p-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-white">محول الصور إلى ASCII Art</h1>
        <p className="text-sm text-white/60">حوّل أي صورة إلى فن نصي ASCII — ارفع صورة وابدأ فوراً</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full space-y-4 lg:w-80 lg:flex-shrink-0">
          <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">الإعدادات</h3>
              <button
                onClick={resetAll}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                <span>إعادة تعيين</span>
              </button>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4">
              <Label htmlFor="resolution" className="text-xs text-white/70">
                الدقة: {resolution.toFixed(2)}
              </Label>
              <Slider
                id="resolution"
                min={0.05}
                max={0.3}
                step={0.01}
                value={[resolution]}
                onValueChange={(value) => setResolution(value[0])}
                className="[&>span]:border-none [&_.bg-primary]:bg-white/20 [&>.bg-background]:bg-white/10"
              />
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4">
              <Label htmlFor="charset" className="text-xs text-white/70">
                مجموعة الأحرف
              </Label>
              <Select value={charSet} onValueChange={setCharSet}>
                <SelectTrigger id="charset" className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="اختر مجموعة الأحرف" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1a1a1e] text-white">
                  {Object.entries(charSetLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="focus:bg-white/10 focus:text-white">
                      {label} — <span className="text-white/50 font-mono text-xs">{charSets[key]}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 pt-4">
              <Switch
                id="invert"
                checked={inverted}
                onCheckedChange={setInverted}
              />
              <Label htmlFor="invert" className="text-xs text-white/70">
                عكس الألوان
              </Label>
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 pt-4">
              <Switch
                id="grayscale"
                checked={grayscale}
                onCheckedChange={setGrayscale}
              />
              <Label htmlFor="grayscale" className="text-xs text-white/70">
                وضع تدرج الرمادي
              </Label>
            </div>

            <div className="hidden">
              <canvas ref={canvasRef} width="300" height="300" />
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            <div className="flex gap-2 border-t border-white/10 pt-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 gap-2 bg-white/10 text-white hover:bg-white/20"
                variant="outline"
              >
                <Upload className="h-4 w-4" />
                رفع صورة
              </Button>
            </div>

            {fileName && (
              <p className="text-xs text-white/50 truncate">
                الملف: {fileName}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={copyToClipboard}
                disabled={!asciiArt || loading}
                className="flex-1 gap-2 bg-white/10 text-white hover:bg-white/20"
                variant="outline"
              >
                <Copy className="h-4 w-4" />
                {copied ? "تم النسخ!" : "نسخ"}
              </Button>

              <Button
                onClick={downloadAsciiArt}
                disabled={!asciiArt || loading}
                className="gap-2 bg-white/10 text-white hover:bg-white/20"
                variant="outline"
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                onClick={() => saveProject({ title: "ASCII Art", data: { resolution, inverted, grayscale, charSet, fontSize, bgColor, textColor, coloredAsciiArt }, thumbnail: canvasRef.current?.toDataURL() })}
                disabled={!asciiArt || loading || isSavingProject}
                className="gap-2 bg-white/10 text-white hover:bg-white/20"
                variant="outline"
              >
                {isSavingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-lg border border-white/10 bg-black">
          {isDraggingFile && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/70">
              <div className="text-lg font-mono text-white">أفلت الصورة هنا</div>
            </div>
          )}

          {!imageLoaded && !loading && !error && (
            <div
              className="flex min-h-[400px] cursor-pointer flex-col items-center justify-center gap-4 transition-colors hover:bg-white/5"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="rounded-full bg-white/5 p-6">
                <ImageIcon className="h-12 w-12 text-white/30" />
              </div>
              <div className="text-center">
                <p className="text-white/60">ارفع صورة أو اسحبها وأفلتها هنا</p>
                <p className="mt-1 text-xs text-white/40">PNG, JPG, WEBP — أي حجم</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                <p className="font-mono text-sm text-white/60">جارٍ التحميل...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex min-h-[400px] items-center justify-center p-4">
              <div className="text-center">
                <p className="text-red-400 font-mono">{error}</p>
                <p className="mt-2 text-sm text-white/50">حاول رفع صورة مختلفة</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 gap-2 bg-white/10 text-white hover:bg-white/20"
                  variant="outline"
                >
                  <Upload className="h-4 w-4" />
                  رفع صورة أخرى
                </Button>
              </div>
            </div>
          )}

          {imageLoaded && !loading && !error && (
            <div className="flex items-center justify-center overflow-auto p-4">
              <canvas
                ref={outputCanvasRef}
                className="max-w-full select-text"
                style={{
                  fontSize: "0.4rem",
                  lineHeight: "0.4rem",
                  fontFamily: "monospace",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
