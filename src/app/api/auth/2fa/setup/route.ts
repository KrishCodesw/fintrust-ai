import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { prisma } from "@/lib/prisma"
import { generateTOTPSecret, generateQRCodeDataUrl } from "@/lib/totp"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// POST — generate a TOTP secret and QR code for the user to scan
export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id")
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, twoFactorEnabled: true } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.twoFactorEnabled) return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 })

    const secret = generateTOTPSecret(user.email)
    const qrCode = await generateQRCodeDataUrl(secret.otpauth_url!)

    // Store unconfirmed secret in Redis with 5-minute TTL
    // Only persisted to DB after user confirms with their first code
    await redis.setex(`totp:pending:${userId}`, 300, secret.base32)

    return NextResponse.json({
      qrCode,           // base64 PNG — render as <img src={qrCode} />
      manualKey: secret.base32, // for manual entry in authenticator apps
    })
  } catch (err) {
    console.error("[2fa/setup]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
