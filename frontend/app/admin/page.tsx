"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Users, Package, BarChart3, Trash2, Plus, Loader2, Shield, Coins, LogOut } from "lucide-react"

const API = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || ""

interface User { id: string; name: string; email: string; role: string; plan_name: string; points: number; created_at: string }
interface Plan { id: string; name: string; points: number; price: number; features: string[]; is_active: boolean }
interface Stats { total_users: number; total_plans: number }

export default function AdminPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<"overview" | "users" | "plans">("overview")
  const [users, setUsers] = useState<User[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [newPlan, setNewPlan] = useState({ name: "", points: 0, price: 0, features: "" })
  const [msg, setMsg] = useState("")

  useEffect(() => {
    if (user === null) router.push("/login")
    if (user && user.role !== "admin") router.push("/dashboard")
  }, [user, router])

  useEffect(() => {
    if (user?.role === "admin") {
      fetchStats(); fetchUsers(); fetchPlans()
    }
  }, [user])

  const fetchStats = async () => {
    const r = await fetch(`${API}/api/admin/stats`, { credentials: "include" })
    if (r.ok) setStats(await r.json())
  }
  const fetchUsers = async () => {
    const r = await fetch(`${API}/api/admin/users`, { credentials: "include" })
    if (r.ok) setUsers(await r.json())
  }
  const fetchPlans = async () => {
    const r = await fetch(`${API}/api/plans`, { credentials: "include" })
    if (r.ok) setPlans(await r.json())
  }

  const deleteUser = async (id: string) => {
    if (!confirm("حذف هذا المستخدم؟")) return
    await fetch(`${API}/api/admin/users/${id}`, { method: "DELETE", credentials: "include" })
    fetchUsers(); fetchStats()
  }

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`${API}/api/admin/plans`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newPlan, features: newPlan.features.split("\n").filter(Boolean), is_active: true }),
    })
    setLoading(false)
    if (res.ok) { setMsg("تم إنشاء الخطة بنجاح ✓"); fetchPlans(); setNewPlan({ name: "", points: 0, price: 0, features: "" }) }
    else setMsg("خطأ في إنشاء الخطة")
  }

  const deletePlan = async (id: string) => {
    if (!confirm("حذف هذه الخطة؟")) return
    await fetch(`${API}/api/admin/plans/${id}`, { method: "DELETE", credentials: "include" })
    fetchPlans()
  }

  if (user === undefined) return <div className="flex h-screen items-center justify-center bg-[#0F0F12]"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  if (!user || user.role !== "admin") return null

  return (
    <div className="min-h-screen bg-[#0F0F12] text-white">
      {/* Top Bar */}
      <header className="border-b border-[#1F1F23] bg-[#0F0F12] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-lg font-semibold">CvSira</span>
          <span className="text-xs bg-purple-900/50 text-purple-300 border border-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" /> Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user.name}</span>
          <button onClick={async () => { await logout(); router.push("/login") }} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">لوحة الإدارة</h1>
        <p className="text-gray-400 mb-8">إدارة المستخدمين والخطط والإحصاءات</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-[#1F1F23] pb-0">
          {[
            { key: "overview", label: "نظرة عامة", icon: BarChart3 },
            { key: "users", label: "المستخدمون", icon: Users },
            { key: "plans", label: "الخطط", icon: Package },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              data-testid={`admin-tab-${key}`}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                tab === key ? "border-purple-500 text-purple-400" : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard icon={Users} label="إجمالي المستخدمين" value={stats?.total_users ?? "..."} color="purple" />
            <StatCard icon={Package} label="الخطط النشطة" value={stats?.total_plans ?? "..."} color="blue" />
            <StatCard icon={Coins} label="مجموع النقاط الموزعة" value={users.reduce((s, u) => s + u.points, 0)} color="green" />
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div className="rounded-xl border border-[#1F1F23] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1A1A1F]">
                <tr>
                  {["الاسم", "البريد الإلكتروني", "الدور", "الخطة", "النقاط", "تاريخ الإنشاء", "إجراءات"].map((h) => (
                    <th key={h} className="px-4 py-3 text-right text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F23]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#1A1A1F]/50 transition" data-testid={`user-row-${u.id}`}>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-900/50 text-purple-300 border border-purple-700" : "bg-zinc-800 text-zinc-300"}`}>
                        {u.role === "admin" ? "مدير" : "مستخدم"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{u.plan_name || "Free"}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-yellow-400"><Coins className="w-3 h-3" />{u.points}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString("ar-SA")}</td>
                    <td className="px-4 py-3">
                      {u.role !== "admin" && (
                        <button onClick={() => deleteUser(u.id)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition" data-testid={`delete-user-${u.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div className="py-12 text-center text-gray-500">لا يوجد مستخدمون بعد</div>}
          </div>
        )}

        {/* Plans */}
        {tab === "plans" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Existing plans */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-gray-200">الخطط الحالية</h3>
              {plans.map((p) => (
                <div key={p.id} className="rounded-xl border border-[#1F1F23] bg-[#141418] p-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{p.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-yellow-400" />{p.points} نقطة</span>
                      <span>${p.price}/شهر</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.features.map((f) => <span key={f} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{f}</span>)}
                    </div>
                  </div>
                  <button onClick={() => deletePlan(p.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Create plan */}
            <div>
              <h3 className="font-semibold text-gray-200 mb-4">إنشاء خطة جديدة</h3>
              {msg && <div className="mb-3 p-3 rounded-xl bg-green-900/20 border border-green-700 text-green-400 text-sm">{msg}</div>}
              <form onSubmit={createPlan} className="space-y-4 bg-[#141418] rounded-xl border border-[#1F1F23] p-5">
                <input required placeholder="اسم الخطة" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full h-10 bg-[#0F0F12] border border-[#2B2B30] rounded-lg px-3 text-sm focus:border-purple-500 focus:outline-none" />
                <input required type="number" min="0" placeholder="عدد النقاط" value={newPlan.points || ""}
                  onChange={(e) => setNewPlan({ ...newPlan, points: +e.target.value })}
                  className="w-full h-10 bg-[#0F0F12] border border-[#2B2B30] rounded-lg px-3 text-sm focus:border-purple-500 focus:outline-none" />
                <input required type="number" min="0" step="0.01" placeholder="السعر ($)" value={newPlan.price || ""}
                  onChange={(e) => setNewPlan({ ...newPlan, price: +e.target.value })}
                  className="w-full h-10 bg-[#0F0F12] border border-[#2B2B30] rounded-lg px-3 text-sm focus:border-purple-500 focus:outline-none" />
                <textarea placeholder="المزايا (سطر لكل ميزة)" value={newPlan.features}
                  onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })} rows={3}
                  className="w-full bg-[#0F0F12] border border-[#2B2B30] rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none resize-none" />
                <button type="submit" disabled={loading} data-testid="create-plan-btn"
                  className="w-full h-10 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إنشاء الخطة
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colors = { purple: "bg-purple-900/30 text-purple-400 border-purple-800", blue: "bg-blue-900/30 text-blue-400 border-blue-800", green: "bg-green-900/30 text-green-400 border-green-800" }
  return (
    <div className="rounded-xl border border-[#1F1F23] bg-[#141418] p-6">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-4 ${colors[color as keyof typeof colors]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}
