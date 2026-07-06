import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { checkUrl } from "@/lib/fraud"
import { fraudLimiter } from "@/lib/ratelimit"
import { getClientIp } from "@/lib/session"
import { z } from "zod"

const schema = z.object({
  url: z.string().url("Enter a valid URL"),
})

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const ip = getClientIp(req)
    const { success } = await fraudLimiter.limit(`${auth.userId}:${ip}`)
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    const result = await checkUrl(parsed.data.url)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[POST /api/fraud/check-link]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
