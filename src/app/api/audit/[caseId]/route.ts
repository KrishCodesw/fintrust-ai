import { NextResponse } from "next/server"
import { verifyAuditChain } from "@/lib/case-audit"

type Params = { params: Promise<{ caseId: string }> }

// Public endpoint — anyone can verify a case's audit chain integrity
export async function GET(_req: Request, { params }: Params) {
  try {
    const { caseId } = await params
    const result = await verifyAuditChain(caseId)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[GET /api/audit/:caseId]", err)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
