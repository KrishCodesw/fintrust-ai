import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { verifyTOTP } from "@/lib/totp"
import { decrypt } from "@/lib/crypto"
import { logAuthEvent } from "@/lib/auth-audit"
import { z } from "zod"

const schema = z.object({
  totpCode: z.string().length(6, "Enter the 6-digit code"),
})

// Require a valid TOTP code to disable 2FA — prevents accidental/malicious disabling
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    })

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 })
    }

    const secret  = decrypt(user.twoFactorSecret)
    const isValid = verifyTOTP(secret, parsed.data.totpCode)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data:  { twoFactorEnabled: false, twoFactorSecret: null },
    })

    await logAuthEvent({ userId: auth.userId, event: "TWO_FACTOR_DISABLED", request: req })

    return NextResponse.json({ message: "Two-factor authentication disabled." })
  } catch (err) {
    console.error("[POST /api/auth/2fa/disable]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
