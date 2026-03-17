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
  role: z.enum(["Admin", "Supervisor", "Nurse", "Management"]),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateUserModal({ open, onClose, onCreated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "Nurse" },
  })

  async function onSubmit(data: FormValues) {
    setServerError(null)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json()
      setServerError(body.error ?? "Failed to create user")
      return
    }
    toast({ title: "User created", description: `Account for ${data.email} created.` })
    reset()
    onCreated()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" placeholder="user@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Temporary Password</Label>
            <Input id="cu-password" type="password" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role</Label>
            <Select id="cu-role" {...register("role")}>
              <option value="Admin">Admin</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Nurse">Nurse</option>
              <option value="Management">Management</option>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
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
              {isSubmitting ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
