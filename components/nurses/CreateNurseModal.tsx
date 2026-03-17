"use client"

import { useState } from "react"
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
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "At least 8 characters"),
  fullName: z.string().min(1, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  emergencyContact: z.string().min(1, "Required"),
  specialisation: z.string().optional(),
  licenseNumber: z.string().min(1, "Required"),
  employmentType: z.enum(["FullTime", "PartTime", "Agency"]),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateNurseModal({ open, onClose, onCreated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employmentType: "FullTime" },
  })

  async function onSubmit(data: FormValues) {
    setServerError(null)
    const res = await fetch("/api/nurse-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json()
      setServerError(body.error ?? "Failed to create nurse profile")
      return
    }
    toast({ title: "Nurse profile created", description: `Profile for ${data.fullName} created.` })
    reset()
    onCreated()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Nurse Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cn-email">Email</Label>
              <Input id="cn-email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-password">Temporary Password</Label>
              <Input id="cn-password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-fullName">Full Name</Label>
              <Input id="cn-fullName" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-dob">Date of Birth</Label>
              <Input id="cn-dob" type="date" {...register("dateOfBirth")} />
              {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-phone">Phone</Label>
              <Input id="cn-phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-license">License Number</Label>
              <Input id="cn-license" {...register("licenseNumber")} />
              {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber.message}</p>}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cn-address">Address</Label>
              <Input id="cn-address" {...register("address")} />
              {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cn-emergency">Emergency Contact</Label>
              <Input id="cn-emergency" placeholder="Name — Phone" {...register("emergencyContact")} />
              {errors.emergencyContact && <p className="text-xs text-destructive">{errors.emergencyContact.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-spec">Specialisation</Label>
              <Input id="cn-spec" placeholder="e.g. Critical Care" {...register("specialisation")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-empType">Employment Type</Label>
              <Select id="cn-empType" {...register("employmentType")}>
                <option value="FullTime">Full Time</option>
                <option value="PartTime">Part Time</option>
                <option value="Agency">Agency</option>
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
              {isSubmitting ? "Creating…" : "Create Nurse Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
