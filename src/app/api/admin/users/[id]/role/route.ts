import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { z } from "zod"

const VALID_ROLES = [
  "USER",
  "OFFICER_BANK",
  "OFFICER_NPCI",
  "OMBUDSMAN",
  "CYBERCRIME",
  "JUROR",
  "ADMIN",
  "AUDITOR",
] as const

const schema = z.object({
  role: z.enum(VALID_ROLES),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const auth = await requireAuth(req, ["ADMIN"])
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body   = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Prevent admin from demoting themselves
    if (id === auth.userId && parsed.data.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data:  { role: parsed.data.role },
      select: { id: true, email: true, role: true },
    })

    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error("[PATCH /api/admin/users/:id/role]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
