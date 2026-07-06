"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatCurrency, getDaysRemaining } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  FileText, ShieldCheck, ShieldAlert, ShieldX,
  CheckCircle2, Clock, AlertCircle, ChevronLeft,
  Copy, ExternalLink
} from "lucide-react"

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

const FRAUD_ICONS: Record<string, any> = {
  SAFE:       ShieldCheck,
  SUSPICIOUS: ShieldAlert,
  DANGEROUS:  ShieldX,
}

const FRAUD_COLORS: Record<string, string> = {
  SAFE:       "text-green-600",
  SUSPICIOUS: "text-yellow-600",
  DANGEROUS:  "text-red-600",
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const authFetch = useAuthFetch()
  const [caseData, setCaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    authFetch(`/api/cases/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        setCaseData(data.case)
      })
      .catch(() => setError("Failed to load case"))
      .finally(() => setLoading(false))
  }, [id])

  const copyId = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )

  if (error) return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-4">
        <AlertCircle className="h-5 w-5" />
        <p>{error}</p>
      </div>
    </div>
  )

  if (!caseData) return null

  const daysLeft = caseData.slaDeadline ? getDaysRemaining(caseData.slaDeadline) : null
  const slaUrgent = daysLeft !== null && daysLeft <= 2

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">Case detail</h1>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[caseData.status])}>
              {caseData.status.replace(/_/g, " ")}
            </span>
          </div>
          <button onClick={copyId} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-0.5">
            <code className="font-mono">{id}</code>
            <Copy className="h-3 w-3" />
            {copied && <span className="text-green-600">Copied!</span>}
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {caseData.amount && (
            <div><p className="text-gray-400 text-xs">Amount</p><p className="font-semibold">{formatCurrency(caseData.amount)}</p></div>
          )}
          <div><p className="text-gray-400 text-xs">Type</p><p className="font-medium">{caseData.disputeType.replace(/_/g," ")}</p></div>
          <div><p className="text-gray-400 text-xs">Severity</p><p className="font-medium">{caseData.severity}</p></div>
          {caseData.assignedTo && (
            <div><p className="text-gray-400 text-xs">Assigned to</p><p className="font-medium">{caseData.assignedTo.replace(/_/g," ")}</p></div>
          )}
          {caseData.bankName && (
            <div><p className="text-gray-400 text-xs">Bank</p><p className="font-medium">{caseData.bankName}</p></div>
          )}
          {daysLeft !== null && !["RESOLVED","CLOSED"].includes(caseData.status) && (
            <div>
              <p className="text-gray-400 text-xs">SLA deadline</p>
              <p className={cn("font-medium", slaUrgent ? "text-red-500" : "text-gray-700")}>
                {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{caseData.description}</p>
        </div>

        {caseData.aiSummary && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 mb-1">AI Summary</p>
            <p className="text-sm text-blue-800 leading-relaxed">{caseData.aiSummary}</p>
          </div>
        )}
      </div>

      {/* Fraud checks */}
      {caseData.fraudChecks?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">Fraud link check</p>
          {caseData.fraudChecks.map((fc: any) => {
            const Icon = FRAUD_ICONS[fc.verdict] ?? ShieldCheck
            return (
              <div key={fc.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", FRAUD_COLORS[fc.verdict])} />
                  <span className={cn("text-sm font-medium", FRAUD_COLORS[fc.verdict])}>{fc.verdict}</span>
                  <span className="text-xs text-gray-400 truncate flex-1">{fc.url}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Evidence */}
      {caseData.evidenceUrls?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">Evidence ({caseData.evidenceUrls.length} files)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {caseData.evidenceUrls.map((url: string, i: number) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg border hover:bg-gray-50 text-sm text-blue-600">
                <ExternalLink className="h-3.5 w-3.5" />
                File {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Draft complaint */}
      {caseData.draftComplaint && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">AI-generated complaint draft</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(caseData.draftComplaint)}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy
            </Button>
          </div>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
            {caseData.draftComplaint}
          </pre>
        </div>
      )}

      {/* Audit timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">Case timeline</p>
        <div className="space-y-0">
          {caseData.auditEvents?.map((event: any, i: number) => (
            <div key={event.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                </div>
                {i < caseData.auditEvents.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-100 my-1" />
                )}
              </div>
              <div className="pb-5 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {event.eventType.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.createdAt)}</p>
                <p className="text-xs font-mono text-gray-300 mt-1 truncate" title={event.hash}>
                  #{event.hash.slice(0, 16)}…
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
