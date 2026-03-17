import { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  defaultExpiryDays: z.number().int().min(1).optional(),
  alertLeadDays: z.number().int().min(1).optional(),
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

  const existing = await prisma.documentType.findUnique({ where: { id } })
  if (!existing) {
    return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const updated = await prisma.documentType.update({ where: { id }, data: parsed.data })

  await writeAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "DocumentType",
    entityId: id,
    oldValues: { name: existing.name, defaultExpiryDays: existing.defaultExpiryDays, alertLeadDays: existing.alertLeadDays },
    newValues: parsed.data as Record<string, unknown>,
  })

  return Response.json(updated)
}

export async function DELETE(
  _req: NextRequest,
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

  const existing = await prisma.documentType.findUnique({ where: { id } })
  if (!existing) {
    return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 })
  }

  await prisma.documentType.delete({ where: { id } })

  await writeAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entityType: "DocumentType",
    entityId: id,
    oldValues: { name: existing.name },
  })

  return new Response(null, { status: 204 })
}
