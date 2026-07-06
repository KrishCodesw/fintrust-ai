"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ChevronRight, AlertCircle, Gavel } from "lucide-react"

interface JurorCase {
  id: string
  case: {
    id: string
    disputeType: string
    severity: string
    status: string
    amount: number | null
    description: string
    aiSummary: string | null
    createdAt: string
  }
  verdict: string | null
  submittedAt: string | null
}

export default function JurorPage() {
  const { user } = useAuth()
  const authFetch = useAuthFetch()
  const [reviews, setReviews] = useState<JurorCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authFetch("/api/juror/reviews")
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setReviews(data.reviews ?? [])
      })
      .catch(() => setError("Failed to load reviews"))
      .finally(() => setLoading(false))
  }, [])

  const pending   = reviews.filter(r => !r.verdict)
  const completed = reviews.filter(r => !!r.verdict)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Review queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {pending.length} pending · {completed.length} completed
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-4">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Awaiting your review</p>
          {pending.map(r => (
            <Link
              key={r.id}
              href={`/juror/cases/${r.case.id}/review`}
              className="block bg-white rounded-xl border-2 border-blue-200 p-4 hover:border-blue-400 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-blue-600">Review required</span>
                    <span className="text-xs text-gray-400">{r.case.disputeType.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{r.case.description}</p>
                  <div className="flex gap-3 text-xs text-gray-400">
                    {r.case.amount && <span className="font-medium text-gray-600">{formatCurrency(r.case.amount)}</span>}
                    <span>{formatDate(r.case.createdAt)}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</p>
          {completed.map(r => (
            <div key={r.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 line-clamp-1">{r.case.description}</p>
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full ml-3 flex-shrink-0",
                  r.verdict === "FAVOUR_USER"      ? "bg-green-100 text-green-700" :
                  r.verdict === "FAVOUR_AUTHORITY" ? "bg-blue-100 text-blue-700"   :
                                                     "bg-gray-100 text-gray-600"
                )}>
                  {r.verdict?.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No cases assigned for review yet.
        </div>
      )}
    </div>
  )
}
