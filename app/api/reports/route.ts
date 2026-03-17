import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin" && session.user.role !== "Management") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const [
    totalNurses,
    nursesByStatus,
    nursesByType,
    docsByStatus,
    shiftsByStatus,
    requestsByStatus,
    recentAuditCount,
  ] = await Promise.all([
    prisma.nurseProfile.count(),
    prisma.nurseProfile.groupBy({ by: ["status"], _count: true }),
    prisma.nurseProfile.groupBy({ by: ["employmentType"], _count: true }),
    prisma.document.groupBy({ by: ["status"], _count: true }),
    prisma.shift.groupBy({ by: ["status"], _count: true }),
    prisma.shiftRequest.groupBy({ by: ["status"], _count: true }),
    prisma.auditLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ])

  return NextResponse.json({
    totalNurses,
    nursesByStatus,
    nursesByType,
    docsByStatus,
    shiftsByStatus,
    requestsByStatus,
    recentAuditCount,
  })
}
