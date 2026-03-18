import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getComplianceStatus, getWorstStatus } from "@/lib/utils/getComplianceStatus"
import { ComplianceTable } from "@/components/compliance/ComplianceTable"
import type { NurseComplianceRow } from "@/components/compliance/ComplianceTable"

async function getComplianceRows(): Promise<NurseComplianceRow[]> {
  const profiles = await prisma.nurseProfile.findMany({
    where: { status: "Active" },
    include: {
      user: { select: { email: true } },
      documents: {
        include: { documentType: true },
        orderBy: { expiryDate: "asc" },
      },
    },
    orderBy: { fullName: "asc" },
  })

  return profiles.map((profile: (typeof profiles)[number]) => {
    const docRows: NurseComplianceRow["documents"] = profile.documents.map((doc: (typeof profile.documents)[number]) => ({
      id: doc.id,
      fileName: doc.fileName,
      documentTypeName: doc.documentType.name,
      uploadedAt: doc.uploadedAt.toISOString(),
      expiryDate: doc.expiryDate?.toISOString() ?? null,
      status: getComplianceStatus(doc, doc.documentType),
    }))

    const overallStatus =
      docRows.length > 0
        ? getWorstStatus(docRows.map((d) => d.status))
        : ("Compliant" as const)

    return {
      nurseId: profile.id,
      fullName: profile.fullName,
      email: profile.user.email,
      overallStatus,
      documents: docRows,
    }
  })
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminCompliancePage({ searchParams }: PageProps) {
  const session = await auth()

  if (!session?.user) redirect("/login")
  if (session.user.role !== "Admin") redirect("/")

  const { status } = await searchParams
  const rows = await getComplianceRows()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Compliance Overview
        </h1>
        <p className="text-muted-foreground">
          Document compliance status for all active nurses.
          {status && (
            <>
              {" "}
              Filtered by: <strong>{status}</strong>
            </>
          )}
        </p>
      </div>

      <ComplianceTable rows={rows} filterStatus={status} />
    </div>
  )
}