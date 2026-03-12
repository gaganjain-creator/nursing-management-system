import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCircle, ShieldCheck, CalendarDays } from "lucide-react"

export default async function ManagementDashboardPage() {
  const session = await auth()
  if (!session?.user) return null

  const [totalNurses, compliantDocs, nonCompliantDocs, completedShifts] = await Promise.all([
    prisma.nurseProfile.count(),
    prisma.document.count({ where: { status: "Compliant" } }),
    prisma.document.count({ where: { status: { in: ["NonCompliant", "ExpiringSoon"] } } }),
    prisma.shift.count({ where: { status: "Completed" } }),
  ])

  const complianceRate =
    compliantDocs + nonCompliantDocs > 0
      ? Math.round((compliantDocs / (compliantDocs + nonCompliantDocs)) * 100)
      : 100

  const stats = [
    {
      title: "Total Nurse Profiles",
      value: totalNurses,
      icon: UserCircle,
      description: "Registered in the system",
    },
    {
      title: "Compliance Rate",
      value: `${complianceRate}%`,
      icon: ShieldCheck,
      description: "Documents in compliant status",
    },
    {
      title: "Docs Needing Action",
      value: nonCompliantDocs,
      icon: Users,
      description: "Non-compliant or expiring soon",
    },
    {
      title: "Completed Shifts",
      value: completedShifts,
      icon: CalendarDays,
      description: "All time completed shifts",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Management Dashboard</h1>
        <p className="text-muted-foreground">High-level overview of operational performance.</p>
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
    </div>
  )
}
