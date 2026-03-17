export type ComplianceStatus = "Compliant" | "ExpiringSoon" | "NonCompliant"

interface DocumentInput {
  expiryDate: Date | string | null
}

interface DocumentTypeInput {
  alertLeadDays: number
}

export function getComplianceStatus(
  document: DocumentInput,
  documentType: DocumentTypeInput
): ComplianceStatus {
  if (!document.expiryDate) return "Compliant"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(document.expiryDate)
  expiry.setHours(0, 0, 0, 0)

  if (expiry < today) return "NonCompliant"

  const alertCutoff = new Date(today)
  alertCutoff.setDate(today.getDate() + documentType.alertLeadDays)

  if (expiry <= alertCutoff) return "ExpiringSoon"

  return "Compliant"
}

/** Worst status wins: NonCompliant > ExpiringSoon > Compliant */
export function getWorstStatus(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.includes("NonCompliant")) return "NonCompliant"
  if (statuses.includes("ExpiringSoon")) return "ExpiringSoon"
  return "Compliant"
}
