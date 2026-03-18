import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AvailabilityCalendar } from "@/components/availability/AvailabilityCalendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function NurseAvailabilityPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "Nurse") redirect("/")

  const profile = await prisma.nurseProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My Availability</h1>
        <p className="text-muted-foreground">No nurse profile found. Contact your administrator.</p>
      </div>
    )
  }

  // Load the next 3 months of availability
  const from = new Date()
  from.setDate(1)
  const to = new Date(from)
  to.setMonth(to.getMonth() + 3)

  const records = await prisma.nurseAvailability.findMany({
    where: {
      nurseId: profile.id,
      date: { gte: from, lte: to },
    },
    select: { date: true, isAvailable: true },
    orderBy: { date: "asc" },
  })

  const serialized = records.map((r: (typeof records)[number]) => ({
    date: r.date.toISOString(),
    isAvailable: r.isAvailable,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Availability</h1>
        <p className="text-muted-foreground">
          Click any future date to toggle your availability. Dates default to available.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Availability Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityCalendar initialRecords={serialized} />
        </CardContent>
      </Card>
    </div>
  )
}
