"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatCurrency, getDaysRemaining } from "@/lib/utils"
import { Plus, ChevronRight, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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

const SEVERITY_COLORS: Record<string, string> = {
  LOW:    "bg-green-50 text-green-700",
  MEDIUM: "bg-yellow-50 text-yellow-700",
  HIGH:   "bg-red-50 text-red-700",
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

export default function MyCasesPage() {
  const authFetch = useAuthFetch()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authFetch("/api/cases")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        setCases(data.cases ?? [])
      })
      .catch(() => setError("Failed to load cases"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your payment disputes</p>
        </div>
        <Button asChild>
          <Link href="/user/new-complaint">
            <Plus className="h-4 w-4 mr-1.5" />
            File dispute
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-4">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && cases.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <p className="text-gray-400 text-sm">No cases filed yet.</p>
          <Button asChild variant="outline">
            <Link href="/user/new-complaint">File your first dispute</Link>
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {cases.map((c) => {
          const daysLeft = c.slaDeadline ? getDaysRemaining(c.slaDeadline) : null
          const slaUrgent = daysLeft !== null && daysLeft <= 2 && !["RESOLVED","CLOSED"].includes(c.status)

          return (
            <Link
              key={c.id}
              href={`/user/cases/${c.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600")}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", SEVERITY_COLORS[c.severity])}>
                      {c.severity}
                    </span>
                    <span className="text-xs text-gray-400">
                      {c.disputeType.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 line-clamp-2">{c.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    {c.amount && <span className="font-medium text-gray-600">{formatCurrency(c.amount)}</span>}
                    {c.assignedTo && <span>→ {c.assignedTo.replace(/_/g, " ")}</span>}
                    <span>{formatDate(c.createdAt)}</span>
                    {daysLeft !== null && !["RESOLVED","CLOSED"].includes(c.status) && (
                      <span className={cn("font-medium", slaUrgent ? "text-red-500" : "text-gray-400")}>
                        {slaUrgent ? "⚠️ " : ""}{daysLeft}d SLA remaining
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
