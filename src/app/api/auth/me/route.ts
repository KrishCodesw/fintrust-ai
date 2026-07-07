import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id:               true,
        email:            true,
        role:             true,
        emailVerified:    true,
        twoFactorEnabled: true,
        isLocked:         true,
        createdAt:        true,
        lastLoginAt:      true,
        lastLoginIp:      true,
        _count: { select: { cases: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (err) {
    console.error("[GET /api/auth/me]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
