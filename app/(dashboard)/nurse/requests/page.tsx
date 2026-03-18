import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NurseRequestsClient } from "@/components/requests/NurseRequestsClient"

export default async function NurseRequestsPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
        <p className="text-muted-foreground">No nurse profile found. Contact your administrator.</p>
      </div>
    )
  }

  const [requests, assignments] = await Promise.all([
    prisma.shiftRequest.findMany({
      where: { nurseId: profile.id },
      include: {
        shift: { include: { shiftType: true, unit: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shiftAssignment.findMany({
      where: { nurseId: profile.id, shift: { status: { in: ["Open", "Assigned"] } } },
      include: { shift: { include: { shiftType: true, unit: true } } },
    }),
  ])

  const serializedRequests = requests.map((r: (typeof requests)[number]) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    requestedDate: r.requestedDate?.toISOString() ?? null,
    shift: r.shift
      ? {
          ...r.shift,
          date: r.shift.date.toISOString(),
          startTime: r.shift.startTime.toISOString(),
          endTime: r.shift.endTime.toISOString(),
          createdAt: r.shift.createdAt.toISOString(),
          updatedAt: r.shift.updatedAt.toISOString(),
        }
      : null,
  }))

  const shiftOptions = assignments.map((a: (typeof assignments)[number]) => ({
    id: a.shiftId,
    date: a.shift.date.toISOString(),
    shiftType: { name: a.shift.shiftType.name },
    unit: { name: a.shift.unit.name },
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
        <p className="text-muted-foreground">Submit and track your shift requests.</p>
      </div>
      <NurseRequestsClient requests={serializedRequests} shifts={shiftOptions} />
    </div>
  )
}
