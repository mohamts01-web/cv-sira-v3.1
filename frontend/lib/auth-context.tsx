"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setUser(data || null))
      .catch(() => setUser(null))
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(formatError(data.detail))
      setUser(data)
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(formatError(data.detail))
      setUser(data)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" })
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

function formatError(detail: unknown): string {
  if (!detail) return "Something went wrong"
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) return detail.map((e: any) => e?.msg || JSON.stringify(e)).join(" ")
  return String(detail)
}
