"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { ComplianceStatus } from "@/lib/utils/getComplianceStatus"

interface DocRow {
  id: string
  fileName: string
  documentTypeName: string
  uploadedAt: string
  expiryDate: string | null
  status: ComplianceStatus
}

export interface NurseComplianceRow {
  nurseId: string
  fullName: string
  email: string
  overallStatus: ComplianceStatus
  documents: DocRow[]
}

interface Props {
  rows: NurseComplianceRow[]
  filterStatus?: string
}

const statusVariant: Record<ComplianceStatus, "success" | "warning" | "destructive"> = {
  Compliant: "success",
  ExpiringSoon: "warning",
  NonCompliant: "destructive",
}

export function ComplianceTable({ rows, filterStatus }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = filterStatus
    ? rows.filter((r) => r.overallStatus === filterStatus)
    : rows

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Nurse</TableHead>
            <TableHead>Overall Status</TableHead>
            <TableHead>Documents</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => (
            <>
              <TableRow key={row.nurseId} className="cursor-pointer" onClick={() => toggle(row.nurseId)}>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {expanded.has(row.nurseId) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{row.fullName}</p>
                  <p className="text-xs text-muted-foreground">{row.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[row.overallStatus]}>{row.overallStatus}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.documents.length} document(s)
                </TableCell>
              </TableRow>
              {expanded.has(row.nurseId) && (
                <TableRow key={`${row.nurseId}-docs`}>
                  <TableCell colSpan={4} className="bg-muted/30 py-0">
                    <div className="divide-y py-2 pl-8">
                      {row.documents.length === 0 ? (
                        <p className="py-2 text-sm text-muted-foreground">No documents uploaded.</p>
                      ) : (
                        row.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between py-2 pr-4">
                            <div>
                              <p className="text-sm font-medium">{doc.documentTypeName}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.fileName} · Uploaded {formatDate(doc.uploadedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {doc.expiryDate && (
                                <span className="text-xs text-muted-foreground">
                                  Expires {formatDate(doc.expiryDate)}
                                </span>
                              )}
                              <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No nurses match this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
