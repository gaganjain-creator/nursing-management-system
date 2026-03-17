"use client"

import { useRouter } from "next/navigation"
import { RequestsTable } from "./RequestsTable"
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

interface RequestsTableServerProps {
  requests: RequestRow[]
  canReview?: boolean
}

export function RequestsTableServer({ requests, canReview }: RequestsTableServerProps) {
  const router = useRouter()
  return (
    <RequestsTable
      requests={requests}
      canReview={canReview}
      onReviewed={() => router.refresh()}
    />
  )
}
