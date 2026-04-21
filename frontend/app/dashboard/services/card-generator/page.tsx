"use client"

import { useState, useCallback, useRef } from "react"
import { Sparkles, Download, AlertCircle, Loader2, RotateCcw, MessageCircle, Palette, Sun, User, Monitor, ImageIcon, ChevronDown, Upload, X, Save, Folder } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useSaveProject } from "@/hooks/use-save-project"

interface CardSettings {
  style: string
  background: string
  lighting: string
  pose: string
  aspectRatio: string
}

const STYLE_OPTIONS = [
  { value: "professional", label: "احترافي" },
  { value: "artistic", label: "فني" },
  { value: "casual", label: "عفوي" },
  { value: "vintage", label: "كلاسيكي" },
]
const BG_OPTIONS = [
  { value: "studio", label: "استوديو" },
  { value: "gradient", label: "تدرج لوني" },
  { value: "solid", label: "لون ثابت" },
  { value: "transparent", label: "شفاف" },
]
const LIGHT_OPTIONS = [
  { value: "soft", label: "ناعم" },
  { value: "dramatic", label: "درامي" },
  { value: "natural", label: "طبيعي" },
  { value: "studio", label: "استوديو" },
]
const POSE_OPTIONS = [
  { value: "headshot", label: "لقطة رأس" },
  { value: "half-body", label: "نصف جسم" },
  { value: "full-body", label: "جسم كامل" },
  { value: "profile", label: "جانبي" },
]
const RATIO_OPTIONS = [
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
]

