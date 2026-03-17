"use client"

import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Pencil, Trash2, Plus } from "lucide-react"

interface DocumentType {
  id: string
  name: string
  defaultExpiryDays: number
  alertLeadDays: number
}

const schema = z.object({
  name: z.string().min(1, "Required"),
  defaultExpiryDays: z.coerce.number().int().min(1, "Min 1 day"),
  alertLeadDays: z.coerce.number().int().min(1, "Min 1 day"),
})
type FormValues = z.infer<typeof schema>

export function DocumentTypesClient() {
  const [types, setTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DocumentType | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<FormValues>({ resolver: zodResolver(schema) as any })

  const fetchTypes = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/document-types", { cache: "no-store" })
    if (res.ok) setTypes(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchTypes() }, [fetchTypes])

  function openCreate() {
    setEditing(null)
    reset({ name: "", defaultExpiryDays: 365, alertLeadDays: 30 })
    setServerError(null)
    setDialogOpen(true)
  }

  function openEdit(dt: DocumentType) {
    setEditing(dt)
    reset({ name: dt.name, defaultExpiryDays: dt.defaultExpiryDays, alertLeadDays: dt.alertLeadDays })
    setServerError(null)
    setDialogOpen(true)
  }

  async function onSubmit(data: FormValues) {
    setServerError(null)
    const url = editing ? `/api/document-types/${editing.id}` : "/api/document-types"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json()
      setServerError(body.error ?? "Failed to save")
      return
    }
    toast({ title: editing ? "Document type updated" : "Document type created" })
    setDialogOpen(false)
    fetchTypes()
  }

  async function handleDelete(dt: DocumentType) {
    if (!confirm(`Delete "${dt.name}"? Documents of this type will lose their type reference.`)) return
    const res = await fetch(`/api/document-types/${dt.id}`, { method: "DELETE" })
    if (!res.ok) {
      toast({ title: "Delete failed", variant: "destructive" })
      return
    }
    toast({ title: `"${dt.name}" deleted` })
    fetchTypes()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Document Types</h1>
          <p className="text-sm text-muted-foreground">Manage compliance document categories</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Document Type
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default Expiry (days)</TableHead>
                <TableHead>Alert Lead (days)</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((dt) => (
                <TableRow key={dt.id}>
                  <TableCell className="font-medium">{dt.name}</TableCell>
                  <TableCell>{dt.defaultExpiryDays}</TableCell>
                  <TableCell>{dt.alertLeadDays}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(dt)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(dt)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {types.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No document types configured.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Document Type" : "New Document Type"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="dt-name">Name</Label>
              <Input id="dt-name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dt-expiry">Default Expiry Days</Label>
              <Input id="dt-expiry" type="number" min={1} {...register("defaultExpiryDays")} />
              {errors.defaultExpiryDays && <p className="text-xs text-destructive">{errors.defaultExpiryDays.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dt-alert">Alert Lead Days</Label>
              <Input id="dt-alert" type="number" min={1} {...register("alertLeadDays")} />
              {errors.alertLeadDays && <p className="text-xs text-destructive">{errors.alertLeadDays.message}</p>}
            </div>
            {serverError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : editing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
