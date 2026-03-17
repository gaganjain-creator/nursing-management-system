"use client"

import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"
import { Pencil, X } from "lucide-react"
import { DocumentSection } from "@/components/documents/DocumentSection"

interface Profile {
  id: string
  fullName: string
  dateOfBirth: string
  phone: string
  address: string
  emergencyContact: string
  specialisation: string | null
  licenseNumber: string
  employmentType: string
  status: "Active" | "Inactive" | "PendingReview"
  user: { email: string; isActive: boolean }
  documents: {
    id: string
    fileName: string
    storagePath: string
    expiryDate: string | null
    status: "Compliant" | "ExpiringSoon" | "NonCompliant"
    documentType: { name: string }
    uploadedAt: string
    signedUrl: string | null
  }[]
}

const contactSchema = z.object({
  phone: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  emergencyContact: z.string().min(1, "Required"),
})

type ContactValues = z.infer<typeof contactSchema>

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

export default function NurseProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editContact, setEditContact] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) })

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/nurse-profiles/me")
    if (res.ok) {
      const data = await res.json()
      setProfile(data)
      reset({ phone: data.phone, address: data.address, emergencyContact: data.emergencyContact })
    }
    setLoading(false)
  }, [reset])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function onSaveContact(data: ContactValues) {
    if (!profile) return
    const res = await fetch(`/api/nurse-profiles/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      toast({ title: "Update failed", variant: "destructive" })
      return
    }
    const updated = await res.json()
    setProfile((prev) => prev ? { ...prev, ...updated } : prev)
    toast({ title: "Contact info updated" })
    setEditContact(false)
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (!profile) return <p className="text-sm text-destructive">Profile not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{profile.fullName}</h1>
          <p className="text-sm text-muted-foreground">{profile.user.email}</p>
        </div>
        <Badge variant={statusVariant[profile.status]}>{profile.status}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Professional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="License" value={profile.licenseNumber} />
            <Row label="Specialisation" value={profile.specialisation ?? "—"} />
            <Row label="Employment" value={empTypeLabel[profile.employmentType] ?? profile.employmentType} />
            <Row label="Date of Birth" value={formatDate(new Date(profile.dateOfBirth))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Contact Information</CardTitle>
            {!editContact ? (
              <Button variant="ghost" size="sm" onClick={() => setEditContact(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setEditContact(false); reset() }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editContact ? (
              <form onSubmit={handleSubmit(onSaveContact)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="n-phone">Phone</Label>
                  <Input id="n-phone" {...register("phone")} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="n-address">Address</Label>
                  <Input id="n-address" {...register("address")} />
                  {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="n-emergency">Emergency Contact</Label>
                  <Input id="n-emergency" {...register("emergencyContact")} />
                  {errors.emergencyContact && <p className="text-xs text-destructive">{errors.emergencyContact.message}</p>}
                </div>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save"}
                </Button>
              </form>
            ) : (
              <div className="space-y-2 text-sm">
                <Row label="Phone" value={profile.phone} />
                <Row label="Address" value={profile.address} />
                <Row label="Emergency Contact" value={profile.emergencyContact} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DocumentSection
            nurseProfileId={profile.id}
            initialDocuments={profile.documents}
            documentTypes={[]}
            canEdit={false}
          />
        </CardContent>
      </Card>
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
