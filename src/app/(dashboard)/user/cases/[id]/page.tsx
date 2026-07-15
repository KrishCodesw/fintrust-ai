"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthFetch } from "@/hooks/use-fetch"
import { PdfReportButton } from "@/components/case/pdf-report"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatCurrency, getDaysRemaining } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  Copy,
  ExternalLink,
} from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  FILED: "bg-gray-100 text-gray-600",
  CLASSIFIED: "bg-blue-100 text-blue-700",
  ROUTED: "bg-purple-100 text-purple-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  ESCALATED: "bg-orange-100 text-orange-700",
  JUROR_REVIEW: "bg-indigo-100 text-indigo-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
}

const FRAUD_ICONS: Record<string, any> = {
  SAFE: ShieldCheck,
  SUSPICIOUS: ShieldAlert,
  DANGEROUS: ShieldX,
}

const FRAUD_COLORS: Record<string, string> = {
  SAFE: "text-green-600",
  SUSPICIOUS: "text-yellow-600",
  DANGEROUS: "text-red-600",
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
        if (data.error) {
          setError(data.error)
          return
        }
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

  if (loading)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )

  if (error)
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    )

  if (!caseData) return null

  const daysLeft = caseData.slaDeadline ? getDaysRemaining(caseData.slaDeadline) : null
  const slaUrgent = daysLeft !== null && daysLeft <= 2

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">Case detail</h1>
              <PdfReportButton caseId={id} />
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_COLORS[caseData.status]
              )}
            >
              {caseData.status.replace(/_/g, " ")}
            </span>
          </div>
          <button
            onClick={copyId}
            className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <code className="font-mono">{id}</code>
            <Copy className="h-3 w-3" />
            {copied && <span className="text-green-600">Copied!</span>}
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {caseData.amount && (
            <div>
              <p className="text-xs text-gray-400">Amount</p>
              <p className="font-semibold">{formatCurrency(caseData.amount)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">Type</p>
            <p className="font-medium">{caseData.disputeType.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Severity</p>
            <p className="font-medium">{caseData.severity}</p>
          </div>
          {caseData.assignedTo && (
            <div>
              <p className="text-xs text-gray-400">Assigned to</p>
              <p className="font-medium">{caseData.assignedTo.replace(/_/g, " ")}</p>
            </div>
          )}
          {caseData.bankName && (
            <div>
              <p className="text-xs text-gray-400">Bank</p>
              <p className="font-medium">{caseData.bankName}</p>
            </div>
          )}
          {daysLeft !== null && !["RESOLVED", "CLOSED"].includes(caseData.status) && (
            <div>
              <p className="text-xs text-gray-400">SLA deadline</p>
              <p className={cn("font-medium", slaUrgent ? "text-red-500" : "text-gray-700")}>
                {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs text-gray-400">Description</p>
          <p className="text-sm leading-relaxed text-gray-700">{caseData.description}</p>
        </div>

        {caseData.aiSummary && (
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="mb-1 text-xs font-medium text-blue-700">AI Summary</p>
            <p className="text-sm leading-relaxed text-blue-800">{caseData.aiSummary}</p>
          </div>
        )}
      </div>

      {/* Fraud checks */}
      {caseData.fraudChecks?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">Fraud link check</p>
          {caseData.fraudChecks.map((fc: any) => {
            const Icon = FRAUD_ICONS[fc.verdict] ?? ShieldCheck
            return (
              <div key={fc.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", FRAUD_COLORS[fc.verdict])} />
                  <span className={cn("text-sm font-medium", FRAUD_COLORS[fc.verdict])}>
                    {fc.verdict}
                  </span>
                  <span className="flex-1 truncate text-xs text-gray-400">{fc.url}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Evidence */}
      {caseData.evidenceUrls?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-900">
            Evidence ({caseData.evidenceUrls.length} files)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {caseData.evidenceUrls.map((url: string, i: number) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-2 text-sm text-blue-600 hover:bg-gray-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                File {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Draft complaint */}
      {caseData.draftComplaint && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">AI-generated complaint draft</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(caseData.draftComplaint)}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
            {caseData.draftComplaint}
          </pre>
        </div>
      )}

      {/* Audit timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-gray-900">Case timeline</p>
        <div className="space-y-0">
          {caseData.auditEvents?.map((event: any, i: number) => (
            <div key={event.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                </div>
                {i < caseData.auditEvents.length - 1 && (
                  <div className="my-1 w-0.5 flex-1 bg-gray-100" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-5">
                <p className="text-sm font-medium text-gray-900">
                  {event.eventType.replace(/_/g, " ")}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{formatDate(event.createdAt)}</p>
                <p className="mt-1 truncate font-mono text-xs text-gray-300" title={event.hash}>
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
