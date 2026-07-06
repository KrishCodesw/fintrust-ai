import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { generateTOTPSecret, generateQRCodeDataUrl } from "@/lib/totp"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true, twoFactorEnabled: true },
    })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 })
    }

    const secret = generateTOTPSecret(user.email)
    const qrCode = await generateQRCodeDataUrl(secret.otpauth_url!)

    // Store unconfirmed secret in Redis, 5-minute TTL
    await redis.setex(`totp:pending:${auth.userId}`, 300, secret.base32)

    return NextResponse.json({ qrCode, manualKey: secret.base32 })
  } catch (err) {
    console.error("[2fa/setup]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
