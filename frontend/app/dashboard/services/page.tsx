import Link from "next/link"
import { Sparkles, Clock, Lock, Image, PenTool, CreditCard, Award, Terminal } from "lucide-react"

const services = [
  {
    id: "infographic",
    title: "مولّد الإنفوجرافيك",
    description: "حوّل أفكارك إلى صور احترافية باستخدام ByteDance SeedDream v4.5",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-600",
    cost: "2 نقطة / صورة",
    href: "/dashboard/services/infographic",
    status: "active",
    badge: "جديد",
  },
  {
    id: "svg-generator",
    title: "مولّد SVG بالذكاء الاصطناعي",
    description: "صِف رسمك واحصل على SVG قابل للتعديل والتحميل — ثابت أو متحرك مع تحسين تلقائي",
    icon: PenTool,
    color: "from-cyan-500 to-blue-600",
    cost: "3 نقاط / رسم",
    href: "/dashboard/services/svg-generator",
    status: "active",
    badge: "AI",
  },
  {
    id: "infographic-editor",
    title: "محرر الإنفوجرافيك AI",
    description: "محرر كامل لتصميم الإنفوجرافيك بالذكاء الاصطناعي مع Fabric.js - تحرير، طبقات، تصدير",
    icon: Sparkles,
    color: "from-violet-600 to-purple-700",
    cost: "5 نقاط / توليد",
    href: "/dashboard/services/infographic-editor",
    status: "active",
    badge: "AI",
  },
  {
    id: "mockup-generator",
    title: "مولّد نماذج المنتجات",
    description: "صِف منتجك واحصل على نموذج UI/UX احترافي بالذكاء الاصطناعي مع دعم الصور المرجعية",
    icon: Image,
    color: "from-fuchsia-500 to-pink-600",
    cost: "3 نقاط / نموذج",
    href: "/dashboard/services/mockup-generator",
    status: "active",
    badge: "جديد",
  },
  {
    id: "card-generator",
    title: "مولّد البطاقات AI",
    description: "أنشئ بطاقات وبورتريهات احترافية بالذكاء الاصطناعي — تحكم بالأسلوب والإضاءة والوضعية",
    icon: CreditCard,
    color: "from-amber-500 to-orange-600",
    cost: "2 نقاط / بطاقة",
    href: "/dashboard/services/card-generator",
    status: "active",
    badge: "جديد",
  },
  {
    id: "badge-generator",
    title: "مولّد شارات البكسل آرت",
    description: "حوّل صورك إلى شارات بكسل آرت للفعاليات والمؤتمرات مع إزالة خلفية تلقائية وتخصيص كامل",
    icon: Award,
    color: "from-lime-500 to-green-600",
    cost: "3 نقاط / شارة",
    href: "/dashboard/services/badge-generator",
    status: "active",
    badge: "جديد",
  },
  {
    id: "ascii-converter",
    title: "محول الصور إلى ASCII Art",
    description: "حوّل أي صورة إلى فن نصي ASCII مع تحكم بالدقة والأحرف والألوان — يعمل محلياً بدون API",
    icon: Terminal,
    color: "from-emerald-500 to-teal-600",
    cost: "مجاني",
    href: "/dashboard/services/ascii-converter",
    status: "active",
    badge: "مجاني",
  },
  {
    id: "cv",
    title: "مولّد السيرة الذاتية",
    description: "أنشئ سيرة ذاتية احترافية بالذكاء الاصطناعي في ثوانٍ",
    icon: Clock,
    color: "from-blue-500 to-cyan-600",
    cost: "قريباً",
    href: "#",
    status: "coming_soon",
    badge: "قريباً",
  },
  {
    id: "cover",
    title: "خطاب التقديم",
    description: "اكتب خطاب تقديم مخصص لكل وظيفة بذكاء اصطناعي",
    icon: Lock,
    color: "from-emerald-500 to-teal-600",
    cost: "قريباً",
    href: "#",
    status: "coming_soon",
    badge: "قريباً",
  },
]

export default function ServicesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">الخدمات</h1>
        <p className="text-gray-500 dark:text-gray-400">استكشف خدمات CvSira المدعومة بالذكاء الاصطناعي</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((service) => {
          const Icon = service.icon
          const isActive = service.status === "active"
          return (
            <Link
              key={service.id}
              href={service.href}
              className={`group relative rounded-2xl border p-6 transition-all ${
                isActive
                  ? "border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418] hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg hover:shadow-purple-500/5"
                  : "border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#141418] opacity-60 cursor-not-allowed"
              }`}
            >
              {/* Badge */}
              {service.badge && (
                <span className={`absolute top-4 left-4 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? "bg-purple-600 text-white" : "bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-400"
                }`}>
                  {service.badge}
                </span>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 ${!isActive ? "grayscale" : "group-hover:scale-110 transition-transform"}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{service.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">{service.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{service.cost}</span>
                {isActive && (
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-medium group-hover:underline">
                    استخدام الخدمة ←
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
