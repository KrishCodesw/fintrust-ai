import { NextResponse } from "next/server"
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/jwt"

/**
 * Call at the top of any protected API route handler.
 * Returns the verified payload or a NextResponse 401/403 to return immediately.
 *
 * Usage:
 *   const auth = await requireAuth(req)
 *   if (auth instanceof NextResponse) return auth
 *   const { userId, role } = auth
 */
export async function requireAuth(
  req: Request,
  allowedRoles?: string[]
): Promise<AccessTokenPayload | NextResponse> {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: "Unauthorized", code: "NO_TOKEN" }, { status: 401 })
  }

  try {
    const payload = await verifyAccessToken(token)

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { error: "Forbidden — insufficient role", code: "INSUFFICIENT_ROLE" },
        { status: 403 }
      )
    }

    return payload
  } catch {
    return NextResponse.json({ error: "Token expired", code: "JWT_EXPIRED" }, { status: 401 })
  }
}
