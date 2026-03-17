import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCircle, ShieldCheck, CalendarDays, FileText } from "lucide-react"
import { ComplianceWidget } from "@/components/compliance/ComplianceWidget"

export default async function SupervisorDashboardPage() {
  const session = await auth()
  if (!session?.user) return null

  const [activeNurses, nonCompliant, openShifts, pendingRequests] = await Promise.all([
    prisma.nurseProfile.count({ where: { status: "Active" } }),
    prisma.document.count({ where: { status: "NonCompliant" } }),
    prisma.shift.count({ where: { status: "Open" } }),
    prisma.shiftRequest.count({ where: { status: "Pending" } }),
  ])

  const stats = [
    {
      title: "Active Nurses",
      value: activeNurses,
      icon: UserCircle,
      description: "Nurses under supervision",
    },
    {
      title: "Non-Compliant Docs",
      value: nonCompliant,
      icon: ShieldCheck,
      description: "Documents requiring attention",
    },
    {
      title: "Open Shifts",
      value: openShifts,
      icon: CalendarDays,
      description: "Shifts needing assignment",
    },
    {
      title: "Pending Requests",
      value: pendingRequests,
      icon: FileText,
      description: "Shift requests awaiting review",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supervisor Dashboard</h1>
        <p className="text-muted-foreground">Overview of team status and scheduling.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ComplianceWidget compliancePath="/supervisor/compliance" />
    </div>
  )
}
