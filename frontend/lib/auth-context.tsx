"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { auth, db } from "@/lib/firebase"
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User as FirebaseUser 
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"

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
  loginWithGoogle: () => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

async function getOrCreateProfile(firebaseUser: FirebaseUser, additionalData?: { name: string }): Promise<User> {
  const userRef = doc(db, "users", firebaseUser.uid)
  
  try {
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      const data = userSnap.data()
      return {
        id: firebaseUser.uid,
        name: data.name || "",
        email: firebaseUser.email || "",
        role: data.role || "user",
        plan_name: data.plan_name || "Free",
        points: data.points ?? 5,
      }
    }

    // Create new profile with default 5 points
    const newProfile = {
      name: additionalData?.name || firebaseUser.displayName || "",
      email: firebaseUser.email || "",
      role: "user" as const,
      plan_name: "Free",
      points: 5,
      created_at: serverTimestamp(),
    }

    await setDoc(userRef, newProfile)

    return {
      id: firebaseUser.uid,
      ...newProfile,
      email: firebaseUser.email || "",
    }
  } catch (error: any) {
    console.error("Firestore getOrCreateProfile error:", error)
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      throw { code: 'unavailable' }
    }
    throw error
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await getOrCreateProfile(fbUser)
        setUser(profile)
      } else {
        setUser(null)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password)
      const profile = await getOrCreateProfile(fbUser)
      setUser(profile)
    } catch (error: any) {
      throw new Error(mapAuthError(error.code))
    } finally {
      setLoading(false)
    }
  }, [])

  const loginWithGoogle = useCallback(async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const { user: fbUser } = await signInWithPopup(auth, provider)
      const profile = await getOrCreateProfile(fbUser)
      setUser(profile)
    } catch (error: any) {
      console.error("Google login error:", error)
      if (error.code !== "auth/popup-closed-by-user") {
        throw new Error(mapAuthError(error.code))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password)
      
      // Sending verification email
      try {
        await sendEmailVerification(fbUser)
      } catch (err) {
        console.error("Verification email failed to send:", err)
      }

      const profile = await getOrCreateProfile(fbUser, { name })
      setUser(profile)
    } catch (error: any) {
      throw new Error(mapAuthError(error.code))
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

function mapAuthError(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "auth/email-already-in-use": "هذا البريد الإلكتروني مستخدم بالفعل",
    "auth/weak-password": "كلمة المرور ضعيفة جداً",
    "auth/user-not-found": "المستخدم غير موجود",
    "auth/wrong-password": "كلمة المرور غير صحيحة",
    "auth/operation-not-allowed": "تحذير: تسجيل الدخول غير مفعل في Firebase Console.",
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة",
    "auth/network-request-failed": "فشل الاتصال بالإنترنت، يرجى التحقق من اتصالك.",
    "unavailable": "فشل الاتصال بخوادم قاعدة البيانات. يرجى إيقاف مانع الإعلانات (AdBlocker) أو الـ VPN والمحاولة مجدداً.",
    "client-offline": "أنت في وضع عدم الاتصال بالإنترنت، يرجى التأكد من اتصال الشبكة.",
  }
  
  if (code && typeof code === 'string' && code.includes("offline")) {
    return map["client-offline"]
  }
  
  return map[code] || `حدث خطأ في الاتصال (Code: ${code}). تأكد من إيقاف الـ VPN أو مانع الإعلانات.`
}
