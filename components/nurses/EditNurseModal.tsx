"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

const schema = z.object({
  fullName: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  emergencyContact: z.string().min(1, "Required"),
  specialisation: z.string().optional(),
  licenseNumber: z.string().min(1, "Required"),
  employmentType: z.enum(["FullTime", "PartTime", "Agency"]),
  status: z.enum(["Active", "Inactive", "PendingReview"]),
})

type FormValues = z.infer<typeof schema>

export interface NurseProfileRow {
  id: string
  fullName: string
  phone: string
  address: string
  emergencyContact: string
  specialisation: string | null
  licenseNumber: string
  employmentType: "FullTime" | "PartTime" | "Agency"
  status: "Active" | "Inactive" | "PendingReview"
}

interface Props {
  profile: NurseProfileRow | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function EditNurseModal({ profile, open, onClose, onUpdated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        phone: profile.phone,
        address: profile.address,
        emergencyContact: profile.emergencyContact,
        specialisation: profile.specialisation ?? "",
        licenseNumber: profile.licenseNumber,
        employmentType: profile.employmentType,
        status: profile.status,
      })
    }
  }, [profile, reset])

  async function onSubmit(data: FormValues) {
    if (!profile) return
    setServerError(null)
    const res = await fetch(`/api/nurse-profiles/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json()
      setServerError(body.error ?? "Failed to update profile")
      return
    }
    toast({ title: "Profile updated", description: `${data.fullName}'s profile updated.` })
    onUpdated()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Nurse Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="en-fullName">Full Name</Label>
              <Input id="en-fullName" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="en-license">License Number</Label>
              <Input id="en-license" {...register("licenseNumber")} />
              {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="en-phone">Phone</Label>
              <Input id="en-phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="en-spec">Specialisation</Label>
              <Input id="en-spec" {...register("specialisation")} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="en-address">Address</Label>
              <Input id="en-address" {...register("address")} />
              {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="en-emergency">Emergency Contact</Label>
              <Input id="en-emergency" {...register("emergencyContact")} />
              {errors.emergencyContact && <p className="text-xs text-destructive">{errors.emergencyContact.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="en-empType">Employment Type</Label>
              <Select id="en-empType" {...register("employmentType")}>
                <option value="FullTime">Full Time</option>
                <option value="PartTime">Part Time</option>
                <option value="Agency">Agency</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="en-status">Status</Label>
              <Select id="en-status" {...register("status")}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="PendingReview">Pending Review</option>
              </Select>
            </div>
          </div>
          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
