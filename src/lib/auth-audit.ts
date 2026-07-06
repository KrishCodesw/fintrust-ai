import { prisma } from "@/lib/prisma"
import { getClientIp } from "@/lib/session"
import { AuthEvent } from "@prisma/client"

interface LogParams {
  userId?: string
  event: AuthEvent
  request: Request
  metadata?: Record<string, unknown>
}

export async function logAuthEvent({ userId, event, request, metadata }: LogParams) {
  await prisma.authAuditLog.create({
    data: {
      userId: userId ?? null,
      event,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: metadata ?? null,
    },
  })
}
