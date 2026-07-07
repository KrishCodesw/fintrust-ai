import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { verifyAuditChain } from "@/lib/case-audit"

type Params = { params: Promise<{ id: string }> }

// Returns JSON data used to render the PDF on the client side
// We use @react-pdf/renderer client-side to avoid serverless timeout issues
export async function GET(req: Request, { params }: Params) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        user:        { select: { email: true } },
        auditEvents: { orderBy: { createdAt: "asc" } },
        jurorReviews: {
          where: { verdict: { not: null } },
          select: { verdict: true, reasoning: true, submittedAt: true },
        },
        fraudChecks: { select: { url: true, verdict: true } },
      },
    })

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    // Only the complainant or privileged roles can get the report
    const isOwner      = caseData.userId === auth.userId
    const isPrivileged = ["OFFICER_BANK","OFFICER_NPCI","OMBUDSMAN","CYBERCRIME","JUROR","ADMIN","AUDITOR"].includes(auth.role)

    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Include audit chain verification result
    const auditResult = await verifyAuditChain(id)

    return NextResponse.json({
      case:        caseData,
      auditResult,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[GET /api/cases/:id/report]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
