import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { appendAuditEvent } from "@/lib/case-audit"
import { sendSlaBreachAlert } from "@/lib/email"

// Vercel Cron calls this at 18:00 UTC (midnight IST) every day.
// It is secured by a CRON_SECRET header — set this in your Vercel env vars.

export async function GET(req: Request) {
  // Verify this is a legitimate Vercel cron call
  const cronSecret = req.headers.get("authorization")
  if (process.env.NODE_ENV === "production") {
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const now = new Date()

    // Find all active cases past their SLA deadline
    const breachedCases = await prisma.case.findMany({
      where: {
        slaDeadline: { lt: now },
        status: { notIn: ["RESOLVED", "CLOSED", "JUROR_REVIEW"] },
      },
      include: {
        user: { select: { email: true } },
      },
    })

    let escalated = 0
    let alerted   = 0

    for (const c of breachedCases) {
      // Auto-escalate to ESCALATED status
      await prisma.case.update({
        where: { id: c.id },
        data:  { status: "ESCALATED" },
      })

      await appendAuditEvent(
        c.id,
        "SLA_BREACHED_AUTO_ESCALATED",
        {
          slaDeadline:  c.slaDeadline,
          breachedAt:   now.toISOString(),
          previousStatus: c.status,
        },
        "SYSTEM_CRON"
      )

      // Send email alert to complainant
      if (c.user.email) {
        await sendSlaBreachAlert(c.user.email, c.id, c.assignedTo ?? "authority")
        alerted++
      }

      escalated++
    }

    // Find ESCALATED cases and move them to juror review
    const escalatedCases = await prisma.case.findMany({
      where: { status: "ESCALATED" },
    })

    let jurorAssigned = 0

    for (const c of escalatedCases) {
      // Get 3 random available jurors
      const jurors = await prisma.user.findMany({
        where: { role: "JUROR" },
        take: 10,
      })

      if (jurors.length < 1) continue

      // Shuffle and pick up to 3
      const shuffled = jurors.sort(() => Math.random() - 0.5).slice(0, Math.min(3, jurors.length))

      // Create juror review records + update case status
      await prisma.$transaction([
        prisma.case.update({
          where: { id: c.id },
          data:  { status: "JUROR_REVIEW" },
        }),
        ...shuffled.map(j =>
          prisma.jurorReview.create({
            data: { caseId: c.id, jurorId: j.id },
          })
        ),
      ])

      await appendAuditEvent(
        c.id,
        "JUROR_REVIEW_STARTED",
        {
          jurorCount: shuffled.length,
          jurorIds:   shuffled.map(j => j.id),
          timestamp:  now.toISOString(),
        },
        "SYSTEM_CRON"
      )

      jurorAssigned++
    }

    console.log(`[cron] SLA check: ${escalated} breached, ${jurorAssigned} sent to jurors, ${alerted} emails sent`)

    return NextResponse.json({
      ok: true,
      breached:      escalated,
      jurorAssigned,
      emailsSent:    alerted,
      checkedAt:     now.toISOString(),
    })
  } catch (err) {
    console.error("[cron/check-sla]", err)
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 })
  }
}
