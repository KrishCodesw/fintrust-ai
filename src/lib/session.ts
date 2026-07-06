import { randomBytes, createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { signAccessToken } from "@/lib/jwt"

const REFRESH_TOKEN_EXPIRY_DAYS = 7

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export function buildRefreshCookie(rawToken: string): string {
  const maxAge = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60
  return [
    `refresh_token=${rawToken}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
    "Path=/api/auth", // cookie is only sent to /api/auth routes
  ].join("; ")
}

export function clearRefreshCookie(): string {
  return "refresh_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/api/auth"
}

export async function createSession(
  userId: string,
  request: Request
): Promise<{ rawRefreshToken: string; cookie: string }> {
  const rawRefreshToken = randomBytes(32).toString("hex")
  const hashedToken = hashToken(rawRefreshToken)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      userId,
      refreshToken: hashedToken,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: getClientIp(request),
      expiresAt,
    },
  })

  return { rawRefreshToken, cookie: buildRefreshCookie(rawRefreshToken) }
}

export async function rotateSession(sessionId: string, userId: string, role: string, request: Request) {
  const rawRefreshToken = randomBytes(32).toString("hex")
  const hashedToken = hashToken(rawRefreshToken)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      refreshToken: hashedToken,
      expiresAt,
      lastUsedAt: new Date(),
      ipAddress: getClientIp(request),
    },
  })

  const accessToken = await signAccessToken({ userId, role, sessionId })
  return { accessToken, cookie: buildRefreshCookie(rawRefreshToken) }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

export function parseRefreshTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]+)/)
  return match ? match[1] : null
}
