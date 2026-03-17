import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"

const createSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["Admin", "Supervisor", "Nurse", "Management"]),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin") {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      nurseProfile: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(users, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin") {
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

  const { email, password, role } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: "Email already in use", code: "DUPLICATE_EMAIL" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { email, passwordHash, role },
    select: { id: true, email: true, role: true, isActive: true, createdAt: true },
  })

  await writeAuditLog({
    userId: session.user.id,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    newValues: { email: user.email, role: user.role },
  })

  return Response.json(user, { status: 201 })
}
