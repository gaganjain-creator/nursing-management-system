import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ManagementReportsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "Admin" && session.user.role !== "Management") redirect("/")

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

  const compliantDocs = docsByStatus.find((d: (typeof docsByStatus)[number]) => d.status === "Compliant")?._count ?? 0
  const nonCompliantDocs = docsByStatus.filter((d: (typeof docsByStatus)[number]) => d.status !== "Compliant").reduce((s, d: (typeof docsByStatus)[number]) => s + d._count, 0)
  const complianceRate =
    compliantDocs + nonCompliantDocs > 0
      ? Math.round((compliantDocs / (compliantDocs + nonCompliantDocs)) * 100)
      : 100

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Platform-wide summary and analytics.</p>
      </div>

      {/* Nurse Overview */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Nurse Workforce</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Nurses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalNurses}</p>
            </CardContent>
          </Card>
          {nursesByStatus.map((s: (typeof nursesByStatus)[number]) => (
            <Card key={s.status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.status}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{s._count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {nursesByType.map((t: (typeof nursesByType)[number]) => (
            <Card key={t.employmentType}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.employmentType}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{t._count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Document Compliance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{complianceRate}%</p>
            </CardContent>
          </Card>
          {docsByStatus.map((d: (typeof docsByStatus)[number]) => (
            <Card key={d.status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{d.status}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{d._count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Shifts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Shifts</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shiftsByStatus.map((s: (typeof shiftsByStatus)[number]) => (
            <Card key={s.status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.status}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{s._count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Requests */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Shift Requests</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {requestsByStatus.map((r: (typeof requestsByStatus)[number]) => (
            <Card key={r.status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{r.status}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{r._count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Activity */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Platform Activity</h2>
        <Card className="max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Audit Events (Last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recentAuditCount}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
