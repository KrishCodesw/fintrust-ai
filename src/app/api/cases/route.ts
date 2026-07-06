import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { appendAuditEvent } from "@/lib/case-audit"
import { classifyCase } from "@/lib/ai"
import { routeCase } from "@/lib/routing"
import { checkUrl } from "@/lib/fraud"
import { createCaseSchema } from "@/types/case"

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const parsed = createCaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // ── Step A: Run fraud link check if a link was submitted ──
    let fraudCheckId: string | undefined
    if (data.fraudLink) {
      const fraudResult = await checkUrl(data.fraudLink)
      const fraudRecord = await prisma.fraudCheck.create({
        data: {
          url: data.fraudLink,
          verdict: fraudResult.verdict,
          sources: fraudResult.sources,
        },
      })
      fraudCheckId = fraudRecord.id
    }

    // ── Step B: AI classification ──────────────────────────
    let disputeType: "FAILED_TXN" | "UNAUTHORIZED_PAYMENT" | "REFUND_DELAY" | "MERCHANT_SCAM" | "PHISHING" = "FAILED_TXN"
    let severity: "LOW" | "MEDIUM" | "HIGH" = "LOW"
    let aiSummary = ""
    let draftComplaint = ""
    let routingSuggestion: "BANK" | "NPCI" | "RBI_OMBUDSMAN" | "CYBERCRIME" | "CONSUMER_FORUM" = "BANK"

    try {
      const classification = await classifyCase(data.description, data.amount)
      disputeType = classification.disputeType
      severity = classification.severity
      aiSummary = classification.summary
      routingSuggestion = classification.routingSuggestion
    } catch (aiErr) {
      // AI failure is non-fatal — case still gets filed with defaults
      console.error("[AI classify]", aiErr)
    }

    // ── Step C: Determine authority + SLA ─────────────────
    const { authority, slaDeadline } = routeCase(disputeType, severity)

    // ── Step D: Create the case ────────────────────────────
    const newCase = await prisma.case.create({
      data: {
        userId: auth.userId,
        transactionId: data.transactionId,
        upiId: data.upiId,
        amount: data.amount,
        bankName: data.bankName,
        appUsed: data.appUsed,
        description: data.description,
        disputeType,
        severity,
        status: "CLASSIFIED",
        assignedTo: authority,
        slaDeadline,
        aiSummary,
        evidenceUrls: data.evidenceUrls ?? [],
        // Connect fraud check if one was run
        ...(fraudCheckId
          ? { fraudChecks: { connect: { id: fraudCheckId } } }
          : {}),
      },
    })

    // ── Step E: Generate complaint draft async (non-blocking) ──
    // We fire this off and update the case — user doesn't wait for it
    generateDraftInBackground(newCase.id, {
      disputeType,
      amount: data.amount,
      transactionId: data.transactionId,
      upiId: data.upiId,
      description: data.description,
      authority,
    })

    // ── Step F: Write first audit event ───────────────────
    await appendAuditEvent(
      newCase.id,
      "CASE_FILED",
      {
        userId: auth.userId,
        disputeType,
        severity,
        assignedTo: authority,
        timestamp: new Date().toISOString(),
      },
      auth.userId
    )

    await appendAuditEvent(
      newCase.id,
      "AUTO_CLASSIFIED",
      {
        disputeType,
        severity,
        routingSuggestion,
        aiSummary,
        timestamp: new Date().toISOString(),
      },
      "AI_ENGINE"
    )

    return NextResponse.json(
      {
        caseId: newCase.id,
        disputeType,
        severity,
        assignedTo: authority,
        slaDeadline,
        message: "Case filed and classified successfully.",
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[POST /api/cases]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

// GET — list cases for the logged-in user
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = 10
    const skip = (page - 1) * limit

    const where = {
      userId: auth.userId,
      ...(status ? { status: status as any } : {}),
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          disputeType: true,
          severity: true,
          status: true,
          assignedTo: true,
          amount: true,
          description: true,
          slaDeadline: true,
          createdAt: true,
        },
      }),
      prisma.case.count({ where }),
    ])

    return NextResponse.json({
      cases,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error("[GET /api/cases]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

// Fire-and-forget — generate AI draft after case is created
async function generateDraftInBackground(
  caseId: string,
  data: {
    disputeType: string
    amount?: number
    transactionId?: string
    upiId?: string
    description: string
    authority: string
  }
) {
  try {
    const { generateComplaintDraft } = await import("@/lib/ai")
    const draft = await generateComplaintDraft(data)
    await prisma.case.update({
      where: { id: caseId },
      data: { draftComplaint: draft },
    })
  } catch (err) {
    console.error("[draft background]", err)
  }
}
