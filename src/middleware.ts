import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/jwt"

// Routes that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/reset-password",
  "/public-dashboard",
  "/api/auth",
  "/api/audit",     // public hash verification
  "/api/dashboard", // public metrics
  "/api/cron",      // Vercel cron — secured by CRON_SECRET header
]

// Role-based route access
const ROLE_GUARDS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/officer",           roles: ["OFFICER_BANK", "OFFICER_NPCI", "OMBUDSMAN", "CYBERCRIME", "ADMIN"] },
  { prefix: "/juror",             roles: ["JUROR", "ADMIN"] },
  { prefix: "/admin",             roles: ["ADMIN"] },
  { prefix: "/api/cases",         roles: ["USER", "OFFICER_BANK", "OFFICER_NPCI", "OMBUDSMAN", "CYBERCRIME", "JUROR", "ADMIN"] },
  { prefix: "/api/ai",            roles: ["USER", "OFFICER_BANK", "OFFICER_NPCI", "OMBUDSMAN", "CYBERCRIME", "ADMIN"] },
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized", code: "NO_TOKEN" }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  try {
    const payload = await verifyAccessToken(token)

    // Check role-based access
    for (const guard of ROLE_GUARDS) {
      if (pathname.startsWith(guard.prefix) && !guard.roles.includes(payload.role)) {
        return NextResponse.json({ error: "Forbidden", code: "INSUFFICIENT_ROLE" }, { status: 403 })
      }
    }

    // Forward verified identity to route handlers
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-user-id", payload.userId)
    requestHeaders.set("x-user-role", payload.role)
    requestHeaders.set("x-session-id", payload.sessionId)

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Token expired", code: "JWT_EXPIRED" }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)"],
}
