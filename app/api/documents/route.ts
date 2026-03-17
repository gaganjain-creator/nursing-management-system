import { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"

const createSchema = z.object({
  nurseProfileId: z.string().min(1),
  documentTypeId: z.string().min(1),
  fileName: z.string().min(1),
  storagePath: z.string().min(1),
  expiryDate: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin" && session.user.role !== "Supervisor") {
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

  const { nurseProfileId, documentTypeId, fileName, storagePath, expiryDate } = parsed.data

  // Calculate document status based on expiry
  let status: "Compliant" | "ExpiringSoon" | "NonCompliant" = "Compliant"
  if (expiryDate) {
    const expiry = new Date(expiryDate)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilExpiry < 0) {
      status = "NonCompliant"
    } else if (daysUntilExpiry <= 30) {
      status = "ExpiringSoon"
    }
  }

  const document = await prisma.document.create({
    data: {
      nurseProfileId,
      documentTypeId,
      fileName,
      storagePath,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status,
    },
    include: { documentType: { select: { name: true } } },
  })

  await writeAuditLog({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Document",
    entityId: document.id,
    newValues: { nurseProfileId, documentTypeId, fileName, storagePath },
  })

  return Response.json(document, { status: 201 })
}
