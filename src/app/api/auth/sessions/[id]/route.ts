import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { logAuthEvent } from "@/lib/auth-audit"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(req: Request, { params }: Params) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const { id: sessionId } = await params

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true },
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Users can only revoke their own sessions
    if (session.userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.session.update({
      where: { id: sessionId },
      data:  { isRevoked: true },
    })

    await logAuthEvent({
      userId:   auth.userId,
      event:    "SESSION_REVOKED",
      request:  req,
      metadata: { sessionId },
    })

    return NextResponse.json({ message: "Session revoked" })
  } catch (err) {
    console.error("[DELETE /api/auth/sessions/:id]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
