"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RequestsTable } from "./RequestsTable"
import { SubmitRequestModal } from "./SubmitRequestModal"
import type { RequestStatus, ShiftRequestType } from "@prisma/client"

interface RequestRow {
  id: string
  type: ShiftRequestType
  reason: string
  status: RequestStatus
  createdAt: string
  shift?: { date: string; shiftType: { name: string } } | null
  requestedDate?: string | null
  notes?: string | null
}

interface ShiftOption {
  id: string
  date: string
  shiftType: { name: string }
  unit: { name: string }
}

interface NurseRequestsClientProps {
  requests: RequestRow[]
  shifts: ShiftOption[]
}

export function NurseRequestsClient({ requests, shifts }: NurseRequestsClientProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Request
        </button>
      </div>
      <RequestsTable requests={requests} />
      <SubmitRequestModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={() => router.refresh()}
        shifts={shifts}
      />
    </div>
  )
}
