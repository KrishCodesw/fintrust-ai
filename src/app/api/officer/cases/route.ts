import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

const ROLE_TO_AUTHORITY: Record<string, string> = {
  OFFICER_BANK:  "BANK",
  OFFICER_NPCI:  "NPCI",
  OMBUDSMAN:     "RBI_OMBUDSMAN",
  CYBERCRIME:    "CYBERCRIME",
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req, [
      "OFFICER_BANK", "OFFICER_NPCI", "OMBUDSMAN", "CYBERCRIME", "ADMIN",
    ])
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const statusFilter    = searchParams.get("status")
    const authorityFilter = searchParams.get("authority")

    // Officers see only their authority's cases; admins can filter freely
    const authority = auth.role === "ADMIN"
      ? authorityFilter || undefined
      : ROLE_TO_AUTHORITY[auth.role]

    const cases = await prisma.case.findMany({
      where: {
        ...(authority ? { assignedTo: authority as any } : {}),
        ...(statusFilter ? { status: statusFilter as any } : {}),
      },
      orderBy: [
        { slaDeadline: "asc" },   // Most urgent first
        { createdAt:   "desc" },
      ],
      select: {
        id:           true,
        disputeType:  true,
        severity:     true,
        status:       true,
        assignedTo:   true,
        amount:       true,
        description:  true,
        slaDeadline:  true,
        createdAt:    true,
      },
    })

    return NextResponse.json({ cases })
  } catch (err) {
    console.error("[GET /api/officer/cases]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
