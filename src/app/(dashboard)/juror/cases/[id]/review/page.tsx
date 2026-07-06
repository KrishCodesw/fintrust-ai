"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ChevronLeft, CheckCircle2, Loader2, AlertCircle, User, Building2, Minus } from "lucide-react"

const VERDICTS = [
  {
    value: "FAVOUR_USER",
    label: "In favour of user",
    desc:  "The evidence supports the complainant's claim.",
    color: "border-green-300 bg-green-50 text-green-800",
    icon:  User,
  },
  {
    value: "FAVOUR_AUTHORITY",
    label: "In favour of authority",
    desc:  "The authority's decision was correct.",
    color: "border-blue-300 bg-blue-50 text-blue-800",
    icon:  Building2,
  },
  {
    value: "INCONCLUSIVE",
    label: "Inconclusive",
    desc:  "Insufficient evidence to determine outcome.",
    color: "border-gray-300 bg-gray-50 text-gray-700",
    icon:  Minus,
  },
]

export default function JurorReviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const authFetch = useAuthFetch()
  const [caseData, setCaseData]   = useState<any>(null)
  const [jurorSummary, setJurorSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [verdict, setVerdict]     = useState<string | null>(null)
  const [reasoning, setReasoning] = useState("")
  const [error, setError]         = useState<string | null>(null)
  const [done, setDone]           = useState(false)

  useEffect(() => {
    authFetch(`/api/cases/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setCaseData(data.case)
        // Auto-fetch juror AI summary
        fetchJurorSummary(data.case.description, data.case.aiSummary)
      })
      .catch(() => setError("Failed to load case"))
      .finally(() => setLoading(false))
  }, [id])

  const fetchJurorSummary = async (description: string, existingSummary?: string) => {
    setLoadingSummary(true)
    try {
      const res = await authFetch("/api/ai/juror-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: id, description, officerNotes: existingSummary }),
      })
      const data = await res.json()
      if (data.summary) setJurorSummary(data.summary)
    } catch {
      // non-fatal
    } finally {
      setLoadingSummary(false)
    }
  }

  const submitVerdict = async () => {
    if (!verdict || reasoning.length < 10) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch(`/api/cases/${id}/verdict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict, reasoning }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setDone(true)
    } catch {
      setError("Submission failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return (
    <div className="max-w-lg mx-auto pt-12 text-center space-y-4">
      <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
      <h2 className="text-xl font-semibold">Verdict submitted</h2>
      <p className="text-gray-500 text-sm">Thank you for your review. The majority verdict will be computed once all jurors submit.</p>
      <Button onClick={() => router.push("/juror")}>Back to queue</Button>
    </div>
  )

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
    </div>
  )

  if (!caseData) return null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Case review</h1>
          <p className="text-sm text-gray-500">Read carefully before submitting your verdict</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Case facts */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Case facts</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Type</p><p className="font-medium">{caseData.disputeType.replace(/_/g," ")}</p></div>
          <div><p className="text-xs text-gray-400">Severity</p><p className="font-medium">{caseData.severity}</p></div>
          {caseData.amount && (
            <div><p className="text-xs text-gray-400">Amount</p><p className="font-semibold">{formatCurrency(caseData.amount)}</p></div>
          )}
          <div><p className="text-xs text-gray-400">Filed</p><p className="font-medium">{formatDate(caseData.createdAt)}</p></div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">User's description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{caseData.description}</p>
        </div>
      </div>

      {/* AI bilateral summary */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-indigo-900 mb-2">AI case summary (both sides)</p>
        {loadingSummary ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-indigo-100" />
            <Skeleton className="h-4 w-3/4 bg-indigo-100" />
          </div>
        ) : jurorSummary ? (
          <p className="text-sm text-indigo-800 leading-relaxed">{jurorSummary}</p>
        ) : (
          <p className="text-sm text-indigo-600 italic">Summary not available.</p>
        )}
      </div>

      {/* Verdict selection */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-900">Your verdict</p>
        <div className="space-y-2">
          {VERDICTS.map(v => (
            <button
              key={v.value}
              type="button"
              onClick={() => setVerdict(v.value)}
              className={cn(
                "w-full text-left p-4 rounded-xl border-2 transition-all",
                verdict === v.value ? v.color : "border-gray-200 hover:border-gray-300 bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                <v.icon className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{v.label}</p>
                  <p className="text-xs text-current opacity-70 mt-0.5">{v.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reasoning">
            Reasoning <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">(min 10 characters)</span>
          </Label>
          <Textarea
            id="reasoning"
            rows={4}
            placeholder="Explain your verdict based on the evidence and facts presented..."
            value={reasoning}
            onChange={e => setReasoning(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          onClick={submitVerdict}
          disabled={!verdict || reasoning.length < 10 || submitting}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
          ) : "Submit verdict"}
        </Button>
      </div>
    </div>
  )
}
