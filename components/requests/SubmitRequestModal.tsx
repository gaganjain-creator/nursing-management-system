"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"

interface ShiftOption {
  id: string
  date: string
  shiftType: { name: string }
  unit: { name: string }
}

interface SubmitRequestModalProps {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
  shifts: ShiftOption[]
}

export function SubmitRequestModal({ open, onClose, onSubmitted, shifts }: SubmitRequestModalProps) {
  const [type, setType] = useState<"SwapRequest" | "TimeOff">("TimeOff")
  const [shiftId, setShiftId] = useState("")
  const [requestedDate, setRequestedDate] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!reason.trim()) {
      setError("Please provide a reason.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/shift-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          shiftId: type === "SwapRequest" && shiftId ? shiftId : undefined,
          requestedDate: type === "TimeOff" && requestedDate ? new Date(requestedDate).toISOString() : undefined,
          reason,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error)
        return
      }
      onSubmitted()
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setType("TimeOff")
    setShiftId("")
    setRequestedDate("")
    setReason("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Request Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value as "SwapRequest" | "TimeOff")}>
              <option value="TimeOff">Time Off</option>
              <option value="SwapRequest">Shift Swap</option>
            </Select>
          </div>

          {type === "SwapRequest" && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Shift to Swap</label>
              <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
                <option value="">Select shift…</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.date).toLocaleDateString("en-AU")} – {s.shiftType.name} ({s.unit.name})
                  </option>
                ))}
              </Select>
            </div>
          )}

          {type === "TimeOff" && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Requested Date</label>
              <input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain your request…"
              rows={3}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
