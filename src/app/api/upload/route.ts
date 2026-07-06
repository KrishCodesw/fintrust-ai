import { NextResponse } from "next/server"
import { createHmac } from "node:crypto"
import { requireAuth } from "@/lib/auth-helpers"

// Returns a signed upload URL — client uploads directly to Cloudinary.
// Your server never touches the file bytes.

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 })
    }

    const timestamp = Math.round(Date.now() / 1000)
    const folder = `dispute-resolve/${auth.userId}`

    // Build the string to sign
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = createHmac("sha256", apiSecret)
      .update(`folder=${folder}&timestamp=${timestamp}`)
      .digest("hex")

    // Actually use SHA1 for Cloudinary (their requirement)
    const { createHash } = await import("node:crypto")
    const sha1Signature = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex")

    return NextResponse.json({
      signature: sha1Signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    })
  } catch (err) {
    console.error("[POST /api/upload]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
