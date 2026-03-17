import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"
import { writeAuditLog } from "@/lib/audit"

const assignSchema = z.object({
  nurseProfileId: z.string(),
})

export async function POST(
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
  const shift = await prisma.shift.findUnique({ where: { id } })
  if (!shift) {
    return NextResponse.json({ error: "Shift not found", code: "NOT_FOUND" }, { status: 404 })
  }
  if (shift.status === "Cancelled") {
    return NextResponse.json({ error: "Cannot assign to cancelled shift", code: "INVALID_STATE" }, { status: 400 })
  }

  const body: unknown = await request.json()
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const nurseProfile = await prisma.nurseProfile.findUnique({
    where: { id: parsed.data.nurseProfileId },
  })
  if (!nurseProfile) {
    return NextResponse.json({ error: "Nurse profile not found", code: "NOT_FOUND" }, { status: 404 })
  }

  // Check nurse availability for the shift date
  const shiftDate = new Date(shift.date)
  shiftDate.setHours(0, 0, 0, 0)
  const availability = await prisma.nurseAvailability.findUnique({
    where: { nurseId_date: { nurseId: nurseProfile.id, date: shiftDate } },
  })
  if (availability && !availability.isAvailable) {
    return NextResponse.json(
      { error: "Nurse is marked unavailable on this date", code: "NURSE_UNAVAILABLE" },
      { status: 403 }
    )
  }

  // Check for existing assignment
  const existing = await prisma.shiftAssignment.findUnique({
    where: { shiftId_nurseId: { shiftId: id, nurseId: parsed.data.nurseProfileId } },
  })
  if (existing) {
    return NextResponse.json({ error: "Nurse already assigned to this shift", code: "ALREADY_ASSIGNED" }, { status: 409 })
  }

  const assignment = await prisma.shiftAssignment.create({
    data: {
      shiftId: id,
      nurseId: nurseProfile.id,
      nurseUserId: nurseProfile.userId,
      assignedById: session.user.id,
    },
  })

  await prisma.shift.update({ where: { id }, data: { status: "Assigned" } })

  // Notify the nurse
  await prisma.notification.create({
    data: {
      userId: nurseProfile.userId,
      type: "SHIFT_ASSIGNED",
      title: "New Shift Assigned",
      message: `You have been assigned a shift on ${shift.date.toLocaleDateString("en-AU")}.`,
      relatedEntityId: id,
    },
  })

  await writeAuditLog({
    userId: session.user.id,
    action: "ASSIGN",
    entityType: "Shift",
    entityId: id,
    newValues: { nurseId: nurseProfile.id },
  })

  return NextResponse.json(assignment, { status: 201 })
}

export async function DELETE(
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
  const { searchParams } = new URL(request.url)
  const nurseProfileId = searchParams.get("nurseProfileId")

  if (!nurseProfileId) {
    return NextResponse.json({ error: "nurseProfileId required", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  await prisma.shiftAssignment.deleteMany({
    where: { shiftId: id, nurseId: nurseProfileId },
  })

  // If no more assignments, set back to Open
  const remaining = await prisma.shiftAssignment.count({ where: { shiftId: id } })
  if (remaining === 0) {
    await prisma.shift.update({ where: { id }, data: { status: "Open" } })
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "UNASSIGN",
    entityType: "Shift",
    entityId: id,
    oldValues: { nurseId: nurseProfileId },
  })

  return NextResponse.json({ ok: true })
}
