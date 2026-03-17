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
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

const schema = z.object({
  role: z.enum(["Admin", "Supervisor", "Nurse", "Management"]),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export interface UserRow {
  id: string
  email: string
  role: "Admin" | "Supervisor" | "Nurse" | "Management"
  isActive: boolean
}

interface Props {
  user: UserRow | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function EditUserModal({ user, open, onClose, onUpdated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (user) {
      reset({ role: user.role, isActive: user.isActive })
    }
  }, [user, reset])

  async function onSubmit(data: FormValues) {
    if (!user) return
    setServerError(null)
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json()
      setServerError(body.error ?? "Failed to update user")
      return
    }
    toast({ title: "User updated", description: `${user.email} updated successfully.` })
    onUpdated()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User — {user?.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="eu-role">Role</Label>
            <Select id="eu-role" {...register("role")}>
              <option value="Admin">Admin</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Nurse">Nurse</option>
              <option value="Management">Management</option>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-status">Status</Label>
            <Select
              id="eu-status"
              {...register("isActive", { setValueAs: (v) => v === "true" })}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
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
