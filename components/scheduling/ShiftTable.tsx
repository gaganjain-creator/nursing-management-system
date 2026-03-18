"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import type { ShiftStatus } from "@/lib/types"

interface ShiftRow {
  id: string
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  unit: { name: string; facility: { name: string } }
  shiftType: { name: string }
  assignments: { nurse: { fullName: string } }[]
}

interface ShiftTableProps {
  shifts: ShiftRow[]
  onAssign?: (shiftId: string) => void
  onStatusChange?: (shiftId: string, status: ShiftStatus) => void
  canEdit?: boolean
}

const statusVariant: Record<ShiftStatus, "outline" | "success" | "warning" | "secondary" | "destructive"> = {
  Open: "warning",
  Assigned: "success",
  Completed: "secondary",
  Cancelled: "destructive",
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function ShiftTable({ shifts, onAssign, onStatusChange, canEdit }: ShiftTableProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  async function handleMarkComplete(shiftId: string) {
    if (!onStatusChange) return
    setUpdating(shiftId)
    await onStatusChange(shiftId, "Completed")
    setUpdating(null)
  }

  if (shifts.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No shifts found.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Facility / Unit</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            {canEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell className="font-medium">{formatDate(shift.date)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
              </TableCell>
              <TableCell>
                <span className="font-medium">{shift.unit.facility.name}</span>
                <span className="text-muted-foreground"> / {shift.unit.name}</span>
              </TableCell>
              <TableCell>{shift.shiftType.name}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[shift.status]}>{shift.status}</Badge>
              </TableCell>
              <TableCell>
                {shift.assignments.length > 0
                  ? shift.assignments.map((a) => a.nurse.fullName).join(", ")
                  : <span className="text-muted-foreground text-sm">Unassigned</span>}
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {shift.status === "Open" && onAssign && (
                      <button
                        onClick={() => onAssign(shift.id)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Assign
                      </button>
                    )}
                    {shift.status === "Assigned" && onStatusChange && (
                      <button
                        onClick={() => handleMarkComplete(shift.id)}
                        disabled={updating === shift.id}
                        className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {updating === shift.id ? "Saving…" : "Mark Complete"}
                      </button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
