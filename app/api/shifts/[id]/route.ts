import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"
import { writeAuditLog } from "@/lib/audit"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const { id } = await params
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      unit: { include: { facility: true } },
      shiftType: true,
      assignments: {
        include: {
          nurse: { select: { fullName: true, licenseNumber: true } },
          assignedBy: { select: { email: true } },
        },
      },
    },
  })

  if (!shift) {
    return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 })
  }

  return NextResponse.json(shift)
}

const updateShiftSchema = z.object({
  status: z.enum(["Open", "Assigned", "Completed", "Cancelled"]).optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
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
  const existing = await prisma.shift.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const body: unknown = await request.json()
  const parsed = updateShiftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const data = parsed.data
  const shift = await prisma.shift.update({
    where: { id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.date ? { date: new Date(data.date) } : {}),
      ...(data.startTime ? { startTime: new Date(data.startTime) } : {}),
      ...(data.endTime ? { endTime: new Date(data.endTime) } : {}),
    },
    include: { unit: { include: { facility: true } }, shiftType: true },
  })

  await writeAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "Shift",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: data,
  })

  return NextResponse.json(shift)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.shift.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 })
  }

  await prisma.shift.delete({ where: { id } })

  await writeAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entityType: "Shift",
    entityId: id,
    oldValues: { status: existing.status },
  })

  return NextResponse.json({ ok: true })
}
