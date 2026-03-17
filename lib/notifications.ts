import { prisma } from "@/lib/prisma"
import { getComplianceStatus } from "@/lib/utils/getComplianceStatus"

/**
 * Generates compliance alert notifications for documents expiring soon.
 * Skips documents that already have a notification created within the last 24 hours.
 * Sends to all Admin and Supervisor users.
 */
export async function generateComplianceAlerts(): Promise<void> {
  const [expiringDocs, staffUsers] = await Promise.all([
    prisma.document.findMany({
      where: {
        expiryDate: { not: null },
        status: { in: ["ExpiringSoon", "NonCompliant"] },
      },
      include: {
        documentType: true,
        nurseProfile: { select: { fullName: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["Admin", "Supervisor"] }, isActive: true },
      select: { id: true },
    }),
  ])

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  for (const doc of expiringDocs) {
    const status = getComplianceStatus(doc, doc.documentType)
    if (status === "Compliant") continue

    // Check if any notification for this document was created in the last 24h
    const recent = await prisma.notification.findFirst({
      where: {
        relatedEntityId: doc.id,
        type: "DOCUMENT_EXPIRING",
        createdAt: { gte: cutoff },
      },
    })
    if (recent) continue

    const daysLeft = doc.expiryDate
      ? Math.ceil((doc.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    const title = status === "NonCompliant" ? "Document Non-Compliant" : "Document Expiring Soon"
    const message =
      status === "NonCompliant"
        ? `${doc.documentType.name} for ${doc.nurseProfile.fullName} has expired.`
        : `${doc.documentType.name} for ${doc.nurseProfile.fullName} expires in ${daysLeft} day(s).`

    await prisma.notification.createMany({
      data: staffUsers.map((u) => ({
        userId: u.id,
        type: "DOCUMENT_EXPIRING",
        title,
        message,
        relatedEntityId: doc.id,
      })),
    })
  }
}
