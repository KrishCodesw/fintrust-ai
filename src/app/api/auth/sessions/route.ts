import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { logAuthEvent } from "@/lib/auth-audit"

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const sessions = await prisma.session.findMany({
      where: { userId: auth.userId, isRevoked: false, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { lastUsedAt: "desc" },
    })

    return NextResponse.json({ sessions })
  } catch (err) {
    console.error("[sessions GET]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    await prisma.session.updateMany({
      where: { userId: auth.userId, isRevoked: false },
      data: { isRevoked: true },
    })

    await logAuthEvent({
      userId: auth.userId,
      event: "SESSION_REVOKED",
      request: req,
      metadata: { all: true },
    })

    return NextResponse.json({ message: "All sessions revoked." })
  } catch (err) {
    console.error("[sessions DELETE]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
