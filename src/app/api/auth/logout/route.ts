import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashToken, parseRefreshTokenFromCookies, clearRefreshCookie } from "@/lib/session"
import { logAuthEvent } from "@/lib/auth-audit"

export async function POST(req: Request) {
  try {
    const rawToken = parseRefreshTokenFromCookies(req.headers.get("cookie"))

    if (rawToken) {
      const hashedToken = hashToken(rawToken)
      const session = await prisma.session.findUnique({
        where: { refreshToken: hashedToken },
        select: { id: true, userId: true },
      })

      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { isRevoked: true },
        })
        await logAuthEvent({ userId: session.userId, event: "SESSION_REVOKED", request: req })
      }
    }

    return new NextResponse(JSON.stringify({ message: "Logged out" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearRefreshCookie(),
      },
    })
  } catch (err) {
    console.error("[logout]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
