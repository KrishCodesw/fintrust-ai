import { NextResponse } from "next/server"
import { randomBytes, createHash } from "node:crypto"
import { hash } from "argon2"
import { prisma } from "@/lib/prisma"
import { resetLimiter } from "@/lib/ratelimit"
import { sendPasswordResetEmail } from "@/lib/email"
import { logAuthEvent } from "@/lib/auth-audit"
import { getClientIp } from "@/lib/session"
import { resetPasswordRequestSchema, resetPasswordSchema } from "@/types/auth"

// POST with { email } — request a reset link
// POST with { token, newPassword } — complete the reset

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { success: rateLimitOk } = await resetLimiter.limit(ip)
    if (!rateLimitOk) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
    }

    const body = await req.json()

    // ── Branch A: request reset ────────────────────────────
    if ("email" in body) {
      const parsed = resetPasswordRequestSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 })

      const { email } = parsed.data
      const user = await prisma.user.findUnique({ where: { email } })

      // Always return success — prevents email enumeration
      if (user) {
        const rawToken = randomBytes(32).toString("hex")
        const hashedToken = createHash("sha256").update(rawToken).digest("hex")

        await prisma.passwordReset.create({
          data: {
            userId: user.id,
            token: hashedToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          },
        })

        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}&uid=${user.id}`
        await sendPasswordResetEmail(email, resetLink)
        await logAuthEvent({ userId: user.id, event: "PASSWORD_RESET_REQUESTED", request: req })
      }

      return NextResponse.json({
        message: "If an account exists with that email, a reset link has been sent.",
      })
    }

    // ── Branch B: complete reset ───────────────────────────
    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { token, newPassword } = parsed.data
    const hashedToken = createHash("sha256").update(token).digest("hex")

    const record = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!record) {
      return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 400 })
    }

    const passwordHash = await hash(newPassword, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })

    await prisma.$transaction([
      prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash, failedLoginCount: 0, isLocked: false } }),
      // Revoke all existing sessions when password changes — security best practice
      prisma.session.updateMany({ where: { userId: record.userId }, data: { isRevoked: true } }),
    ])

    await logAuthEvent({ userId: record.userId, event: "PASSWORD_RESET_COMPLETED", request: req })

    return NextResponse.json({ message: "Password reset successfully. You can now log in." })
  } catch (err) {
    console.error("[reset-password]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
