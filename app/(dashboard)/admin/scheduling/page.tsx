import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SchedulingClient } from "@/components/scheduling/SchedulingClient"

export default async function AdminSchedulingPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "Admin") redirect("/")

  const [facilities, shiftTypes, nurses, shifts] = await Promise.all([
    prisma.facility.findMany({
      where: { isActive: true },
      include: { units: true },
      orderBy: { name: "asc" },
    }),
    prisma.shiftType.findMany({ orderBy: { name: "asc" } }),
    prisma.nurseProfile.findMany({
      where: { status: "Active" },
      select: { id: true, fullName: true, licenseNumber: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.shift.findMany({
      include: {
        unit: { include: { facility: true } },
        shiftType: true,
        assignments: { include: { nurse: { select: { fullName: true } } } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ])

  const units = facilities.flatMap((f: (typeof facilities)[number]) =>
    f.units.map((u: (typeof f.units)[number]) => ({ id: u.id, name: u.name, facility: { name: f.name } }))
  )

  const serializedShifts = shifts.map((s: (typeof shifts)[number]) => ({
    ...s,
    date: s.date.toISOString(),
    startTime: s.startTime.toISOString(),
    endTime: s.endTime.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scheduling</h1>
        <p className="text-muted-foreground">Create and manage shifts across all facilities.</p>
      </div>
      <SchedulingClient
        initialShifts={serializedShifts}
        units={units}
        shiftTypes={shiftTypes}
        nurses={nurses}
        canCreate
      />
    </div>
  )
}
