import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAuthEvent } from "@/lib/auth-audit"

// GET — list all active sessions for the logged-in user
export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id")
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sessions = await prisma.session.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastUsedAt: true },
      orderBy: { lastUsedAt: "desc" },
    })

    return NextResponse.json({ sessions })
  } catch (err) {
    console.error("[sessions GET]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

// DELETE — revoke all sessions (log out of all devices)
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get("x-user-id")
    const sessionId = req.headers.get("x-session-id") // current session to keep (optional)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    })

    await logAuthEvent({ userId, event: "SESSION_REVOKED", request: req, metadata: { all: true } })

    return NextResponse.json({ message: "All sessions revoked." })
  } catch (err) {
    console.error("[sessions DELETE]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
