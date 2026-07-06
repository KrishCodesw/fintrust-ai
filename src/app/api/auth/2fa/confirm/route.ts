import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { verifyTOTP } from "@/lib/totp"
import { encrypt } from "@/lib/crypto"
import { logAuthEvent } from "@/lib/auth-audit"
import { z } from "zod"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const schema = z.object({ totpCode: z.string().length(6, "Enter the 6-digit code") })

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

    const { totpCode } = parsed.data
    const pendingSecret = await redis.get<string>(`totp:pending:${auth.userId}`)
    if (!pendingSecret) {
      return NextResponse.json(
        { error: "Setup session expired. Please restart 2FA setup." },
        { status: 400 }
      )
    }

    const isValid = verifyTOTP(pendingSecret, totpCode)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid code. Check your device's time is correct." },
        { status: 400 }
      )
    }

    const encryptedSecret = encrypt(pendingSecret)

    await prisma.user.update({
      where: { id: auth.userId },
      data: { twoFactorEnabled: true, twoFactorSecret: encryptedSecret },
    })

    await redis.del(`totp:pending:${auth.userId}`)
    await logAuthEvent({ userId: auth.userId, event: "TWO_FACTOR_ENABLED", request: req })

    return NextResponse.json({ message: "Two-factor authentication enabled." })
  } catch (err) {
    console.error("[2fa/confirm]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
