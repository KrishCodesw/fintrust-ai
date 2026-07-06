import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { appendAuditEvent } from "@/lib/case-audit"
import { updateCaseSchema } from "@/types/case"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    const disputeCase = await prisma.case.findUnique({
      where: { id },
      include: {
        auditEvents: { orderBy: { createdAt: "asc" } },
        fraudChecks: true,
        jurorReviews: {
          include: { juror: { select: { id: true, email: true } } },
        },
        user: { select: { id: true, email: true } },
      },
    })

    if (!disputeCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    // Users can only see their own cases
    // Officers, jurors, admins can see all
    const isOwner = disputeCase.userId === auth.userId
    const isPrivileged = ["OFFICER_BANK", "OFFICER_NPCI", "OMBUDSMAN", "CYBERCRIME", "JUROR", "ADMIN", "AUDITOR"].includes(auth.role)

    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ case: disputeCase })
  } catch (err) {
    console.error("[GET /api/cases/:id]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const auth = await requireAuth(req, [
      "OFFICER_BANK", "OFFICER_NPCI", "OMBUDSMAN", "CYBERCRIME", "ADMIN",
    ])
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const parsed = updateCaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const existing = await prisma.case.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const updated = await prisma.case.update({
      where: { id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED"
          ? { closedAt: new Date() }
          : {}),
      },
    })

    await appendAuditEvent(
      id,
      "STATUS_UPDATED",
      {
        from: existing.status,
        to: updated.status,
        officerNote: parsed.data.officerNote ?? null,
        timestamp: new Date().toISOString(),
      },
      auth.userId
    )

    return NextResponse.json({ case: updated })
  } catch (err) {
    console.error("[PATCH /api/cases/:id]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
