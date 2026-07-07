import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req, ["ADMIN"])
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") ?? ""

    const users = await prisma.user.findMany({
      where: search
        ? { email: { contains: search, mode: "insensitive" } }
        : {},
      select: {
        id:               true,
        email:            true,
        role:             true,
        emailVerified:    true,
        isLocked:         true,
        twoFactorEnabled: true,
        createdAt:        true,
        lastLoginAt:      true,
        _count: {
          select: { cases: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({ users })
  } catch (err) {
    console.error("[GET /api/admin/users]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
