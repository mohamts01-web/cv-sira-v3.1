import { Upload } from "lucide-react"
import FileUpload from "@/components/upload/file-upload"

export default function FileUploadPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">رفع الملفات</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mr-13">
          ارفع ملفاتك بأمان — يتم تخزينها مباشرة في Cloudflare R2
        </p>
      </div>

      <div className="max-w-2xl">
        <FileUpload projectId="general" />
      </div>
    </div>
  )
}
