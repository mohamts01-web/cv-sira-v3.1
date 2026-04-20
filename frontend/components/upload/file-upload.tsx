"use client"

import React, { useCallback, useState, useRef } from "react"
import { UploadCloud, File, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { uploadFile, listFiles, deleteFile, SavedFile } from "@/lib/upload"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

type UploadStatus = "idle" | "uploading" | "success" | "error"

export default function FileUpload() {
  const { user } = useAuth()
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [progressStage, setProgressStage] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<SavedFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const tenantId = "default"

  const loadFiles = useCallback(async () => {
    if (!user) return
    setLoadingFiles(true)
    try {
      const files = await listFiles(tenantId)
      setUploadedFiles(files)
    } catch {
      console.error("Failed to load files")
    } finally {
      setLoadingFiles(false)
    }
  }, [user])

  React.useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
      setStatus("idle")
      setErrorMessage("")
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setStatus("idle")
      setErrorMessage("")
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !user) return

    setStatus("uploading")
    setProgress(0)
    setErrorMessage("")

    try {
      const result = await uploadFile(selectedFile, user.id, tenantId, {
        onProgress: (p) => {
          setProgress(p.progress)
          const stageMap: Record<string, string> = {
            "generating-url": "جارِ إنشاء رابط الرفع...",
            "uploading": "جارِ رفع الملف...",
            "saving-metadata": "جارِ حفظ البيانات...",
          }
          setProgressStage(stageMap[p.stage] || "")
        },
      })

      setStatus("success")
      setProgress(100)
      setSelectedFile(null)

      setUploadedFiles((prev) => [
        {
          id: result.id,
          user_id: user.id,
          tenant_id: tenantId,
          r2_key: result.key,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])

      setTimeout(() => {
        setStatus("idle")
        setProgress(0)
      }, 3000)
    } catch (err) {
      setStatus("error")
      setErrorMessage(err instanceof Error ? err.message : "فشل في رفع الملف")
    }
  }, [selectedFile, user])

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      await deleteFile(fileId)
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch {
      console.error("Failed to delete file")
    }
  }, [])

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    setStatus("idle")
    setErrorMessage("")
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer",
          dragActive
            ? "border-purple-500 bg-purple-500/5 dark:bg-purple-500/10"
            : "border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-[#1a1a1f]",
          status === "uploading" && "pointer-events-none opacity-60"
        )}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.json,.txt,.svg"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
            dragActive
              ? "bg-purple-500/20"
              : "bg-gray-100 dark:bg-gray-800"
          )}>
            <UploadCloud className={cn(
              "w-8 h-8 transition-colors",
              dragActive ? "text-purple-500" : "text-gray-400"
            )} />
          </div>

          {selectedFile ? (
            <div className="flex items-center gap-3 w-full max-w-sm">
              <File className="w-5 h-5 text-purple-500 shrink-0" />
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearFile()
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                اسحب الملف هنا أو اضغط للاختيار
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                صور، PDF، SVG، JSON — الحد الأقصى 50 ميجابايت
              </p>
            </>
          )}
        </div>
      </div>

      {status === "uploading" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{progressStage}</span>
            <span className="text-purple-600 dark:text-purple-400 font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">تم رفع الملف بنجاح!</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {selectedFile && status !== "uploading" && (
        <Button
          onClick={handleUpload}
          disabled={status === "uploading"}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="lg"
        >
          {status === "success" ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              تم الرفع
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              رفع الملف
            </>
          )}
        </Button>
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418]">
        <div className="p-4 border-b border-gray-200 dark:border-[#1F1F23]">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            الملفات المرفوعة
          </h3>
        </div>

        {loadingFiles ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : uploadedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <File className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              لا توجد ملفات مرفوعة بعد
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-[#1a1a1f] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.file_name || file.r2_key.split("/").pop()?.replace(/^\d+-/, "")}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(file.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors group"
                >
                  <X className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
