"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatCurrency, getDaysRemaining } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ChevronRight, AlertCircle, Clock, CheckCircle2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"

// Maps officer role → which authority's cases they see
const ROLE_TO_AUTHORITY: Record<string, string> = {
  OFFICER_BANK:  "BANK",
  OFFICER_NPCI:  "NPCI",
  OMBUDSMAN:     "RBI_OMBUDSMAN",
  CYBERCRIME:    "CYBERCRIME",
  ADMIN:         "", // admin sees all
}

const STATUS_COLORS: Record<string, string> = {
  FILED:        "bg-gray-100 text-gray-600",
  CLASSIFIED:   "bg-blue-100 text-blue-700",
  ROUTED:       "bg-purple-100 text-purple-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  ESCALATED:    "bg-orange-100 text-orange-700",
  JUROR_REVIEW: "bg-indigo-100 text-indigo-700",
  RESOLVED:     "bg-green-100 text-green-700",
  CLOSED:       "bg-gray-100 text-gray-500",
}

const SEVERITY_DOT: Record<string, string> = {
  LOW:    "bg-green-400",
  MEDIUM: "bg-yellow-400",
  HIGH:   "bg-red-500",
}

interface Case {
  id: string
  disputeType: string
  severity: string
  status: string
  assignedTo: string | null
  amount: number | null
  description: string
  slaDeadline: string | null
  createdAt: string
}

export default function OfficerPage() {
  const { user } = useAuth()
  const authFetch = useAuthFetch()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")

  const authority = user ? ROLE_TO_AUTHORITY[user.role] : ""

  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (authority) params.set("authority", authority)

    authFetch(`/api/officer/cases?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        setCases(data.cases ?? [])
      })
      .catch(() => setError("Failed to load cases"))
      .finally(() => setLoading(false))
  }, [user, statusFilter])

  const statuses = ["", "FILED", "CLASSIFIED", "UNDER_REVIEW", "ESCALATED", "RESOLVED"]

  // Quick stats
  const total    = cases.length
  const pending  = cases.filter(c => !["RESOLVED","CLOSED"].includes(c.status)).length
  const breached = cases.filter(c => c.slaDeadline && getDaysRemaining(c.slaDeadline) < 0 && !["RESOLVED","CLOSED"].includes(c.status)).length
  const resolved = cases.filter(c => c.status === "RESOLVED").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Assigned cases</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {authority ? `Authority: ${authority.replace(/_/g, " ")}` : "All authorities (Admin view)"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",    value: total,    icon: Filter,       color: "text-gray-700" },
          { label: "Pending",  value: pending,  icon: Clock,        color: "text-yellow-600" },
          { label: "SLA breach",value: breached,icon: AlertCircle,  color: "text-red-600" },
          { label: "Resolved", value: resolved, icon: CheckCircle2, color: "text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", color)} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className={cn("text-2xl font-semibold mt-1", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setLoading(true) }}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Cases list */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-4">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && cases.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No cases match this filter.
        </div>
      )}

      <div className="space-y-3">
        {cases.map((c) => {
          const daysLeft = c.slaDeadline ? getDaysRemaining(c.slaDeadline) : null
          const breached = daysLeft !== null && daysLeft < 0 && !["RESOLVED","CLOSED"].includes(c.status)
          const urgent   = daysLeft !== null && daysLeft <= 2 && daysLeft >= 0

          return (
            <Link
              key={c.id}
              href={`/officer/cases/${c.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", SEVERITY_DOT[c.severity])} />
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[c.status])}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-gray-400">{c.disputeType.replace(/_/g, " ")}</span>
                    {breached && (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        ⚠ SLA breached
                      </span>
                    )}
                    {urgent && !breached && (
                      <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        {daysLeft}d left
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{c.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    {c.amount && <span className="font-medium text-gray-600">{formatCurrency(c.amount)}</span>}
                    <span>{formatDate(c.createdAt)}</span>
                    {daysLeft !== null && !["RESOLVED","CLOSED"].includes(c.status) && (
                      <span className={breached ? "text-red-500 font-medium" : ""}>
                        SLA: {breached ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
