import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const nurseProfileId = searchParams.get("nurseProfileId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  // Nurses can only view their own; Admin/Supervisor can view any
  let resolvedNurseId = nurseProfileId
  if (session.user.role === "Nurse") {
    const profile = await prisma.nurseProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "Profile not found", code: "NOT_FOUND" }, { status: 404 })
    }
    resolvedNurseId = profile.id
  }

  if (!resolvedNurseId) {
    return NextResponse.json({ error: "nurseProfileId required", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const availability = await prisma.nurseAvailability.findMany({
    where: {
      nurseId: resolvedNurseId,
      ...(from ? { date: { gte: new Date(from) } } : {}),
      ...(to ? { date: { lte: new Date(to) } } : {}),
    },
    orderBy: { date: "asc" },
  })

  return NextResponse.json(availability)
}

const setAvailabilitySchema = z.object({
  date: z.string(),
  isAvailable: z.boolean(),
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
  const parsed = setAvailabilitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const { date, isAvailable } = parsed.data

  const record = await prisma.nurseAvailability.upsert({
    where: { nurseId_date: { nurseId: profile.id, date: new Date(date) } },
    update: { isAvailable },
    create: {
      nurseId: profile.id,
      nurseUserId: session.user.id,
      date: new Date(date),
      isAvailable,
    },
  })

  return NextResponse.json(record, { status: 201 })
}
