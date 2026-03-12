import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCircle, ShieldCheck, CalendarDays } from "lucide-react"

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user) return null

  const [totalUsers, activeNurses, pendingReview, openShifts] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.nurseProfile.count({ where: { status: "Active" } }),
    prisma.nurseProfile.count({ where: { status: "PendingReview" } }),
    prisma.shift.count({ where: { status: "Open" } }),
  ])

  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      description: "Active platform users",
    },
    {
      title: "Active Nurses",
      value: activeNurses,
      icon: UserCircle,
      description: "Currently active nurse profiles",
    },
    {
      title: "Pending Review",
      value: pendingReview,
      icon: ShieldCheck,
      description: "Nurse profiles awaiting review",
    },
    {
      title: "Open Shifts",
      value: openShifts,
      icon: CalendarDays,
      description: "Shifts needing assignment",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here&apos;s an overview of the platform.</p>
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
