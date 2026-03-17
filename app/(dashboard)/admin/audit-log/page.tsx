import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AuditLogClient } from "@/components/audit/AuditLogClient"

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entityType?: string; action?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "Admin") redirect("/")

  const { page: pageParam, entityType, action } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
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

  const serialized = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    oldValues: l.oldValues as Record<string, unknown> | null,
    newValues: l.newValues as Record<string, unknown> | null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">All create, update, and delete actions across the platform.</p>
      </div>
      <AuditLogClient
        logs={serialized}
        total={total}
        page={page}
        limit={limit}
        entityTypeFilter={entityType ?? ""}
        actionFilter={action ?? ""}
      />
    </div>
  )
}
