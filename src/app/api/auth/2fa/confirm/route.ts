import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { prisma } from "@/lib/prisma"
import { verifyTOTP } from "@/lib/totp"
import { encrypt } from "@/lib/crypto"
import { logAuthEvent } from "@/lib/auth-audit"
import { z } from "zod"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const schema = z.object({ totpCode: z.string().length(6, "Enter the 6-digit code") })

// POST — user scans QR, enters first code to confirm setup
export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id")
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

    const { totpCode } = parsed.data

    // Retrieve pending secret from Redis
    const pendingSecret = await redis.get<string>(`totp:pending:${userId}`)
    if (!pendingSecret) {
      return NextResponse.json(
        { error: "Setup session expired. Please start the 2FA setup again." },
        { status: 400 }
      )
    }

    const isValid = verifyTOTP(pendingSecret, totpCode)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid code. Make sure your device time is correct." }, { status: 400 })
    }

    // Encrypt secret before storing in DB
    const encryptedSecret = encrypt(pendingSecret)

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorSecret: encryptedSecret },
    })

    // Clean up Redis
    await redis.del(`totp:pending:${userId}`)

    await logAuthEvent({ userId, event: "TWO_FACTOR_ENABLED", request: req })

    return NextResponse.json({ message: "Two-factor authentication enabled successfully." })
  } catch (err) {
    console.error("[2fa/confirm]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
