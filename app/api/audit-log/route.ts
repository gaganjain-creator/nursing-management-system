import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get("entityType")
  const action = searchParams.get("action")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = 50

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(action ? { action } : {}),
      },
      include: { user: { select: { email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(action ? { action } : {}),
      },
    }),
  ])

  return NextResponse.json({ logs, total, page, limit })
}
