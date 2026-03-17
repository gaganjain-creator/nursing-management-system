import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"
import { writeAuditLog } from "@/lib/audit"

const reviewSchema = z.object({
  status: z.enum(["Approved", "Rejected"]),
  notes: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin" && session.user.role !== "Supervisor") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.shiftRequest.findUnique({
    where: { id },
    include: { nurse: { select: { userId: true, fullName: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 })
  }
  if (existing.status !== "Pending") {
    return NextResponse.json({ error: "Already reviewed", code: "INVALID_STATE" }, { status: 400 })
  }

  const body: unknown = await request.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const { status, notes } = parsed.data

  // Review update and nurse notification are atomic
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.shiftRequest.update({
      where: { id },
      data: {
        status,
        notes: notes ?? null,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    })
    await tx.notification.create({
      data: {
        userId: existing.nurse.userId,
        type: "REQUEST_REVIEWED",
        title: `Request ${status}`,
        message: `Your ${existing.type === "TimeOff" ? "time-off" : "swap"} request has been ${status.toLowerCase()}.${notes ? ` Note: ${notes}` : ""}`,
        relatedEntityId: id,
      },
    })
    return u
  })

  try {
    await writeAuditLog({
      userId: session.user.id,
      action: "REVIEW",
      entityType: "ShiftRequest",
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status, notes },
    })
  } catch (e) {
    console.error("[audit] REVIEW ShiftRequest failed:", e)
  }

  return NextResponse.json(updated)
}
