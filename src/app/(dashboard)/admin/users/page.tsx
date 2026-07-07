"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  Search, AlertCircle, CheckCircle2,
  Shield, Lock, Unlock, ChevronDown,
} from "lucide-react"

const ROLES = [
  "USER",
  "OFFICER_BANK",
  "OFFICER_NPCI",
  "OMBUDSMAN",
  "CYBERCRIME",
  "JUROR",
  "ADMIN",
  "AUDITOR",
] as const

const ROLE_COLORS: Record<string, string> = {
  USER:          "bg-gray-100 text-gray-600",
  OFFICER_BANK:  "bg-blue-100 text-blue-700",
  OFFICER_NPCI:  "bg-purple-100 text-purple-700",
  OMBUDSMAN:     "bg-indigo-100 text-indigo-700",
  CYBERCRIME:    "bg-red-100 text-red-700",
  JUROR:         "bg-yellow-100 text-yellow-700",
  ADMIN:         "bg-green-100 text-green-700",
  AUDITOR:       "bg-orange-100 text-orange-700",
}

interface User {
  id:               string
  email:            string
  role:             string
  emailVerified:    boolean
  isLocked:         boolean
  twoFactorEnabled: boolean
  createdAt:        string
  lastLoginAt:      string | null
  _count:           { cases: number }
}

export default function AdminUsersPage() {
  const authFetch  = useAuthFetch()
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [error, setError]       = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null) // userId being updated
  const [toast, setToast]       = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const loadUsers = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    const params = q ? `?search=${encodeURIComponent(q)}` : ""
    authFetch(`/api/admin/users${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setUsers(data.users ?? [])
      })
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadUsers("") }, [])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => loadUsers(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const changeRole = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      const res = await authFetch(`/api/admin/users/${userId}/role`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(`Error: ${data.error}`); return }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      showToast(`Role updated to ${newRole.replace(/_/g, " ")}`)
    } finally {
      setUpdating(null)
    }
  }

  const unlockUser = async (userId: string) => {
    setUpdating(userId)
    try {
      const res = await authFetch(`/api/admin/users/${userId}/unlock`, { method: "PATCH" })
      const data = await res.json()
      if (!res.ok) { showToast(`Error: ${data.error}`); return }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isLocked: false, } : u))
      showToast("Account unlocked")
    } finally {
      setUpdating(null)
    }
  }

  // Summary counts
  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">User management</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} total users</p>
      </div>

      {/* Role summary chips */}
      <div className="flex flex-wrap gap-2">
        {ROLES.filter(r => roleCounts[r] > 0).map(role => (
          <div
            key={role}
            className={cn("text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5", ROLE_COLORS[role])}
          >
            <span>{role.replace(/_/g, " ")}</span>
            <span className="opacity-60">·</span>
            <span>{roleCounts[role]}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-4">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">User</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell">Cases</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Last login</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  {/* Email */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[180px]">{user.email}</p>
                    <p className="text-xs text-gray-400 font-mono">{user.id.slice(0, 8)}…</p>
                  </td>

                  {/* Role dropdown */}
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <select
                        value={user.role}
                        disabled={updating === user.id}
                        onChange={e => changeRole(user.id, e.target.value)}
                        className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer appearance-none pr-6",
                          "focus:outline-none focus:ring-2 focus:ring-blue-300",
                          updating === user.id ? "opacity-50 cursor-not-allowed" : "",
                          ROLE_COLORS[user.role]
                        )}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-50" />
                    </div>
                  </td>

                  {/* Cases count */}
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {user._count.cases}
                  </td>

                  {/* Last login */}
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                  </td>

                  {/* Status badges */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {user.emailVerified ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Unverified</span>
                      )}
                      {user.twoFactorEnabled && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <Shield className="h-3 w-3" /> 2FA on
                        </span>
                      )}
                      {user.isLocked && (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Unlock button */}
                  <td className="px-4 py-3">
                    {user.isLocked && (
                      <button
                        onClick={() => unlockUser(user.id)}
                        disabled={updating === user.id}
                        className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 font-medium disabled:opacity-50"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Unlock
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* How to guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-800 mb-2">How to promote a user</p>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Ask the person to register normally at <code className="bg-blue-100 px-1 rounded">/register</code></li>
          <li>Find their email in this table</li>
          <li>Click the role dropdown next to their name and select the new role</li>
          <li>They can log out and back in — they will now see the correct dashboard</li>
        </ol>
      </div>
    </div>
  )
}
