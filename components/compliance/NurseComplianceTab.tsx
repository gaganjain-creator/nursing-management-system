"use client"

import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

type ComplianceStatus = "Compliant" | "ExpiringSoon" | "NonCompliant"

interface DocRow {
  id: string
  fileName: string
  documentType: { name: string; alertLeadDays: number }
  expiryDate: string | Date | null
  status: ComplianceStatus
}

interface Props {
  documents: DocRow[]
  overallStatus: ComplianceStatus
}

const statusVariant: Record<ComplianceStatus, "success" | "warning" | "destructive"> = {
  Compliant: "success",
  ExpiringSoon: "warning",
  NonCompliant: "destructive",
}

export function NurseComplianceTab({ documents, overallStatus }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Overall Compliance Status:</span>
        <Badge variant={statusVariant[overallStatus]}>{overallStatus}</Badge>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <div className="rounded-md border divide-y">
          {documents.map((doc) => {
            const expiry = doc.expiryDate ? new Date(doc.expiryDate) : null
            return (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{doc.documentType.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                </div>
                <div className="flex items-center gap-3">
                  {expiry ? (
                    <span className="text-xs text-muted-foreground">
                      Expires {formatDate(expiry)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No expiry</span>
                  )}
                  <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
