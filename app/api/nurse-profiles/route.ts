import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"

const createSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  phone: z.string().min(1, "Phone required"),
  address: z.string().min(1, "Address required"),
  emergencyContact: z.string().min(1, "Emergency contact required"),
  specialisation: z.string().optional(),
  licenseNumber: z.string().min(1, "License number required"),
  employmentType: z.enum(["FullTime", "PartTime", "Agency"]),
})

function isAdminOrSupervisor(role: string) {
  return role === "Admin" || role === "Supervisor"
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (!isAdminOrSupervisor(session.user.role)) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""
  const employmentType = searchParams.get("employmentType") ?? ""
  const take = Math.min(Number(searchParams.get("take") ?? 50), 50)
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0)

  const profiles = await prisma.nurseProfile.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { specialisation: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status: status as "Active" | "Inactive" | "PendingReview" } : {},
        employmentType
          ? { employmentType: employmentType as "FullTime" | "PartTime" | "Agency" }
          : {},
      ],
    },
    select: {
      id: true,
      fullName: true,
      specialisation: true,
      licenseNumber: true,
      employmentType: true,
      status: true,
      createdAt: true,
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  })

  return Response.json(profiles)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (!isAdminOrSupervisor(session.user.role)) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
      { status: 400 }
    )
  }

  const {
    email, password, fullName, dateOfBirth, phone,
    address, emergencyContact, specialisation, licenseNumber, employmentType,
  } = parsed.data

  const [existingUser, existingLicense] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.nurseProfile.findUnique({ where: { licenseNumber } }),
  ])

  if (existingUser) {
    return Response.json({ error: "Email already in use", code: "DUPLICATE_EMAIL" }, { status: 409 })
  }
  if (existingLicense) {
    return Response.json({ error: "License number already registered", code: "DUPLICATE_LICENSE" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const profile = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, role: "Nurse" },
    })
    // Defensive: a NurseProfile must only be linked to a Nurse-role account
    if (user.role !== "Nurse") {
      throw new Error("USER_ROLE_MISMATCH")
    }
    return tx.nurseProfile.create({
      data: {
        userId: user.id,
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        phone,
        address,
        emergencyContact,
        specialisation: specialisation ?? null,
        licenseNumber,
        employmentType,
      },
      select: { id: true, fullName: true, licenseNumber: true },
    })
  })

  await writeAuditLog({
    userId: session.user.id,
    action: "CREATE",
    entityType: "NurseProfile",
    entityId: profile.id,
    newValues: { fullName, licenseNumber, employmentType, email },
  })

  return Response.json(profile, { status: 201 })
}
