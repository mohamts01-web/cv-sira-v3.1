"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

const API = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || ""

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

const MOCK_USERS_KEY = "cvsira_mock_users"

interface MockUser {
  id: string
  name: string
  email: string
  password: string
  role: "user" | "admin"
  plan_name: string
  points: number
}

function getMockUsers(): MockUser[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || "[]")
  } catch {
    return []
  }
}

function saveMockUser(user: MockUser) {
  const users = getMockUsers()
  users.push(user)
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
}

function findMockUser(email: string): MockUser | undefined {
  return getMockUsers().find((u) => u.email === email)
}

const CURRENT_USER_KEY = "cvsira_current_user"

function saveCurrentUser(user: User | null) {
  if (typeof window === "undefined") return
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
  }
}

function loadCurrentUser(): User | null {
  if (typeof window === "undefined") return null
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null")
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (API) {
      fetch(`${API}/api/auth/me`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setUser(data || null))
        .catch(() => {
          const saved = loadCurrentUser()
          setUser(saved)
        })
    } else {
      const saved = loadCurrentUser()
      setUser(saved)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      if (API) {
        const res = await fetch(`${API}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(formatError(data.detail))
        setUser(data)
        saveCurrentUser(data)
      } else {
        const mockUser = findMockUser(email)
        if (!mockUser) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة")
        if (mockUser.password !== password) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة")
        const u: User = {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          plan_name: mockUser.plan_name,
          points: mockUser.points,
        }
        setUser(u)
        saveCurrentUser(u)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      if (API) {
        const res = await fetch(`${API}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(formatError(data.detail))
        setUser(data)
        saveCurrentUser(data)
      } else {
        if (findMockUser(email)) {
          throw new Error("هذا البريد الإلكتروني مستخدم بالفعل")
        }
        const mockUser: MockUser = {
          id: crypto.randomUUID(),
          name,
          email,
          password,
          role: "user",
          plan_name: "Free",
          points: 5,
        }
        saveMockUser(mockUser)
        const u: User = {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          plan_name: mockUser.plan_name,
          points: mockUser.points,
        }
        setUser(u)
        saveCurrentUser(u)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    if (API) {
      await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" })
    }
    setUser(null)
    saveCurrentUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

function formatError(detail: unknown): string {
  if (!detail) return "حدث خطأ ما"
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) return detail.map((e: any) => e?.msg || JSON.stringify(e)).join(" ")
  return String(detail)
}
