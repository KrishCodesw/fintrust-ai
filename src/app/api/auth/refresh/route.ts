import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rotateSession, hashToken, parseRefreshTokenFromCookies, getClientIp } from "@/lib/session"
import { refreshLimiter } from "@/lib/ratelimit"

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { success: rateLimitOk } = await refreshLimiter.limit(ip)
    if (!rateLimitOk) {
      return NextResponse.json({ error: "Too many refresh attempts", code: "RATE_LIMITED" }, { status: 429 })
    }

    const rawToken = parseRefreshTokenFromCookies(req.headers.get("cookie"))
    if (!rawToken) {
      return NextResponse.json({ error: "No refresh token", code: "NO_REFRESH_TOKEN" }, { status: 401 })
    }

    const hashedToken = hashToken(rawToken)

    const session = await prisma.session.findUnique({
      where: { refreshToken: hashedToken },
      include: { user: { select: { id: true, role: true, isLocked: true, emailVerified: true } } },
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found", code: "INVALID_SESSION" }, { status: 401 })
    }

    if (session.isRevoked) {
      return NextResponse.json({ error: "Session revoked", code: "SESSION_REVOKED" }, { status: 401 })
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session expired", code: "SESSION_EXPIRED" }, { status: 401 })
    }

    if (session.user.isLocked) {
      return NextResponse.json({ error: "Account locked", code: "ACCOUNT_LOCKED" }, { status: 403 })
    }

    // Rotate — invalidates old token, issues new one
    const { accessToken, cookie } = await rotateSession(
      session.id,
      session.user.id,
      session.user.role,
      req
    )

    return new NextResponse(
      JSON.stringify({ accessToken }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      }
    )
  } catch (err) {
    console.error("[refresh]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