function SettingRow({ icon: Icon, label, value, options, onChange }: {
  icon: React.ElementType
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none h-8 rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418] px-3 pe-7 text-sm text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

export default function CardGeneratorPage() {
  const { user } = useAuth()
  const { save: saveProject, isSaving: isSavingProject } = useSaveProject("card-generator")
  const [prompt, setPrompt] = useState("صورة شخصية احترافية بخلفية برتقالية")
  const [settings, setSettings] = useState<CardSettings>({
    style: "artistic",
    background: "studio",
    lighting: "studio",
    pose: "profile",
    aspectRatio: "1:1",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState("")
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => setReferenceImage(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleRemoveImage = useCallback(() => {
    setReferenceImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!user || !prompt.trim() || isLoading) return
    setIsLoading(true)
    setError(null)
    setImageUrl(null)
    setProgress(0)
    setStatusText("يُجهّز التوليد...")

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 1.5, 90))
    }, 200)

    const statusInterval = setInterval(() => {
      const texts = ["يُجهّز التوليد...", "يبحث عن الألوان المناسبة...", "يضيف اللمسات الأخيرة...", "يُنهي الصورة..."]
      setStatusText((prev) => {
        const idx = texts.indexOf(prev)
        return texts[(idx + 1) % texts.length]
      })
    }, 2000)

    try {
      const res = await fetch("/api/generate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...settings, referenceImage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "فشل التوليد")
      setProgress(100)
      setImageUrl(data.imageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ")
    } finally {
      clearInterval(progressInterval)
      clearInterval(statusInterval)
      setIsLoading(false)
    }
  }, [user, prompt, settings, isLoading])

  const handleDownload = useCallback(() => {
    if (!imageUrl) return
    const a = document.createElement("a")
    a.href = imageUrl
    a.download = `portrait-${Date.now()}.png`
    a.target = "_blank"
    a.click()
  }, [imageUrl])

  const handleReset = useCallback(() => {
    setImageUrl(null)
    setError(null)
    setProgress(0)
  }, [])

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
            <ImageIcon className="h-5 w-5 text-fuchsia-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white font-sans">
              مولّد البطاقات بالذكاء الاصطناعي
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-sans">
              أنشئ صوراً شخصية احترافية بالذكاء الاصطناعي
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = "/dashboard/projects"}
          className="flex items-center gap-2 border-gray-200 dark:border-[#1F1F23]"
        >
          <Folder className="h-4 w-4" />
          <span>مشاريعي</span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">الوصف</span>
              </div>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="صِف الصورة الشخصية التي تريدها..."
                className="w-full bg-gray-50 dark:bg-[#0F0F12] text-sm rounded-xl"
                disabled={isLoading}
              />
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">صورة مرجعية</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">(اختياري)</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {referenceImage ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-[#1F1F23]">
                  <img src={referenceImage} alt="Reference" className="w-full h-40 object-cover" />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-[#1F1F23] hover:border-fuchsia-400 dark:hover:border-fuchsia-500 bg-gray-50 dark:bg-[#0F0F12] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">اضغط لإرفاق صورة مرجعية</span>
                </button>
              )}
            </div>

            <div className="p-4 space-y-4">
              <SettingRow icon={Palette} label="النمط" value={settings.style} options={STYLE_OPTIONS} onChange={(v) => setSettings((s) => ({ ...s, style: v }))} />
              <SettingRow icon={ImageIcon} label="الخلفية" value={settings.background} options={BG_OPTIONS} onChange={(v) => setSettings((s) => ({ ...s, background: v }))} />
              <SettingRow icon={Sun} label="الإضاءة" value={settings.lighting} options={LIGHT_OPTIONS} onChange={(v) => setSettings((s) => ({ ...s, lighting: v }))} />
              <SettingRow icon={User} label="الوضعية" value={settings.pose} options={POSE_OPTIONS} onChange={(v) => setSettings((s) => ({ ...s, pose: v }))} />
              <SettingRow icon={Monitor} label="الأبعاد" value={settings.aspectRatio} options={RATIO_OPTIONS} onChange={(v) => setSettings((s) => ({ ...s, aspectRatio: v }))} />
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-[#1F1F23]">
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isLoading}
                className="w-full h-10 flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />جارٍ التوليد...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />توليد الصورة</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:w-96">
          <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418] overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-[#1F1F23]">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">المعاينة</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">ستظهر النتيجة هنا</p>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center">
              {error && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  <button onClick={handleGenerate} className="text-xs text-fuchsia-500 hover:underline">حاول مرة أخرى</button>
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                  <div className="relative w-12 h-12">
                    <Loader2 className="w-full h-full animate-spin text-fuchsia-500" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{statusText}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">عادة يستغرق 10-15 ثانية</p>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-[#1F1F23] rounded-full overflow-hidden">
                    <div className="h-full bg-fuchsia-500 transition-all duration-300 ease-linear rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {imageUrl && !isLoading && !error && (
                <div className="flex flex-col gap-4 w-full">
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-[#1F1F23]">
                    <img src={imageUrl} alt="Generated portrait" className="w-full h-auto" />
                  </div>
                  <div className="p-3 space-y-2 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الجودة</span>
                      <span className="text-gray-900 dark:text-white">1080p</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">النمط</span>
                      <span className="text-gray-900 dark:text-white">{STYLE_OPTIONS.find((o) => o.value === settings.style)?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الأبعاد</span>
                      <span className="text-gray-900 dark:text-white">{settings.aspectRatio}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleReset} className="flex-1 h-9 flex items-center justify-center gap-2 border border-gray-200 dark:border-[#1F1F23] text-gray-900 dark:text-white text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-[#1F1F23] transition-colors">
                      <RotateCcw className="w-4 h-4" />
                      إعادة
                    </button>
                    <button
                      onClick={() => saveProject({ title: prompt.slice(0, 40), data: { prompt, settings }, thumbnail: imageUrl || undefined })}
                      disabled={!imageUrl || isSavingProject}
                      className="flex-1 h-9 flex items-center justify-center gap-2 border border-fuchsia-200 dark:border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300 text-sm font-medium rounded-xl hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 transition-colors disabled:opacity-50"
                    >
                      {isSavingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ
                    </button>
                    <button onClick={handleDownload} className="flex-1 h-9 flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-medium rounded-xl transition-colors">
                      <Download className="w-4 h-4" />
                      تحميل
                    </button>
                  </div>
                </div>
              )}

              {!imageUrl && !isLoading && !error && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-[#1F1F23]">
                    <Sparkles className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">لا توجد صورة بعد</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">أدخل وصفاً واضغط توليد الصورة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
