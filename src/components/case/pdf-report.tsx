"use client"

import { useState } from "react"
import { useAuthFetch } from "@/hooks/use-fetch"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"

interface Props {
  caseId: string
  disabled?: boolean
}

// We generate the PDF client-side using the browser's print API
// This avoids serverless timeout limits and works without @react-pdf/renderer
// The user gets a properly formatted printable page
export function PdfReportButton({ caseId, disabled }: Props) {
  const authFetch  = useAuthFetch()
  const [loading, setLoading] = useState(false)

  const downloadReport = async () => {
    setLoading(true)
    try {
      const res  = await authFetch(`/api/cases/${caseId}/report`)
      const data = await res.json()
      if (!res.ok) { alert(data.error); return }

      const c    = data.case
      const html = buildReportHtml(c, data.auditResult, data.generatedAt)

      // Open in a new window and trigger print dialog
      const win = window.open("", "_blank")
      if (!win) { alert("Please allow popups to download the report."); return }
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    } catch {
      alert("Failed to generate report")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={downloadReport}
      disabled={disabled || loading}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
        : <FileDown className="h-4 w-4 mr-1.5" />
      }
      Download report
    </Button>
  )
}

function buildReportHtml(c: any, audit: any, generatedAt: string): string {
  const fmt = (d: string) => new Date(d).toLocaleString("en-IN", {
    dateStyle: "medium", timeStyle: "short",
  })

  const auditRows = (audit.events ?? []).map((ev: any) => `
    <tr>
      <td>${ev.eventType.replace(/_/g, " ")}</td>
      <td>${fmt(ev.createdAt)}</td>
      <td style="font-family:monospace;font-size:10px">${ev.hash.slice(0, 20)}…</td>
      <td style="color:${ev.valid ? "#16a34a" : "#dc2626"}">${ev.valid ? "✓ Valid" : "✗ Tampered"}</td>
    </tr>
  `).join("")

  const jurorRows = (c.jurorReviews ?? []).map((jr: any, i: number) => `
    <tr>
      <td>Juror ${i + 1}</td>
      <td>${jr.verdict?.replace(/_/g, " ") ?? "Pending"}</td>
      <td>${jr.reasoning ?? "—"}</td>
    </tr>
  `).join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Case Report — ${c.id}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Arial, sans-serif; font-size: 13px; color: #111; margin: 0; padding: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; color: #374151; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #6b7280; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .field label { font-size: 11px; color: #6b7280; display: block; margin-bottom: 2px; }
    .field p { font-weight: 500; margin: 0; }
    .desc { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; line-height: 1.6; }
    .ai-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 6px 8px; background: #f3f4f6; font-weight: 600; font-size: 11px; color: #374151; }
    td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    .verdict-box { background: ${audit.valid ? "#f0fdf4" : "#fef2f2"}; border: 1px solid ${audit.valid ? "#bbf7d0" : "#fecaca"}; border-radius: 6px; padding: 12px; margin-bottom: 16px; }
    .verdict-title { font-weight: 600; font-size: 14px; color: ${audit.valid ? "#15803d" : "#dc2626"}; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; }
    .badge-status { background: #dbeafe; color: #1d4ed8; }
    .badge-severity-HIGH { background: #fee2e2; color: #dc2626; }
    .badge-severity-MEDIUM { background: #fef3c7; color: #d97706; }
    .badge-severity-LOW { background: #dcfce7; color: #16a34a; }
    @media print {
      body { padding: 16px; }
      button { display: none; }
    }
  </style>
</head>
<body>

<div class="header">
  <div>
    <h1>Dispute Resolution Report</h1>
    <div class="brand">DisputeResolve · AI-powered payment redressal</div>
  </div>
  <div class="meta">
    <div>Generated: ${fmt(generatedAt)}</div>
    <div>Case ID: <code>${c.id}</code></div>
  </div>
</div>

<h2>Case summary</h2>
<div class="grid">
  <div class="field"><label>Dispute type</label><p>${c.disputeType.replace(/_/g, " ")}</p></div>
  <div class="field"><label>Severity</label><p><span class="badge badge-severity-${c.severity}">${c.severity}</span></p></div>
  <div class="field"><label>Status</label><p><span class="badge badge-status">${c.status.replace(/_/g, " ")}</span></p></div>
  <div class="field"><label>Assigned to</label><p>${c.assignedTo?.replace(/_/g, " ") ?? "Unassigned"}</p></div>
  ${c.amount ? `<div class="field"><label>Amount</label><p>₹${c.amount.toLocaleString("en-IN")}</p></div>` : ""}
  ${c.bankName ? `<div class="field"><label>Bank</label><p>${c.bankName}</p></div>` : ""}
  ${c.transactionId ? `<div class="field"><label>Transaction ID</label><p>${c.transactionId}</p></div>` : ""}
  <div class="field"><label>Filed</label><p>${fmt(c.createdAt)}</p></div>
  ${c.closedAt ? `<div class="field"><label>Closed</label><p>${fmt(c.closedAt)}</p></div>` : ""}
</div>

<h2>User description</h2>
<div class="desc">${c.description}</div>

${c.aiSummary ? `
<h2>AI classification summary</h2>
<div class="ai-box">${c.aiSummary}</div>
` : ""}

${c.draftComplaint ? `
<h2>AI-generated complaint draft</h2>
<div class="desc" style="white-space:pre-wrap">${c.draftComplaint}</div>
` : ""}

${jurorRows ? `
<h2>Juror verdicts</h2>
<table>
  <tr><th>Juror</th><th>Verdict</th><th>Reasoning</th></tr>
  ${jurorRows}
</table>
` : ""}

${c.fraudChecks?.length ? `
<h2>Fraud link analysis</h2>
<table>
  <tr><th>URL</th><th>Verdict</th></tr>
  ${c.fraudChecks.map((f: any) => `<tr><td style="font-size:11px;word-break:break-all">${f.url}</td><td>${f.verdict}</td></tr>`).join("")}
</table>
` : ""}

<h2>Audit chain integrity</h2>
<div class="verdict-box">
  <div class="verdict-title">${audit.valid ? "✓ Audit chain verified — no tampering detected" : "✗ Tampering detected in audit chain"}</div>
  <div style="font-size:12px;margin-top:4px;color:#374151">${audit.events?.length ?? 0} events verified</div>
</div>
<table>
  <tr><th>Event</th><th>Timestamp</th><th>Hash (truncated)</th><th>Status</th></tr>
  ${auditRows}
</table>

<div class="footer">
  This report was generated automatically by DisputeResolve.<br/>
  The audit chain integrity above is cryptographically verifiable at
  ${process.env.NEXT_PUBLIC_APP_URL ?? "your-domain"}/audit/${c.id}
</div>

</body>
</html>`
}
