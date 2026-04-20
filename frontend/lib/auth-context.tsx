"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser, Session } from "@supabase/supabase-js"

interface User {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  plan_name: string
  points: number
}

interface AuthContextType {
  user: User | null | undefined
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

async function upsertProfile(supabaseUser: SupabaseUser): Promise<User> {
  const meta = supabaseUser.user_metadata || {}

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", supabaseUser.id)
    .single()

  if (existing) {
    return {
      id: existing.id,
      name: existing.name || meta.name || "",
      email: supabaseUser.email || "",
      role: existing.role || "user",
      plan_name: existing.plan_name || "Free",
      points: existing.points ?? 5,
    }
  }

  const newProfile = {
    id: supabaseUser.id,
    name: meta.name || "",
    email: supabaseUser.email || "",
    role: "user" as const,
    plan_name: "Free",
    points: 5,
  }

  const { error } = await supabase.from("profiles").insert(newProfile)
  if (error) console.error("Profile insert error:", error.message)

  return {
    ...newProfile,
    email: supabaseUser.email || "",
  }
}

async function buildUserFromSession(session: Session | null): Promise<User | null> {
  if (!session?.user) return null
  return upsertProfile(session.user)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = await buildUserFromSession(session)
      setUser(u)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = await buildUserFromSession(session)
        setUser(u)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(mapAuthError(error.message))
      const u = await buildUserFromSession(data.session)
      setUser(u)
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) throw new Error(mapAuthError(error.message))
      const u = await buildUserFromSession(data.session)
      setUser(u)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

function mapAuthError(msg: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "User already registered": "هذا البريد الإلكتروني مستخدم بالفعل",
    "Email not confirmed": "يرجى تأكيد بريدك الإلكتروني أولاً",
    "Password should be at least 6 characters": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  }
  return map[msg] || msg
}
