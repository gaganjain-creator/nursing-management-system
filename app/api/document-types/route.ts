import { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"

const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  defaultExpiryDays: z.number().int().min(1, "Must be at least 1 day"),
  alertLeadDays: z.number().int().min(1, "Must be at least 1 day"),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const types = await prisma.documentType.findMany({ orderBy: { name: "asc" } })
  return Response.json(types)
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

  const existing = await prisma.documentType.findUnique({ where: { name: parsed.data.name } })
  if (existing) {
    return Response.json({ error: "Document type name already exists", code: "DUPLICATE" }, { status: 409 })
  }

  const docType = await prisma.documentType.create({ data: parsed.data })

  await writeAuditLog({
    userId: session.user.id,
    action: "CREATE",
    entityType: "DocumentType",
    entityId: docType.id,
    newValues: parsed.data as Record<string, unknown>,
  })

  return Response.json(docType, { status: 201 })
}
