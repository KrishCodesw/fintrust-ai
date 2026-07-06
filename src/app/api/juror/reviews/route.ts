import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req, ["JUROR", "ADMIN"])
    if (auth instanceof NextResponse) return auth

    const reviews = await prisma.jurorReview.findMany({
      where: { jurorId: auth.userId },
      include: {
        case: {
          select: {
            id:          true,
            disputeType: true,
            severity:    true,
            status:      true,
            amount:      true,
            description: true,
            aiSummary:   true,
            createdAt:   true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ reviews })
  } catch (err) {
    console.error("[GET /api/juror/reviews]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
