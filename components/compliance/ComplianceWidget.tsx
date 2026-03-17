import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getComplianceStatus, getWorstStatus } from "@/lib/utils/getComplianceStatus"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck } from "lucide-react"

async function getComplianceCounts() {
  const profiles = await prisma.nurseProfile.findMany({
    where: { status: "Active" },
    include: {
      documents: { include: { documentType: true } },
    },
  })

  let compliant = 0
  let expiringSoon = 0
  let nonCompliant = 0

  for (const p of profiles) {
    if (p.documents.length === 0) {
      compliant++
      continue
    }
    const statuses = p.documents.map((d) => getComplianceStatus(d, d.documentType))
    const worst = getWorstStatus(statuses)
    if (worst === "NonCompliant") nonCompliant++
    else if (worst === "ExpiringSoon") expiringSoon++
    else compliant++
  }

  return { compliant, expiringSoon, nonCompliant, total: profiles.length }
}

interface Props {
  compliancePath: string
}

export async function ComplianceWidget({ compliancePath }: Props) {
  const counts = await getComplianceCounts()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Nurse Compliance
        </CardTitle>
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Link href={`${compliancePath}?status=Compliant`} className="group rounded-md border p-3 hover:bg-muted">
            <p className="text-2xl font-bold text-green-600">{counts.compliant}</p>
            <p className="text-xs text-muted-foreground group-hover:text-foreground">Compliant</p>
          </Link>
          <Link href={`${compliancePath}?status=ExpiringSoon`} className="group rounded-md border p-3 hover:bg-muted">
            <p className="text-2xl font-bold text-amber-500">{counts.expiringSoon}</p>
            <p className="text-xs text-muted-foreground group-hover:text-foreground">Expiring Soon</p>
          </Link>
          <Link href={`${compliancePath}?status=NonCompliant`} className="group rounded-md border p-3 hover:bg-muted">
            <p className="text-2xl font-bold text-destructive">{counts.nonCompliant}</p>
            <p className="text-xs text-muted-foreground group-hover:text-foreground">Non-Compliant</p>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
