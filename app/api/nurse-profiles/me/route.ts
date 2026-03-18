import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSupabaseServer, DOCUMENTS_BUCKET } from "@/lib/supabase"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const profile = await prisma.nurseProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { email: true, isActive: true } },
      documents: {
        include: { documentType: { select: { name: true, alertLeadDays: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
  })

  if (!profile) {
    return Response.json({ error: "Nurse profile not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const supabase = getSupabaseServer()
  const documentsWithUrls = await Promise.all(
    profile.documents.map(async (doc: (typeof profile.documents)[number]) => {
      const { data } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(doc.storagePath, 3600)
      return { ...doc, signedUrl: data?.signedUrl ?? null }
    })
  )

  return Response.json({ ...profile, documents: documentsWithUrls })
}
