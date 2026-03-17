import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { RequestsTableServer } from "@/components/requests/RequestsTableServer"

export default async function SupervisorRequestsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "Supervisor" && session.user.role !== "Admin") redirect("/")

  const requests = await prisma.shiftRequest.findMany({
    include: {
      nurse: { select: { fullName: true } },
      shift: { include: { shiftType: true, unit: true } },
      reviewedBy: { select: { email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })

  const serialized = requests.map((r) => ({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shift Requests</h1>
        <p className="text-muted-foreground">Review and respond to nurse shift requests.</p>
      </div>
      <RequestsTableServer requests={serialized} canReview />
    </div>
  )
}
