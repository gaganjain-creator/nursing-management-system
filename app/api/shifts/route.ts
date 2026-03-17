import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"
import { writeAuditLog } from "@/lib/audit"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")
  const status = searchParams.get("status")
  const unitId = searchParams.get("unitId")
  const take = Math.min(Number(searchParams.get("take") ?? 50), 50)
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0)

  const dateSchema = z.coerce.date()
  const fromParsed = fromParam ? dateSchema.safeParse(fromParam) : null
  const toParsed = toParam ? dateSchema.safeParse(toParam) : null

  if (fromParsed && !fromParsed.success) {
    return NextResponse.json({ error: "Invalid 'from' date", code: "VALIDATION_ERROR" }, { status: 400 })
  }
  if (toParsed && !toParsed.success) {
    return NextResponse.json({ error: "Invalid 'to' date", code: "VALIDATION_ERROR" }, { status: 400 })
  }
  if (fromParsed?.success && toParsed?.success && fromParsed.data > toParsed.data) {
    return NextResponse.json({ error: "'from' must be before 'to'", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const from = fromParsed?.success ? fromParsed.data : null
  const to = toParsed?.success ? toParsed.data : null

  const shifts = await prisma.shift.findMany({
    where: {
      ...(from ? { date: { gte: from } } : {}),
      ...(to ? { date: { lte: to } } : {}),
      ...(status ? { status: status as "Open" | "Assigned" | "Completed" | "Cancelled" } : {}),
      ...(unitId ? { unitId } : {}),
    },
    include: {
      unit: { include: { facility: true } },
      shiftType: true,
      assignments: {
        include: {
          nurse: { select: { fullName: true } },
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take,
    skip,
  })

  return NextResponse.json(shifts)
}

const createShiftSchema = z
  .object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    unitId: z.string(),
    shiftTypeId: z.string(),
    roleRequired: z.enum(["Admin", "Supervisor", "Nurse", "Management"]),
  })
  .refine((d) => new Date(d.startTime) < new Date(d.endTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  })

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin" && session.user.role !== "Supervisor") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const body: unknown = await request.json()
  const parsed = createShiftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const { date, startTime, endTime, unitId, shiftTypeId, roleRequired } = parsed.data

  const shift = await prisma.shift.create({
    data: {
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      unitId,
      shiftTypeId,
      roleRequired,
    },
    include: {
      unit: { include: { facility: true } },
      shiftType: true,
    },
  })

  try {
    await writeAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "Shift",
      entityId: shift.id,
      newValues: parsed.data,
    })
  } catch (e) {
    console.error("[audit] CREATE Shift failed:", e)
  }

  return NextResponse.json(shift, { status: 201 })
}
