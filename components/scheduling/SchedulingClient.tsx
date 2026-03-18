"use client"

import { useState, useCallback, useEffect } from "react"
import { ShiftTable } from "./ShiftTable"
import { CreateShiftModal } from "./CreateShiftModal"
import { AssignNurseModal } from "./AssignNurseModal"
import { Select } from "@/components/ui/select"
import type { ShiftStatus } from "@/lib/types"

interface Unit {
  id: string
  name: string
  facility: { name: string }
}

interface ShiftType {
  id: string
  name: string
  defaultStartTime: string
  defaultEndTime: string
}

interface NurseOption {
  id: string
  fullName: string
  licenseNumber: string
}

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

interface SchedulingClientProps {
  initialShifts: ShiftRow[]
  units: Unit[]
  shiftTypes: ShiftType[]
  nurses: NurseOption[]
  canCreate: boolean
}

export function SchedulingClient({ initialShifts, units, shiftTypes, nurses, canCreate }: SchedulingClientProps) {
  const [shifts, setShifts] = useState<ShiftRow[]>(initialShifts)
  const [statusFilter, setStatusFilter] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [assignShiftId, setAssignShiftId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    const res = await fetch(`/api/shifts?${params.toString()}`)
    if (res.ok) {
      const data = await res.json() as ShiftRow[]
      setShifts(data)
    }
  }, [statusFilter])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleStatusChange(shiftId: string, status: ShiftStatus) {
    await fetch(`/api/shifts/${shiftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    await reload()
  }

  const filtered = statusFilter
    ? shifts.filter((s) => s.status === statusFilter)
    : shifts

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All statuses</option>
            <option value="Open">Open</option>
            <option value="Assigned">Assigned</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </div>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Create Shift
          </button>
        )}
      </div>

      <ShiftTable
        shifts={filtered}
        canEdit={canCreate}
        onAssign={(id) => setAssignShiftId(id)}
        onStatusChange={handleStatusChange}
      />

      {canCreate && (
        <>
          <CreateShiftModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            units={units}
            shiftTypes={shiftTypes}
            onCreated={reload}
          />
          <AssignNurseModal
            open={assignShiftId !== null}
            shiftId={assignShiftId}
            nurses={nurses}
            onClose={() => setAssignShiftId(null)}
            onAssigned={reload}
          />
        </>
      )}
    </div>
  )
}
