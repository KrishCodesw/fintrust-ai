import { NextResponse } from "next/server"
import { verify, hash } from "argon2"
import { prisma } from "@/lib/prisma"
import { logAuthEvent } from "@/lib/auth-audit"
import { sendSuspiciousLoginAlert } from "@/lib/email"
import { signAccessToken } from "@/lib/jwt"
import { createSession, getClientIp } from "@/lib/session"
import { loginLimiter } from "@/lib/ratelimit"
import { decrypt } from "@/lib/crypto"
import { verifyTOTP } from "@/lib/totp"
import { loginSchema } from "@/types/auth"

// A real argon2id hash of a dummy password — used when the email doesn't exist
// to make response timing identical whether email exists or not.
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$dGVzdHBhc3N3b3JkdGVzdHBhc3N3b3Jk"

const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MINUTES = 30

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)

    // Rate limit by IP
    const { success: rateLimitOk } = await loginLimiter.limit(ip)
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait 15 minutes.", code: "RATE_LIMITED" },
        { status: 429 }
      )
    }

    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { email, password, totpCode } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })

    // Always hash — prevents timing-based email enumeration
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH
    const isValidPassword = await verify(hashToCheck, password)

    if (!user || !isValidPassword) {
      if (user) {
        const newCount = user.failedLoginCount + 1
        const shouldLock = newCount >= MAX_FAILED_ATTEMPTS

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: newCount,
            isLocked: shouldLock,
            lockedAt: shouldLock ? new Date() : undefined,
          },
        })

        await logAuthEvent({
          userId: user.id,
          event: shouldLock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
          request: req,
          metadata: { attempt: newCount },
        })

        if (shouldLock) {
          return NextResponse.json(
            {
              error: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Check your email.`,
              code: "ACCOUNT_LOCKED",
            },
            { status: 403 }
          )
        }
      }

      // Same error for wrong email and wrong password — no enumeration
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check if account is locked
    if (user.isLocked) {
      // Auto-unlock after LOCK_DURATION_MINUTES
      const lockExpiry = new Date((user.lockedAt?.getTime() ?? 0) + LOCK_DURATION_MINUTES * 60 * 1000)
      if (new Date() < lockExpiry) {
        return NextResponse.json(
          { error: "Account is locked. Try again later or reset your password.", code: "ACCOUNT_LOCKED" },
          { status: 403 }
        )
      }
      // Unlock
      await prisma.user.update({
        where: { id: user.id },
        data: { isLocked: false, lockedAt: null, failedLoginCount: 0 },
      })
      await logAuthEvent({ userId: user.id, event: "ACCOUNT_UNLOCKED", request: req })
    }

    // Check email verification
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email before logging in.", code: "EMAIL_UNVERIFIED", userId: user.id },
        { status: 403 }
      )
    }

    // 2FA check — if enabled, require TOTP code
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return NextResponse.json({ code: "TOTP_REQUIRED" }, { status: 200 })
      }
      if (!user.twoFactorSecret) {
        return NextResponse.json({ error: "2FA configuration error" }, { status: 500 })
      }
      const decryptedSecret = decrypt(user.twoFactorSecret)
      const isValidTotp = verifyTOTP(decryptedSecret, totpCode)
      if (!isValidTotp) {
        return NextResponse.json({ error: "Invalid authenticator code", code: "INVALID_TOTP" }, { status: 401 })
      }
    }

    // Detect login from a new IP
    if (user.lastLoginIp && user.lastLoginIp !== ip) {
      sendSuspiciousLoginAlert(user.email, ip).catch(console.error) // fire and forget
      await logAuthEvent({ userId: user.id, event: "SUSPICIOUS_LOGIN", request: req, metadata: { ip } })
    }

    // Reset failed attempts, update last login info
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    })

    // Create session + issue tokens
    const { rawRefreshToken, cookie } = await createSession(user.id, req)

    // We need the session ID for the JWT payload — look up by the hashed token
    const { hashToken } = await import("@/lib/session")
    const session = await prisma.session.findUnique({
      where: { refreshToken: hashToken(rawRefreshToken) },
    })

    const accessToken = await signAccessToken({
      userId: user.id,
      role: user.role,
      sessionId: session!.id,
    })

    await logAuthEvent({ userId: user.id, event: "LOGIN_SUCCESS", request: req })

    const response = new NextResponse(
      JSON.stringify({
        accessToken,
        user: { id: user.id, email: user.email, role: user.role },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    response.headers.append("Set-Cookie", cookie)

    // 3. Attach the JWT access token as a second cookie so middleware can read it
    // Note: Adjust Max-Age to match your JWT expiration time (e.g., 3600 = 1 hour)
    response.headers.append(
      "Set-Cookie", 
      `access_token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
    )

    return response
  } catch (err) {
    console.error("[login]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
