import { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"
import { getSupabaseServer, DOCUMENTS_BUCKET } from "@/lib/supabase"

function isAdminOrSupervisor(role: string) {
  return role === "Admin" || role === "Supervisor"
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const { id } = await params

  // Nurses can only view their own profile
  if (session.user.role === "Nurse") {
    const nurseProfile = await prisma.nurseProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!nurseProfile || nurseProfile.id !== id) {
      return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
    }
  } else if (!isAdminOrSupervisor(session.user.role)) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const profile = await prisma.nurseProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, isActive: true } },
      documents: {
        include: { documentType: { select: { name: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
  })

  if (!profile) {
    return Response.json({ error: "Nurse profile not found", code: "NOT_FOUND" }, { status: 404 })
  }

  // Attach signed URLs for documents
  const documentsWithUrls = await Promise.all(
    profile.documents.map(async (doc: (typeof profile.documents)[number]) => {
      const { data } = await getSupabaseServer().storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(doc.storagePath, 3600)
      return { ...doc, signedUrl: data?.signedUrl ?? null }
    })
  )

  return Response.json({ ...profile, documents: documentsWithUrls })
}

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  emergencyContact: z.string().min(1).optional(),
  specialisation: z.string().optional(),
  licenseNumber: z.string().min(1).optional(),
  employmentType: z.enum(["FullTime", "PartTime", "Agency"]).optional(),
  status: z.enum(["Active", "Inactive", "PendingReview"]).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const { id } = await params

  // Nurses can only update their own contact info
  if (session.user.role === "Nurse") {
    const nurseProfile = await prisma.nurseProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!nurseProfile || nurseProfile.id !== id) {
      return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
    }
  } else if (!isAdminOrSupervisor(session.user.role)) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
      { status: 400 }
    )
  }

  const existing = await prisma.nurseProfile.findUnique({
    where: { id },
    select: { fullName: true, status: true, employmentType: true },
  })
  if (!existing) {
    return Response.json({ error: "Nurse profile not found", code: "NOT_FOUND" }, { status: 404 })
  }

  // Nurses may only update contact fields
  const updateData =
    session.user.role === "Nurse"
      ? {
          phone: parsed.data.phone,
          address: parsed.data.address,
          emergencyContact: parsed.data.emergencyContact,
        }
      : parsed.data

  const updated = await prisma.nurseProfile.update({
    where: { id },
    data: updateData,
  })

  await writeAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "NurseProfile",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updateData as Record<string, unknown>,
  })

  return Response.json(updated)
}
