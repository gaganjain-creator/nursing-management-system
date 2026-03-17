import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getComplianceStatus, getWorstStatus } from "@/lib/utils/getComplianceStatus"
import type { ComplianceStatus } from "@/lib/utils/getComplianceStatus"

export interface NurseComplianceRow {
  nurseId: string
  fullName: string
  email: string
  overallStatus: ComplianceStatus
  documents: {
    id: string
    fileName: string
    documentTypeName: string
    uploadedAt: string
    expiryDate: string | null
    status: ComplianceStatus
  }[]
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin" && session.user.role !== "Supervisor") {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

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

  const rows: NurseComplianceRow[] = profiles.map((profile) => {
    const docRows = profile.documents.map((doc) => {
      const status = getComplianceStatus(doc, doc.documentType)
      return {
        id: doc.id,
        fileName: doc.fileName,
        documentTypeName: doc.documentType.name,
        uploadedAt: doc.uploadedAt.toISOString(),
        expiryDate: doc.expiryDate?.toISOString() ?? null,
        status,
      }
    })

    const overallStatus = docRows.length > 0
      ? getWorstStatus(docRows.map((d) => d.status))
      : "Compliant" as ComplianceStatus

    return {
      nurseId: profile.id,
      fullName: profile.fullName,
      email: profile.user.email,
      overallStatus,
      documents: docRows,
    }
  })

  return Response.json(rows)
}
