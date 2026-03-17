"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditNurseModal, type NurseProfileRow } from "@/components/nurses/EditNurseModal"
import { DocumentSection } from "@/components/documents/DocumentSection"
import { NurseComplianceTab } from "@/components/compliance/NurseComplianceTab"
import { formatDate } from "@/lib/utils"
import { getComplianceStatus, getWorstStatus } from "@/lib/utils/getComplianceStatus"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentType {
  id: string
  name: string
  defaultExpiryDays: number
}

interface Document {
  id: string
  fileName: string
  storagePath: string
  expiryDate: string | Date | null
  status: "Compliant" | "ExpiringSoon" | "NonCompliant"
  documentType: { name: string; alertLeadDays: number }
  uploadedAt: string | Date
  signedUrl: string | null
}

export interface Profile {
  id: string
  fullName: string
  dateOfBirth: string | Date
  phone: string
  address: string
  emergencyContact: string
  specialisation: string | null
  licenseNumber: string
  employmentType: "FullTime" | "PartTime" | "Agency"
  status: "Active" | "Inactive" | "PendingReview"
  user: { email: string; isActive: boolean }
  documents: Document[]
}

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  Active: "success",
  PendingReview: "warning",
  Inactive: "destructive",
}

const empTypeLabel: Record<string, string> = {
  FullTime: "Full Time",
  PartTime: "Part Time",
  Agency: "Agency",
}

interface Props {
  profile: Profile
  documentTypes: DocumentType[]
  canEdit: boolean
}

type Tab = "overview" | "compliance"

export function NurseProfileDetail({ profile: initial, documentTypes, canEdit }: Props) {
  const [profile, setProfile] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  async function refreshProfile() {
    const res = await fetch(`/api/nurse-profiles/${profile.id}`)
    if (res.ok) setProfile(await res.json())
  }

  const editRow: NurseProfileRow = {
    id: profile.id,
    fullName: profile.fullName,
    phone: profile.phone,
    address: profile.address,
    emergencyContact: profile.emergencyContact,
    specialisation: profile.specialisation,
    licenseNumber: profile.licenseNumber,
    employmentType: profile.employmentType,
    status: profile.status,
  }

  const complianceStatuses = profile.documents.map((d) =>
    getComplianceStatus(d, d.documentType)
  )
  const overallStatus = complianceStatuses.length > 0 ? getWorstStatus(complianceStatuses) : "Compliant" as const

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "compliance", label: "Compliance" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{profile.fullName}</h1>
          <p className="text-sm text-muted-foreground">{profile.user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[profile.status]}>{profile.status}</Badge>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Date of Birth" value={formatDate(new Date(profile.dateOfBirth))} />
                <Row label="Phone" value={profile.phone} />
                <Row label="Address" value={profile.address} />
                <Row label="Emergency Contact" value={profile.emergencyContact} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Professional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="License Number" value={profile.licenseNumber} />
                <Row label="Specialisation" value={profile.specialisation ?? "—"} />
                <Row label="Employment Type" value={empTypeLabel[profile.employmentType]} />
                <Row label="Account Status" value={profile.user.isActive ? "Active" : "Inactive"} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <DocumentSection
                nurseProfileId={profile.id}
                initialDocuments={profile.documents}
                documentTypes={documentTypes}
                canEdit={canEdit}
              />
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "compliance" && (
        <Card>
          <CardContent className="pt-6">
            <NurseComplianceTab
              documents={profile.documents}
              overallStatus={overallStatus}
            />
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <EditNurseModal
          profile={editRow}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onUpdated={refreshProfile}
        />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
