import { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { getSupabaseServer, DOCUMENTS_BUCKET } from "@/lib/supabase"

const schema = z.object({
  fileName: z.string().min(1),
  nurseProfileId: z.string().min(1),
  documentTypeId: z.string().min(1),
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
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
      { status: 400 }
    )
  }

  const { fileName, nurseProfileId } = parsed.data
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `${nurseProfileId}/${Date.now()}-${safeName}`

  const { data, error } = await getSupabaseServer().storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    console.error("[upload] signed URL error:", error)
    return Response.json({ error: "Failed to generate upload URL", code: "STORAGE_ERROR" }, { status: 500 })
  }

  return Response.json({ signedUrl: data.signedUrl, token: data.token, path: storagePath })
}
