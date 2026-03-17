import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"
import { getSupabaseServer, DOCUMENTS_BUCKET } from "@/lib/supabase"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }
  if (session.user.role !== "Admin" && session.user.role !== "Supervisor") {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true, storagePath: true, nurseProfileId: true, fileName: true },
  })

  if (!document) {
    return Response.json({ error: "Document not found", code: "NOT_FOUND" }, { status: 404 })
  }

  // Remove from Supabase Storage (non-blocking on failure)
  const { error: storageError } = await getSupabaseServer().storage
    .from(DOCUMENTS_BUCKET)
    .remove([document.storagePath])

  if (storageError) {
    console.error("[documents] storage delete error:", storageError)
  }

  await prisma.document.delete({ where: { id } })

  await writeAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entityType: "Document",
    entityId: id,
    oldValues: { fileName: document.fileName, storagePath: document.storagePath },
  })

  return new Response(null, { status: 204 })
}
