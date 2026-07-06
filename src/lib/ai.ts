import { GoogleGenerativeAI } from "@google/generative-ai"

function getClient() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY is not set")
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: "gemini-1.5-flash" })
}

export interface ClassificationResult {
  disputeType: "FAILED_TXN" | "UNAUTHORIZED_PAYMENT" | "REFUND_DELAY" | "MERCHANT_SCAM" | "PHISHING"
  severity: "LOW" | "MEDIUM" | "HIGH"
  summary: string
  routingSuggestion: "BANK" | "NPCI" | "RBI_OMBUDSMAN" | "CYBERCRIME" | "CONSUMER_FORUM"
}

export async function classifyCase(description: string, amount?: number): Promise<ClassificationResult> {
  const model = getClient()
  const prompt = `You are a financial dispute classifier for UPI and digital payments in India.
Analyze the following complaint and respond ONLY with a valid JSON object — no markdown, no explanation, no preamble.

Complaint: "${description}"
${amount ? `Amount involved: ₹${amount}` : ""}

Respond with exactly this JSON structure:
{
  "disputeType": one of ["FAILED_TXN", "UNAUTHORIZED_PAYMENT", "REFUND_DELAY", "MERCHANT_SCAM", "PHISHING"],
  "severity": one of ["LOW", "MEDIUM", "HIGH"],
  "summary": "2-3 sentence plain English summary of the dispute",
  "routingSuggestion": one of ["BANK", "NPCI", "RBI_OMBUDSMAN", "CYBERCRIME", "CONSUMER_FORUM"]
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  return JSON.parse(text) as ClassificationResult
}

export async function generateComplaintDraft(
  caseData: {
    disputeType: string
    amount?: number
    transactionId?: string
    upiId?: string
    description: string
    authority: string
  }
): Promise<string> {
  const model = getClient()
  const prompt = `Write a formal complaint letter for a digital payment dispute in India.
Authority: ${caseData.authority}
Dispute type: ${caseData.disputeType}
${caseData.transactionId ? `Transaction ID: ${caseData.transactionId}` : ""}
${caseData.upiId ? `UPI ID: ${caseData.upiId}` : ""}
${caseData.amount ? `Amount: ₹${caseData.amount}` : ""}
Issue: ${caseData.description}

Write a concise, professional complaint in plain text (no markdown). Include: subject line, salutation, body with facts, and a formal closing. Keep it under 300 words.`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

export async function generateJurorSummary(
  description: string,
  officerNotes?: string
): Promise<string> {
  const model = getClient()
  const prompt = `Summarize the following payment dispute for an independent reviewer. Present both sides objectively. Under 200 words. Plain text only.

User's complaint: "${description}"
${officerNotes ? `Authority's response: "${officerNotes}"` : "No authority response recorded yet."}`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}
