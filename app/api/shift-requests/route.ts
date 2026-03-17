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
  const status = searchParams.get("status")
  const take = Math.min(Number(searchParams.get("take") ?? 50), 50)
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0)

  if (session.user.role === "Nurse") {
    const profile = await prisma.nurseProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json([])
    }

    const requests = await prisma.shiftRequest.findMany({
      where: {
        nurseId: profile.id,
        ...(status ? { status: status as "Pending" | "Approved" | "Rejected" } : {}),
      },
      include: {
        shift: { include: { unit: { include: { facility: true } }, shiftType: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    })
    return NextResponse.json(requests)
  }

  // Admin / Supervisor — list all
  if (session.user.role !== "Admin" && session.user.role !== "Supervisor") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const requests = await prisma.shiftRequest.findMany({
    where: {
      ...(status ? { status: status as "Pending" | "Approved" | "Rejected" } : {}),
    },
    include: {
      nurse: { select: { fullName: true } },
      shift: { include: { unit: { include: { facility: true } }, shiftType: true } },
      reviewedBy: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  })

  return NextResponse.json(requests)
}

const createRequestSchema = z.object({
  type: z.enum(["SwapRequest", "TimeOff"]),
  shiftId: z.string().optional(),
  requestedDate: z.string().optional(),
  reason: z.string().min(1),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Nurse") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const profile = await prisma.nurseProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) {
    return NextResponse.json({ error: "Profile not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const body: unknown = await request.json()
  const parsed = createRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const { type, shiftId, requestedDate, reason } = parsed.data

  // Request creation and supervisor notifications are atomic
  const shiftRequest = await prisma.$transaction(async (tx) => {
    const sr = await tx.shiftRequest.create({
      data: {
        nurseId: profile.id,
        nurseUserId: session.user.id,
        type,
        shiftId: shiftId ?? null,
        requestedDate: requestedDate ? new Date(requestedDate) : null,
        reason,
      },
    })
    const supervisors = await tx.user.findMany({
      where: { role: { in: ["Admin", "Supervisor"] }, isActive: true },
      select: { id: true },
    })
    await tx.notification.createMany({
      data: supervisors.map((u) => ({
        userId: u.id,
        type: "SHIFT_REQUEST",
        title: "New Shift Request",
        message: `A nurse has submitted a ${type === "TimeOff" ? "time-off" : "swap"} request.`,
        relatedEntityId: sr.id,
      })),
    })
    return sr
  })

  try {
    await writeAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "ShiftRequest",
      entityId: shiftRequest.id,
      newValues: { type, reason },
    })
  } catch (e) {
    console.error("[audit] CREATE ShiftRequest failed:", e)
  }

  return NextResponse.json(shiftRequest, { status: 201 })
}
