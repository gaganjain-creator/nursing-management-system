"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"

interface NurseOption {
  id: string
  fullName: string
  licenseNumber: string
}

interface AssignNurseModalProps {
  open: boolean
  shiftId: string | null
  nurses: NurseOption[]
  onClose: () => void
  onAssigned: () => void
}

export function AssignNurseModal({ open, shiftId, nurses, onClose, onAssigned }: AssignNurseModalProps) {
  const [nurseProfileId, setNurseProfileId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shiftId || !nurseProfileId) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`/api/shifts/${shiftId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nurseProfileId }),
      })
      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error)
        return
      }
      onAssigned()
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setNurseProfileId("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Nurse to Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Select Nurse</label>
            <Select value={nurseProfileId} onChange={(e) => setNurseProfileId(e.target.value)} required>
              <option value="">Choose a nurse…</option>
              {nurses.map((n) => (
                <option key={n.id} value={n.id}>{n.fullName} ({n.licenseNumber})</option>
              ))}
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={loading || !nurseProfileId} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Assigning…" : "Assign"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
