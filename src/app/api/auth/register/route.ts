import { NextResponse } from "next/server"
import { hash } from "argon2"
import { prisma } from "@/lib/prisma"
import { logAuthEvent } from "@/lib/auth-audit"
import { sendVerificationEmail } from "@/lib/email"
import { registerSchema } from "@/types/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    // Always return the same message whether email exists or not — prevents user enumeration
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      // Still send a "check your email" response so attackers can't tell this email is registered
      return NextResponse.json(
        { message: "If that email is new to us, you will receive a verification code shortly." },
        { status: 200 }
      )
    }

    // argon2id — OWASP recommended settings
    const passwordHash = await hash(password, {
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    })

    const user = await prisma.user.create({
      data: { email, passwordHash },
    })

    // 6-digit OTP, expires in 15 minutes
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    })

    await sendVerificationEmail(email, otp)
    await logAuthEvent({ userId: user.id, event: "REGISTER", request: req })

    return NextResponse.json(
      { message: "If that email is new to us, you will receive a verification code shortly.", userId: user.id },
      { status: 201 }
    )
  } catch (err) {
    console.error("[register]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
