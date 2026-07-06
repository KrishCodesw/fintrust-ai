import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const [
      totalCases,
      resolvedCases,
      byStatus,
      byType,
      bySeverity,
      byAuthority,
      recentCases,
    ] = await Promise.all([
      prisma.case.count(),
      prisma.case.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
      prisma.case.groupBy({ by: ["status"],  _count: { id: true } }),
      prisma.case.groupBy({ by: ["disputeType"], _count: { id: true } }),
      prisma.case.groupBy({ by: ["severity"],    _count: { id: true } }),
      prisma.case.groupBy({ by: ["assignedTo"],  _count: { id: true } }),
      // Last 30 days case volume (for line chart)
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT
          DATE("createdAt") as date,
          COUNT(id) as count
        FROM "Case"
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
    ])

    // Avg resolution time in days
    const resolvedWithTime = await prisma.case.findMany({
      where: { status: { in: ["RESOLVED", "CLOSED"] }, closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    })

    const avgResolutionDays = resolvedWithTime.length
      ? resolvedWithTime.reduce((acc, c) => {
          const diff = (c.closedAt!.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          return acc + diff
        }, 0) / resolvedWithTime.length
      : 0

    // SLA breach count
    const slaBreached = await prisma.case.count({
      where: {
        slaDeadline: { lt: new Date() },
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    })

    // Department effectiveness score per authority
    // Score = (resolved/total * 0.6) + ((1 - sla_breach/total) * 0.4) * 100
    const authorityScores = await Promise.all(
      byAuthority
        .filter(a => a.assignedTo)
        .map(async a => {
          const auth = a.assignedTo!
          const total = a._count.id
          const resolved = await prisma.case.count({
            where: { assignedTo: auth, status: { in: ["RESOLVED", "CLOSED"] } },
          })
          const breached = await prisma.case.count({
            where: { assignedTo: auth, slaDeadline: { lt: new Date() }, status: { notIn: ["RESOLVED", "CLOSED"] } },
          })
          const score = ((resolved / total) * 0.6 + (1 - Math.min(breached / total, 1)) * 0.4) * 100
          return {
            authority:    auth.replace(/_/g, " "),
            total,
            resolved,
            breached,
            score:        Math.round(score),
          }
        })
    )

    return NextResponse.json({
      summary: {
        total:           totalCases,
        resolved:        resolvedCases,
        resolutionRate:  totalCases ? Math.round((resolvedCases / totalCases) * 100) : 0,
        avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
        slaBreached,
      },
      byStatus:    byStatus.map(s => ({ name: s.status.replace(/_/g, " "),  value: s._count.id })),
      byType:      byType.map(t =>   ({ name: t.disputeType.replace(/_/g, " "), value: t._count.id })),
      bySeverity:  bySeverity.map(s => ({ name: s.severity, value: s._count.id })),
      authorityScores,
      dailyVolume: recentCases.map(r => ({ date: r.date, count: Number(r.count) })),
    })
  } catch (err) {
    console.error("[GET /api/dashboard/metrics]", err)
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 })
  }
}
