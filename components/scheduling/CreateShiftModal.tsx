"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"

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

interface CreateShiftModalProps {
  open: boolean
  onClose: () => void
  units: Unit[]
  shiftTypes: ShiftType[]
  onCreated: () => void
}

export function CreateShiftModal({ open, onClose, units, shiftTypes, onCreated }: CreateShiftModalProps) {
  const [date, setDate] = useState("")
  const [unitId, setUnitId] = useState("")
  const [shiftTypeId, setShiftTypeId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function handleShiftTypeChange(id: string) {
    setShiftTypeId(id)
    const st = shiftTypes.find((s) => s.id === id)
    if (st && date) {
      setStartTime(`${date}T${st.defaultStartTime}`)
      setEndTime(`${date}T${st.defaultEndTime}`)
    }
  }

  function handleDateChange(d: string) {
    setDate(d)
    const st = shiftTypes.find((s) => s.id === shiftTypeId)
    if (st) {
      setStartTime(`${d}T${st.defaultStartTime}`)
      setEndTime(`${d}T${st.defaultEndTime}`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!date || !unitId || !shiftTypeId || !startTime || !endTime) {
      setError("All fields are required.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          unitId,
          shiftTypeId,
          roleRequired: "Nurse",
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error)
        return
      }
      onCreated()
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setDate("")
    setUnitId("")
    setShiftTypeId("")
    setStartTime("")
    setEndTime("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Unit</label>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} required>
              <option value="">Select unit…</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.facility.name} / {u.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Shift Type</label>
            <Select value={shiftTypeId} onChange={(e) => handleShiftTypeChange(e.target.value)} required>
              <option value="">Select type…</option>
              {shiftTypes.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.defaultStartTime}–{s.defaultEndTime})</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Creating…" : "Create Shift"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
