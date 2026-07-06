import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"

export function hashEvent(prevHash: string, eventType: string, data: object): string {
  const payload = prevHash + eventType + JSON.stringify(data)
  return createHash("sha256").update(payload).digest("hex")
}

export async function appendAuditEvent(
  caseId: string,
  eventType: string,
  data: object,
  actorId?: string
) {
  // Get the last event's hash for this case
  const lastEvent = await prisma.auditEvent.findFirst({
    where: { caseId },
    orderBy: { createdAt: "desc" },
    select: { hash: true },
  })

  const prevHash = lastEvent?.hash ?? "GENESIS"
  const hash = hashEvent(prevHash, eventType, data)

  return prisma.auditEvent.create({
    data: {
      caseId,
      eventType,
      data,
      hash,
      prevHash,
      actorId: actorId ?? null,
    },
  })
}

export async function verifyAuditChain(caseId: string): Promise<{
  valid: boolean
  events: Array<{ id: string; eventType: string; hash: string; valid: boolean; createdAt: Date }>
}> {
  const events = await prisma.auditEvent.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  })

  const results = events.map((event, index) => {
    const prevHash = index === 0 ? "GENESIS" : events[index - 1].hash
    const computedHash = hashEvent(prevHash, event.eventType, event.data as object)
    return {
      id: event.id,
      eventType: event.eventType,
      hash: event.hash,
      valid: computedHash === event.hash,
      createdAt: event.createdAt,
    }
  })

  return {
    valid: results.every((r) => r.valid),
    events: results,
  }
}
