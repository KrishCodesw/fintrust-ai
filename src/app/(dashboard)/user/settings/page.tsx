"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  Shield, ShieldOff, LogOut, Trash2,
  CheckCircle2, AlertCircle, Loader2,
  Monitor, Smartphone,
} from "lucide-react"

interface UserProfile {
  id:               string
  email:            string
  role:             string
  emailVerified:    boolean
  twoFactorEnabled: boolean
  createdAt:        string
  lastLoginAt:      string | null
  lastLoginIp:      string | null
  _count:           { cases: number }
}

interface Session {
  id:          string
  userAgent:   string | null
  ipAddress:   string | null
  createdAt:   string
  lastUsedAt:  string
}

export default function SettingsPage() {
  const { user: authUser, logout } = useAuth()
  const authFetch = useAuthFetch()

  const [profile,  setProfile]  = useState<UserProfile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)

  // 2FA setup state
  const [qrCode,      setQrCode]      = useState<string | null>(null)
  const [manualKey,   setManualKey]   = useState<string | null>(null)
  const [totpInput,   setTotpInput]   = useState("")
  const [setup2fa,    setSetup2fa]    = useState(false)
  const [disable2fa,  setDisable2fa]  = useState(false)
  const [disableCode, setDisableCode] = useState("")
  const [working,     setWorking]     = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // Load profile + sessions
  useEffect(() => {
    Promise.all([
      authFetch("/api/auth/me").then(r => r.json()),
      authFetch("/api/auth/sessions").then(r => r.json()),
    ]).then(([profileData, sessionsData]) => {
      if (profileData.user)    setProfile(profileData.user)
      if (sessionsData.sessions) setSessions(sessionsData.sessions)
    }).finally(() => setLoading(false))
  }, [])

  // ── 2FA setup ─────────────────────────────────────────
  const start2faSetup = async () => {
    setWorking(true)
    const res  = await authFetch("/api/auth/2fa/setup", { method: "POST" })
    const data = await res.json()
    setWorking(false)
    if (!res.ok) { showToast(data.error, false); return }
    setQrCode(data.qrCode)
    setManualKey(data.manualKey)
    setSetup2fa(true)
  }

  const confirm2fa = async () => {
    setWorking(true)
    const res  = await authFetch("/api/auth/2fa/confirm", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ totpCode: totpInput }),
    })
    const data = await res.json()
    setWorking(false)
    if (!res.ok) { showToast(data.error, false); return }
    setProfile(p => p ? { ...p, twoFactorEnabled: true } : p)
    setSetup2fa(false)
    setQrCode(null)
    setManualKey(null)
    setTotpInput("")
    showToast("Two-factor authentication enabled!")
  }

  // ── 2FA disable ───────────────────────────────────────
  const do2faDisable = async () => {
    setWorking(true)
    const res  = await authFetch("/api/auth/2fa/disable", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ totpCode: disableCode }),
    })
    const data = await res.json()
    setWorking(false)
    if (!res.ok) { showToast(data.error, false); return }
    setProfile(p => p ? { ...p, twoFactorEnabled: false } : p)
    setDisable2fa(false)
    setDisableCode("")
    showToast("Two-factor authentication disabled.")
  }

  // ── Session revoke ────────────────────────────────────
  const revokeSession = async (sessionId: string) => {
    const res = await authFetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" })
    if (!res.ok) { showToast("Failed to revoke session", false); return }
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    showToast("Session revoked")
  }

  const revokeAll = async () => {
    const res = await authFetch("/api/auth/sessions", { method: "DELETE" })
    if (!res.ok) { showToast("Failed", false); return }
    showToast("All sessions revoked. You will be logged out.")
    setTimeout(() => logout(), 1500)
  }

  // ── Detect device type from user agent ────────────────
  const deviceIcon = (ua: string | null) => {
    if (!ua) return Monitor
    const lower = ua.toLowerCase()
    return lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")
      ? Smartphone
      : Monitor
  }

  if (loading) return (
    <div className="max-w-lg mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-4 right-4 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50 flex items-center gap-2",
          toast.ok ? "bg-gray-900" : "bg-red-600"
        )}>
          {toast.ok
            ? <CheckCircle2 className="h-4 w-4 text-green-400" />
            : <AlertCircle  className="h-4 w-4 text-white" />
          }
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Account settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">{profile?.email}</p>
      </div>

      {/* ── Profile card ─────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Profile</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Role</p>
            <span className="inline-block mt-0.5 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {profile?.role.replace(/_/g, " ")}
            </span>
          </div>
          <div><p className="text-xs text-gray-400">Cases filed</p>
            <p className="font-medium">{profile?._count.cases}</p>
          </div>
          <div><p className="text-xs text-gray-400">Member since</p>
            <p className="font-medium">{profile?.createdAt ? formatDate(profile.createdAt) : "—"}</p>
          </div>
          <div><p className="text-xs text-gray-400">Last login</p>
            <p className="font-medium">{profile?.lastLoginAt ? formatDate(profile.lastLoginAt) : "—"}</p>
          </div>
        </div>
      </div>

      {/* ── 2FA card ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Two-factor authentication</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {profile?.twoFactorEnabled
                ? "2FA is active. Your account is protected by an authenticator app."
                : "Add an extra layer of security to your account."}
            </p>
          </div>
          {profile?.twoFactorEnabled
            ? <Shield className="h-5 w-5 text-green-500 flex-shrink-0" />
            : <ShieldOff className="h-5 w-5 text-gray-300 flex-shrink-0" />
          }
        </div>

        {/* Enable 2FA flow */}
        {!profile?.twoFactorEnabled && !setup2fa && (
          <Button onClick={start2faSetup} disabled={working} size="sm">
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable 2FA"}
          </Button>
        )}

        {setup2fa && qrCode && (
          <div className="space-y-4 pt-2 border-t">
            <p className="text-sm text-gray-600">
              Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app.
            </p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="2FA QR code" className="w-48 h-48 rounded-lg border" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Or enter this key manually:</p>
              <code className="text-xs font-mono text-gray-700 break-all">{manualKey}</code>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totp-confirm">Enter the 6-digit code from your app to confirm</Label>
              <Input
                id="totp-confirm"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={totpInput}
                onChange={e => setTotpInput(e.target.value.replace(/\D/g, ""))}
                className="text-center text-xl tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={confirm2fa}
                disabled={totpInput.length !== 6 || working}
                size="sm"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm and enable"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSetup2fa(false); setQrCode(null); setTotpInput("") }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Disable 2FA flow */}
        {profile?.twoFactorEnabled && !disable2fa && (
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => setDisable2fa(true)}
          >
            Disable 2FA
          </Button>
        )}

        {disable2fa && (
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm text-gray-600">
              Enter your current authenticator code to disable 2FA.
            </p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={e => setDisableCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-xl tracking-widest"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={do2faDisable}
                disabled={disableCode.length !== 6 || working}
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm disable"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setDisable2fa(false); setDisableCode("") }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Active sessions card ──────────────────────── */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            Active sessions
            <span className="ml-2 text-xs text-gray-400 font-normal">{sessions.length} device{sessions.length !== 1 ? "s" : ""}</span>
          </p>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-red-200 text-red-600 hover:bg-red-50"
              onClick={revokeAll}
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Log out all
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {sessions.length === 0 && (
            <p className="text-sm text-gray-400">No active sessions found.</p>
          )}
          {sessions.map((session, i) => {
            const Icon = deviceIcon(session.userAgent)
            const isCurrentGuess = i === 0 // Most recently used = current
            return (
              <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {session.ipAddress ?? "Unknown IP"}
                    </p>
                    {isCurrentGuess && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    Last active {formatDate(session.lastUsedAt)}
                  </p>
                  {session.userAgent && (
                    <p className="text-xs text-gray-300 truncate">{session.userAgent.slice(0, 60)}</p>
                  )}
                </div>
                {!isCurrentGuess && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Revoke this session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
