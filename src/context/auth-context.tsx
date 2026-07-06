"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useRouter } from "next/navigation"

interface AuthUser {
  id: string
  email: string
  role: string
}

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string, totpCode?: string) => Promise<{
    ok: boolean
    code?: string
    error?: string
  }>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Try to restore session on mount using the HttpOnly refresh cookie
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      if (!res.ok) return false
      const data = await res.json()
      setAccessToken(data.accessToken)
      // Decode JWT payload to get user info (no signature verification needed client-side)
      const payload = JSON.parse(atob(data.accessToken.split(".")[1]))
      setUser({ id: payload.userId, email: payload.email ?? "", role: payload.role })
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    refreshToken().finally(() => setIsLoading(false))
  }, [refreshToken])

  // Proactively refresh access token every 13 minutes (before 15-min expiry)
  useEffect(() => {
    if (!accessToken) return
    const interval = setInterval(() => { refreshToken() }, 13 * 60 * 1000)
    return () => clearInterval(interval)
  }, [accessToken, refreshToken])

  const login = async (email: string, password: string, totpCode?: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, ...(totpCode ? { totpCode } : {}) }),
    })

    const data = await res.json()

    if (!res.ok) return { ok: false, code: data.code, error: data.error }
    if (data.code === "TOTP_REQUIRED") return { ok: false, code: "TOTP_REQUIRED" }

    setAccessToken(data.accessToken)
    setUser(data.user)
    return { ok: true }
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    setAccessToken(null)
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
