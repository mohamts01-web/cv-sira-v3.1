"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login, loginWithGoogle, loading } = useAuth()
  const [form, setForm] = useState({ email: "", password: "" })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      await login(form.email, form.password)
      // Redirect based on role (fetched after login via context)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex min-h-screen bg-black">
      {/* Left Panel */}
      <div className="relative hidden w-1/2 p-8 lg:block">
        <div className="h-full w-full overflow-hidden rounded-[40px] bg-gradient-to-b from-purple-400 via-purple-600 to-black">
          <div className="flex h-full flex-col items-center justify-center px-8 text-center text-white">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">CvSira</h1>
              <p className="text-purple-200 text-sm mt-1">منصة السيرة الذاتية الذكية</p>
            </div>
            <h2 className="mb-4 text-4xl font-bold">مرحباً بعودتك!</h2>
            <p className="mb-12 text-lg text-purple-100">سجّل دخولك للوصول إلى خدماتك وإدارة نقاطك</p>

            <div className="w-full max-w-sm space-y-3 text-left">
              {[
                { icon: "✦", text: "توليد سيرة ذاتية احترافية بالذكاء الاصطناعي" },
                { icon: "✦", text: "نظام نقاط مرن حسب خطتك" },
                { icon: "✦", text: "خدمات متنوعة تُطوَّر باستمرار" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                  <span className="text-purple-300 mt-0.5">{item.icon}</span>
                  <span className="text-sm text-purple-100">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex w-full items-center justify-center bg-black p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-white">CvSira</h1>
          </div>

          <h2 className="mb-2 text-3xl font-bold text-white">تسجيل الدخول</h2>
          <p className="mb-8 text-gray-400">أدخل بريدك الإلكتروني وكلمة المرور للمتابعة</p>

          <div className="mb-8">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="h-12 w-full flex items-center justify-center gap-3 rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-800 text-white transition-colors text-sm"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-black px-3 text-gray-400">أو سجّل دخولك بالبريد الإلكتروني</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              data-testid="login-email"
              type="email"
              className="h-12 w-full rounded-xl border border-gray-800 bg-gray-900 px-4 text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none transition"
              placeholder="البريد الإلكتروني"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <div className="relative">
              <input
                data-testid="login-password"
                type={showPass ? "text" : "password"}
                className="h-12 w-full rounded-xl border border-gray-800 bg-gray-900 px-4 pr-12 text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none transition"
                placeholder="كلمة المرور"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-white font-semibold text-black hover:bg-gray-100 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ تسجيل الدخول...</> : "تسجيل الدخول"}
            </button>

            <p className="text-center text-sm text-gray-400">
              ليس لديك حساب؟{" "}
              <Link href="/signup" className="text-purple-400 hover:text-purple-300 hover:underline font-medium">
                إنشاء حساب جديد
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
