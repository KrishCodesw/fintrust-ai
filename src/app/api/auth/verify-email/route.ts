import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logAuthEvent } from "@/lib/auth-audit"
import { verifyEmailSchema } from "@/types/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = verifyEmailSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { userId, otp } = parsed.data

    const record = await prisma.emailVerification.findFirst({
      where: {
        userId,
        token: otp,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired code. Request a new one." },
        { status: 400 }
      )
    }

    // Mark OTP as used and verify the user in one transaction
    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      }),
    ])

    await logAuthEvent({ userId, event: "EMAIL_VERIFIED", request: req })

    return NextResponse.json({ message: "Email verified. You can now log in." })
  } catch (err) {
    console.error("[verify-email]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
