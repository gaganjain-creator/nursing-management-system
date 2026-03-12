import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CalendarDays, FileText, ClipboardList } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function NurseDashboardPage() {
  const session = await auth()
  if (!session?.user) return null

  const nurseProfile = await prisma.nurseProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      shiftAssignments: {
        include: { shift: { include: { unit: true, shiftType: true } } },
        orderBy: { assignedAt: "desc" },
        take: 5,
      },
      documents: {
        include: { documentType: true },
        where: { status: { in: ["ExpiringSoon", "NonCompliant"] } },
        take: 5,
      },
      shiftRequests: {
        where: { status: "Pending" },
      },
    },
  })

  if (!nurseProfile) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Your nurse profile has not been set up yet. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const docStatusVariant: Record<string, "destructive" | "warning" | "success"> = {
    NonCompliant: "destructive",
    ExpiringSoon: "warning",
    Compliant: "success",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {nurseProfile.fullName}
        </h1>
        <p className="text-muted-foreground">
          {nurseProfile.specialisation ?? nurseProfile.employmentType} ·{" "}
          <Badge variant={nurseProfile.status === "Active" ? "success" : "secondary"}>
            {nurseProfile.status}
          </Badge>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Shifts
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{nurseProfile.shiftAssignments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{nurseProfile.shiftRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Docs Needing Action
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{nurseProfile.documents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              License Number
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono font-bold">{nurseProfile.licenseNumber}</p>
          </CardContent>
        </Card>
      </div>

      {nurseProfile.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents Requiring Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {nurseProfile.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between text-sm">
                  <span>{doc.documentType.name} — {doc.fileName}</span>
                  <div className="flex items-center gap-2">
                    {doc.expiryDate && (
                      <span className="text-xs text-muted-foreground">
                        Expires {formatDate(doc.expiryDate)}
                      </span>
                    )}
                    <Badge variant={docStatusVariant[doc.status] ?? "outline"}>
                      {doc.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
