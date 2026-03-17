import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export default async function NurseShiftsPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">My Shifts</h1>
        <p className="text-muted-foreground">No nurse profile found. Contact your administrator.</p>
      </div>
    )
  }

  const assignments = await prisma.shiftAssignment.findMany({
    where: { nurseId: profile.id },
    include: {
      shift: {
        include: {
          unit: { include: { facility: true } },
          shiftType: true,
        },
      },
    },
    orderBy: { shift: { date: "asc" } },
  })

  const statusVariant = {
    Open: "warning",
    Assigned: "success",
    Completed: "secondary",
    Cancelled: "destructive",
  } as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Shifts</h1>
        <p className="text-muted-foreground">All shifts assigned to you.</p>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          No shifts assigned yet.
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Facility / Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{formatDate(a.shift.date)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTime(a.shift.startTime)} – {formatTime(a.shift.endTime)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{a.shift.unit.facility.name}</span>
                    <span className="text-muted-foreground"> / {a.shift.unit.name}</span>
                  </TableCell>
                  <TableCell>{a.shift.shiftType.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[a.shift.status]}>{a.shift.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
