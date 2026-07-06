import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { generateJurorSummary } from "@/lib/ai"
import { aiLimiter } from "@/lib/ratelimit"
import { getClientIp } from "@/lib/session"
import { z } from "zod"

const schema = z.object({
  caseId:       z.string(),
  description:  z.string(),
  officerNotes: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req, ["JUROR", "ADMIN"])
    if (auth instanceof NextResponse) return auth

    const ip = getClientIp(req)
    const { success } = await aiLimiter.limit(`${auth.userId}:${ip}`)
    if (!success) {
      return NextResponse.json({ error: "Too many AI requests" }, { status: 429 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const summary = await generateJurorSummary(parsed.data.description, parsed.data.officerNotes)
    return NextResponse.json({ summary })
  } catch (err) {
    console.error("[POST /api/ai/juror-summary]", err)
    return NextResponse.json({ error: "AI summary failed" }, { status: 500 })
  }
}
