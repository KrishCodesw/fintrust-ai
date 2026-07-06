"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, CheckCircle2, XCircle, Loader2, ShieldX } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface AuditResult {
  valid: boolean
  events: Array<{
    id:        string
    eventType: string
    hash:      string
    valid:     boolean
    createdAt: string
  }>
}

export default function AuditVerificationPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const [result, setResult] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/audit/${caseId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setResult(data)
      })
      .catch(() => setError("Verification request failed"))
      .finally(() => setLoading(false))
  }, [caseId])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            DisputeResolve
          </Link>
          <span className="text-xs text-gray-400">Audit verification</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit chain verification</h1>
          <p className="text-sm text-gray-500 mt-1">
            Case <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{caseId}</code>
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm">Recomputing hash chain…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {result && (
          <>
            {/* Overall verdict */}
            <div className={cn(
              "rounded-xl border-2 p-6 flex items-center gap-4",
              result.valid
                ? "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
            )}>
              {result.valid
                ? <CheckCircle2 className="h-10 w-10 text-green-600 flex-shrink-0" />
                : <ShieldX className="h-10 w-10 text-red-600 flex-shrink-0" />
              }
              <div>
                <p className={cn("text-xl font-semibold", result.valid ? "text-green-800" : "text-red-800")}>
                  {result.valid ? "✓ Audit chain verified" : "✗ Tampering detected"}
                </p>
                <p className={cn("text-sm mt-1", result.valid ? "text-green-700" : "text-red-700")}>
                  {result.valid
                    ? `All ${result.events.length} events are intact. No records have been altered.`
                    : `One or more events have been altered. This case record cannot be trusted.`
                  }
                </p>
              </div>
            </div>

            {/* Event-by-event breakdown */}
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">
                Event integrity ({result.events.filter(e => e.valid).length} / {result.events.length} valid)
              </p>
              <div className="space-y-3">
                {result.events.map((ev, i) => (
                  <div
                    key={ev.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      ev.valid ? "border-gray-100 bg-gray-50" : "border-red-200 bg-red-50"
                    )}
                  >
                    {ev.valid
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      : <XCircle      className="h-4 w-4 text-red-500   flex-shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{ev.eventType.replace(/_/g, " ")}</p>
                        <span className="text-xs text-gray-400">{formatDate(ev.createdAt)}</span>
                      </div>
                      <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">
                        SHA-256: {ev.hash}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Verification method: server recomputes SHA-256(prevHash + eventType + data) for each event
              and compares against the stored hash. A mismatch indicates tampering.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
