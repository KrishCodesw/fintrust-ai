import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { appendAuditEvent } from "@/lib/case-audit"
import { submitVerdictSchema } from "@/types/case"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  try {
    const auth = await requireAuth(req, ["JUROR", "ADMIN"])
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const parsed = submitVerdictSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { verdict, reasoning } = parsed.data

    // Verify this juror is assigned to this case
    const review = await prisma.jurorReview.findFirst({
      where: { caseId: id, jurorId: auth.userId },
    })

    if (!review) {
      return NextResponse.json({ error: "You are not assigned to this case" }, { status: 403 })
    }

    if (review.verdict) {
      return NextResponse.json({ error: "You have already submitted a verdict" }, { status: 400 })
    }

    // Record this juror's verdict
    await prisma.jurorReview.update({
      where: { id: review.id },
      data: { verdict, reasoning, submittedAt: new Date() },
    })

    // Check if all jurors have submitted
    const allReviews = await prisma.jurorReview.findMany({
      where: { caseId: id },
    })

    const submitted = allReviews.filter(r => r.verdict)
    const total     = allReviews.length

    // Compute majority verdict when all jurors have submitted
    if (submitted.length === total && total > 0) {
      const counts: Record<string, number> = {}
      for (const r of submitted) {
        if (r.verdict) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1
      }
      const majorityVerdict = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]

      await prisma.case.update({
        where: { id },
        data: { status: "RESOLVED", closedAt: new Date() },
      })

      await appendAuditEvent(
        id,
        "JUROR_VERDICT_FINAL",
        {
          majorityVerdict,
          voteBreakdown: counts,
          totalJurors:   total,
          timestamp:     new Date().toISOString(),
        },
        "JUROR_SYSTEM"
      )

      return NextResponse.json({
        submitted: true,
        allSubmitted: true,
        majorityVerdict,
        message: "All verdicts received. Case resolved.",
      })
    }

    await appendAuditEvent(
      id,
      "JUROR_VERDICT_SUBMITTED",
      {
        jurorId:  auth.userId,
        verdict,
        timestamp: new Date().toISOString(),
      },
      auth.userId
    )

    return NextResponse.json({
      submitted:    true,
      allSubmitted: false,
      remaining:    total - submitted.length,
      message:      `Verdict recorded. Waiting for ${total - submitted.length} more juror(s).`,
    })
  } catch (err) {
    console.error("[POST /api/cases/:id/verdict]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
