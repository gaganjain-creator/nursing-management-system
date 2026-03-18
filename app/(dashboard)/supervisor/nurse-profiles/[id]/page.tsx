import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSupabaseServer, DOCUMENTS_BUCKET } from "@/lib/supabase"
import { NurseProfileDetail, type Profile } from "@/components/nurses/NurseProfileDetail"

async function getProfile(id: string): Promise<Profile | null> {
  const profile = await prisma.nurseProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, isActive: true } },
      documents: {
        include: { documentType: { select: { name: true, alertLeadDays: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
  })
  if (!profile) return null

  const documentsWithUrls = await Promise.all(
    profile.documents.map(async (doc: (typeof profile.documents)[number]) => {
      const { data } = await getSupabaseServer().storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(doc.storagePath, 3600)
      return { ...doc, signedUrl: data?.signedUrl ?? null }
    })
  )

  return { ...profile, documents: documentsWithUrls }
}

export default async function SupervisorNurseProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) notFound()

  const { id } = await params
  const [profile, documentTypes] = await Promise.all([
    getProfile(id),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
  ])

  if (!profile) notFound()

  return (
    <NurseProfileDetail
      profile={profile}
      documentTypes={documentTypes}
      canEdit={true}
    />
  )
}
