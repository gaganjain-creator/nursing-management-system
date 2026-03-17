"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"
import type { RequestStatus, ShiftRequestType } from "@prisma/client"

interface RequestRow {
  id: string
  type: ShiftRequestType
  reason: string
  status: RequestStatus
  createdAt: string
  nurse?: { fullName: string }
  shift?: { date: string; shiftType: { name: string } } | null
  requestedDate?: string | null
  notes?: string | null
  reviewedBy?: { email: string } | null
}

interface RequestsTableProps {
  requests: RequestRow[]
  canReview?: boolean
  onReviewed?: () => void
}

const statusVariant: Record<RequestStatus, "warning" | "success" | "destructive"> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "destructive",
}

export function RequestsTable({ requests, canReview, onReviewed }: RequestsTableProps) {
  const [reviewing, setReviewing] = useState<RequestRow | null>(null)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleReview(status: "Approved" | "Rejected") {
    if (!reviewing) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`/api/shift-requests/${reviewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: notes || undefined }),
      })
      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error)
        return
      }
      setReviewing(null)
      setNotes("")
      onReviewed?.()
    } finally {
      setLoading(false)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No requests found.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {requests[0]?.nurse !== undefined && <TableHead>Nurse</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              {canReview && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                {req.nurse !== undefined && (
                  <TableCell className="font-medium">{req.nurse?.fullName ?? "—"}</TableCell>
                )}
                <TableCell>
                  <Badge variant="outline">{req.type === "TimeOff" ? "Time Off" : "Swap"}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {req.shift
                    ? `Shift: ${formatDate(req.shift.date)} (${req.shift.shiftType.name})`
                    : req.requestedDate
                    ? `Date: ${formatDate(req.requestedDate)}`
                    : "—"}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">{req.reason}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(req.createdAt)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                    {req.notes && (
                      <p className="text-xs text-muted-foreground max-w-[150px] truncate">{req.notes}</p>
                    )}
                  </div>
                </TableCell>
                {canReview && (
                  <TableCell className="text-right">
                    {req.status === "Pending" && (
                      <button
                        onClick={() => { setReviewing(req); setNotes("") }}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Review
                      </button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={reviewing !== null} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><span className="font-medium">Type:</span> {reviewing.type === "TimeOff" ? "Time Off" : "Swap Request"}</p>
                <p><span className="font-medium">Reason:</span> {reviewing.reason}</p>
                {reviewing.shift && (
                  <p><span className="font-medium">Shift:</span> {formatDate(reviewing.shift.date)} – {reviewing.shift.shiftType.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note for the nurse…"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewing(null)}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReview("Rejected")}
                  disabled={loading}
                  className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleReview("Approved")}
                  disabled={loading}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
