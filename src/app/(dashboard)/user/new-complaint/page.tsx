"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCaseSchema, type CreateCaseInput } from "@/types/case"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Button } from "@/components/ui/button"
import { StepDetails } from "@/components/complaint/step-details"
import { StepEvidence } from "@/components/complaint/step-evidence"
import { StepFraud } from "@/components/complaint/step-fraud"
import { StepReview } from "@/components/complaint/step-review"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = ["Details", "Evidence", "Fraud check", "Review"]

export default function NewComplaintPage() {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ caseId: string; assignedTo: string } | null>(null)

  const form = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: {
      transactionId: "",
      upiId: "",
      bankName: "",
      appUsed: "",
      description: "",
      fraudLink: "",
      evidenceUrls: [],
    },
  })

  const next = async () => {
    // Validate description on step 0 before moving forward
    if (step === 0) {
      const valid = await form.trigger("description")
      if (!valid) return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const back = () => setStep((s) => Math.max(s - 1, 0))

  const onSubmit = async () => {
    setSubmitting(true)
    setServerError(null)

    try {
      const values = form.getValues()
      const res = await authFetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          // Clean empty strings to undefined
          transactionId: values.transactionId || undefined,
          upiId: values.upiId || undefined,
          bankName: values.bankName || undefined,
          appUsed: values.appUsed || undefined,
          fraudLink: values.fraudLink || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setServerError(data.error ?? "Submission failed")
        return
      }

      setSuccess({ caseId: data.caseId, assignedTo: data.assignedTo })
    } catch {
      setServerError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ──────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-lg mx-auto pt-12 text-center space-y-5">
        <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Case filed!</h1>
          <p className="text-gray-500 mt-1">
            Your case has been classified and routed to{" "}
            <strong>{success.assignedTo.replace(/_/g, " ")}</strong>.
          </p>
        </div>
        <p className="text-sm text-gray-400">Case ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{success.caseId}</code></p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push(`/user/cases/${success.caseId}`)}>
            View case
          </Button>
          <Button variant="outline" onClick={() => router.push("/user/my-cases")}>
            All my cases
          </Button>
        </div>
      </div>
    )
  }

  // ── Wizard ──────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">File a dispute</h1>
        <p className="text-sm text-gray-500 mt-1">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  i < step  ? "bg-blue-600 text-white" :
                  i === step ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                               "bg-gray-200 text-gray-500"
                )}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={cn("text-xs hidden sm:block", i === step ? "text-blue-600 font-medium" : "text-gray-400")}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-2 mt-[-10px]", i < step ? "bg-blue-600" : "bg-gray-200")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {serverError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {step === 0 && <StepDetails form={form} />}
        {step === 1 && <StepEvidence form={form} />}
        {step === 2 && <StepFraud form={form} />}
        {step === 3 && <StepReview form={form} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
            ) : (
              "Submit case"
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
