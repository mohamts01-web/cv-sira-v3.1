import { Layers } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#141418]">
        <Layers className="h-7 w-7 text-gray-400" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">لا يوجد نموذج بعد</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
          صِف المنتج الذي تريد توليده واضغط{" "}
          <span className="text-purple-500">توليد النموذج</span> للبدء.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2 max-w-sm">
        {["لوحة تحكم", "تطبيق جوال", "صفحة هبوط", "متجر إلكتروني"].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-gray-200 dark:border-[#1F1F23] px-3 py-1 text-xs text-gray-500 dark:text-gray-400"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
