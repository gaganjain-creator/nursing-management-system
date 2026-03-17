import { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"

const updateSchema = z.object({
  role: z.enum(["Admin", "Supervisor", "Nurse", "Management"]).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin") {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, email: true },
  })
  if (!existing) {
    return Response.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 })
  }

  // Prevent admins from modifying their own account
  if (id === session.user.id) {
    return Response.json({ error: "Cannot modify your own account", code: "FORBIDDEN" }, { status: 403 })
  }

  // Only an existing Admin account can be promoted to Admin
  if (parsed.data.role === "Admin" && existing.role !== "Admin") {
    return Response.json({ error: "Cannot promote a non-Admin user to Admin", code: "FORBIDDEN" }, { status: 403 })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  })

  await writeAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "User",
    entityId: id,
    oldValues: { role: existing.role, isActive: existing.isActive },
    newValues: parsed.data as Record<string, unknown>,
  })

  return Response.json(updated)
}
