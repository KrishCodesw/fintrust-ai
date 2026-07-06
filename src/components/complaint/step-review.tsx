"use client"

import { UseFormReturn } from "react-hook-form"
import { type CreateCaseInput } from "@/types/case"
import { Badge } from "@/components/ui/badge"
import { FileImage, Link2 } from "lucide-react"

interface Props {
  form: UseFormReturn<CreateCaseInput>
}

export function StepReview({ form }: Props) {
  const data = form.getValues()

  const fields = [
    { label: "Transaction ID",    value: data.transactionId },
    { label: "UPI ID",            value: data.upiId },
    { label: "Amount",            value: data.amount ? `₹${data.amount.toLocaleString("en-IN")}` : undefined },
    { label: "Bank",              value: data.bankName },
    { label: "App used",          value: data.appUsed },
  ].filter((f) => f.value)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review and submit</h2>
        <p className="text-sm text-gray-500 mt-1">
          Check everything below. Once submitted, our AI will classify your case and route it to the correct authority.
        </p>
      </div>

      {fields.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          {fields.map(({ label, value }) => (
            <div key={label} className="flex gap-3 text-sm">
              <span className="text-gray-500 w-32 flex-shrink-0">{label}</span>
              <span className="text-gray-900 font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-700">Your description</p>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
          {data.description}
        </p>
      </div>

      {(data.evidenceUrls?.length ?? 0) > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700">
            Evidence ({data.evidenceUrls?.length} file{data.evidenceUrls?.length !== 1 ? "s" : ""})
          </p>
          <div className="flex flex-wrap gap-2">
            {data.evidenceUrls?.map((url, i) => (
              <div key={url} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                <FileImage className="h-3 w-3" />
                File {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.fraudLink && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700">Suspicious link submitted</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
            <Link2 className="h-3.5 w-3.5" />
            <span className="truncate">{data.fraudLink}</span>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800 font-medium">What happens next</p>
        <ul className="mt-2 space-y-1 text-sm text-blue-700">
          <li>→ AI classifies your dispute type and severity</li>
          <li>→ Case is routed to the correct authority (Bank / NPCI / Ombudsman / Cybercrime)</li>
          <li>→ SLA deadline is set based on the authority</li>
          <li>→ You can track every status change in real time</li>
        </ul>
      </div>
    </div>
  )
}
