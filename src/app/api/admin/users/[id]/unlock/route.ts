import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { logAuthEvent } from "@/lib/auth-audit"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const auth = await requireAuth(req, ["ADMIN"])
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    await prisma.user.update({
      where: { id },
      data: {
        isLocked:         false,
        lockedAt:         null,
        failedLoginCount: 0,
      },
    })

    await logAuthEvent({
      userId:   id,
      event:    "ACCOUNT_UNLOCKED",
      request:  req,
      metadata: { unlockedByAdmin: auth.userId },
    })

    return NextResponse.json({ message: "Account unlocked" })
  } catch (err) {
    console.error("[PATCH /api/admin/users/:id/unlock]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
