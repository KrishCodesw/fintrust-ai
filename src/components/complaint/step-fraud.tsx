"use client"

import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { type CreateCaseInput } from "@/types/case"
import { useAuthFetch } from "@/hooks/use-fetch"
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, Search } from "lucide-react"

interface Props {
  form: UseFormReturn<CreateCaseInput>
}

type Verdict = "SAFE" | "SUSPICIOUS" | "DANGEROUS" | null

const VERDICT_CONFIG = {
  SAFE:      { label: "Safe",       color: "bg-green-100 text-green-700",  Icon: ShieldCheck },
  SUSPICIOUS:{ label: "Suspicious", color: "bg-yellow-100 text-yellow-700",Icon: ShieldAlert },
  DANGEROUS: { label: "Dangerous",  color: "bg-red-100 text-red-700",      Icon: ShieldX    },
}

export function StepFraud({ form }: Props) {
  const { register, setValue, watch } = form
  const [checking, setChecking] = useState(false)
  const [verdict, setVerdict] = useState<Verdict>(null)
  const [sources, setSources] = useState<Array<{ name: string; flagged: boolean; detail?: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()

  const fraudLink = watch("fraudLink")

  const checkLink = async () => {
    if (!fraudLink) return
    setChecking(true)
    setError(null)
    setVerdict(null)

    try {
      const res = await authFetch("/api/fraud/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fraudLink }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setVerdict(data.verdict)
      setSources(data.sources)
    } catch {
      setError("Check failed. Please try again.")
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Fraud link check</h2>
        <p className="text-sm text-gray-500 mt-1">
          If you received a suspicious link, QR code URL, or were directed to a website — paste it here.
          We'll check it against Google Safe Browsing and VirusTotal.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fraudLink">Suspicious URL <span className="text-gray-400">(optional)</span></Label>
        <div className="flex gap-2">
          <Input
            id="fraudLink"
            placeholder="https://suspicious-site.com/..."
            {...register("fraudLink")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={checkLink}
            disabled={!fraudLink || checking}
            className="flex-shrink-0"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><Search className="h-4 w-4 mr-1.5" />Check</>
            )}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {verdict && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-3">
            {(() => {
              const cfg = VERDICT_CONFIG[verdict]
              return (
                <>
                  <cfg.Icon className="h-6 w-6" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      Verdict: <span className={`px-2 py-0.5 rounded-full text-sm ${cfg.color}`}>{cfg.label}</span>
                    </p>
                  </div>
                </>
              )
            })()}
          </div>

          <div className="space-y-1.5">
            {sources.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-sm text-gray-600">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.flagged ? "bg-red-500" : "bg-green-500"}`} />
                <span className="font-medium">{s.name}:</span>
                <span className="text-gray-500">{s.detail ?? (s.flagged ? "Flagged" : "Clean")}</span>
              </div>
            ))}
          </div>

          {verdict === "DANGEROUS" && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              ⚠️ This URL is flagged as dangerous. Do not visit it. Your case has been escalated to the cybercrime authority.
            </p>
          )}
        </div>
      )}

      {!fraudLink && (
        <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-3">
          No suspicious link? That's fine — skip this step and click Next.
        </p>
      )}
    </div>
  )
}
