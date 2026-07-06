"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { formatDate, formatCurrency, getDaysRemaining } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  ChevronLeft, CheckCircle2, AlertCircle,
  Clock, ArrowUpCircle, Loader2
} from "lucide-react"

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  FILED:        ["UNDER_REVIEW"],
  CLASSIFIED:   ["UNDER_REVIEW"],
  ROUTED:       ["UNDER_REVIEW"],
  UNDER_REVIEW: ["RESOLVED", "ESCALATED"],
  ESCALATED:    ["RESOLVED"],
}

const STATUS_LABELS: Record<string, string> = {
  UNDER_REVIEW: "Mark as Under Review",
  RESOLVED:     "Mark as Resolved",
  ESCALATED:    "Escalate to Jurors",
}

export default function OfficerCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const authFetch = useAuthFetch()
  const [caseData, setCaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    authFetch(`/api/cases/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setCaseData(data.case)
      })
      .catch(() => setError("Failed to load case"))
      .finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await authFetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, officerNote: note }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setCaseData(data.case)
      setSuccessMsg(`Status updated to ${newStatus.replace(/_/g, " ")}`)
      setNote("")
    } catch {
      setError("Update failed")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )

  if (!caseData) return null

  const transitions = ALLOWED_TRANSITIONS[caseData.status] ?? []
  const daysLeft = caseData.slaDeadline ? getDaysRemaining(caseData.slaDeadline) : null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Case <code className="text-base font-mono text-gray-500">{id.slice(0, 8)}…</code>
          </h1>
          <p className="text-sm text-gray-500">{caseData.status.replace(/_/g, " ")}</p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-3">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm">{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Case info */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {caseData.amount && (
            <div><p className="text-xs text-gray-400">Amount</p><p className="font-semibold">{formatCurrency(caseData.amount)}</p></div>
          )}
          <div><p className="text-xs text-gray-400">Type</p><p className="font-medium">{caseData.disputeType.replace(/_/g, " ")}</p></div>
          <div><p className="text-xs text-gray-400">Severity</p><p className="font-medium">{caseData.severity}</p></div>
          {daysLeft !== null && (
            <div>
              <p className="text-xs text-gray-400">SLA</p>
              <p className={cn("font-medium", daysLeft < 0 ? "text-red-500" : daysLeft <= 2 ? "text-orange-500" : "text-gray-700")}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
              </p>
            </div>
          )}
          <div><p className="text-xs text-gray-400">Filed</p><p className="font-medium">{formatDate(caseData.createdAt)}</p></div>
          <div><p className="text-xs text-gray-400">User</p><p className="font-medium">{caseData.user?.email}</p></div>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{caseData.description}</p>
        </div>

        {caseData.aiSummary && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 mb-1">AI Summary</p>
            <p className="text-sm text-blue-800">{caseData.aiSummary}</p>
          </div>
        )}
      </div>

      {/* Status update panel */}
      {transitions.length > 0 && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Update case status</p>

          <div className="space-y-2">
            <Label htmlFor="note">Officer note <span className="text-gray-400">(optional)</span></Label>
            <Textarea
              id="note"
              rows={3}
              placeholder="Add context about your decision..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {transitions.map(status => (
              <Button
                key={status}
                onClick={() => updateStatus(status)}
                disabled={updating}
                variant={status === "ESCALATED" ? "outline" : "default"}
                className={status === "ESCALATED" ? "border-orange-300 text-orange-700 hover:bg-orange-50" : ""}
              >
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    {status === "RESOLVED" && <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                    {status === "ESCALATED" && <ArrowUpCircle className="h-4 w-4 mr-1.5" />}
                    {status === "UNDER_REVIEW" && <Clock className="h-4 w-4 mr-1.5" />}
                    {STATUS_LABELS[status] ?? status}
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Audit timeline */}
      <div className="bg-white rounded-xl border p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">Audit trail</p>
        <div className="space-y-0">
          {caseData.auditEvents?.map((ev: any, i: number) => (
            <div key={ev.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                </div>
                {i < caseData.auditEvents.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 my-1" />}
              </div>
              <div className="pb-4 flex-1">
                <p className="text-sm font-medium text-gray-900">{ev.eventType.replace(/_/g, " ")}</p>
                <p className="text-xs text-gray-400">{formatDate(ev.createdAt)}</p>
                {ev.actorId && ev.actorId !== "AI_ENGINE" && (
                  <p className="text-xs text-gray-400">by {ev.actorId.slice(0, 8)}…</p>
                )}
                <p className="text-xs font-mono text-gray-300 mt-0.5">#{ev.hash.slice(0, 16)}…</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
