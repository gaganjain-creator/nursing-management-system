"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateNurseModal } from "@/components/nurses/CreateNurseModal"
import { UserPlus, Search } from "lucide-react"

interface NurseProfileSummary {
  id: string
  fullName: string
  specialisation: string | null
  licenseNumber: string
  employmentType: "FullTime" | "PartTime" | "Agency"
  status: "Active" | "Inactive" | "PendingReview"
  user: { email: string }
}

const statusVariant: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  Active: "success",
  Inactive: "destructive",
  PendingReview: "warning",
}

const empTypeLabel: Record<string, string> = {
  FullTime: "Full Time",
  PartTime: "Part Time",
  Agency: "Agency",
}

interface Props {
  basePath: string
  canCreate: boolean
}

export function NurseProfilesClient({ basePath, canCreate }: Props) {
  const [profiles, setProfiles] = useState<NurseProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [empFilter, setEmpFilter] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    if (empFilter) params.set("employmentType", empFilter)
    const res = await fetch(`/api/nurse-profiles?${params}`)
    if (res.ok) setProfiles(await res.json())
    setLoading(false)
  }, [search, statusFilter, empFilter])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Nurse Profiles</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} profile(s)</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Nurse Profile
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or specialisation…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="PendingReview">Pending Review</option>
        </Select>
        <Select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} className="w-40">
          <option value="">All types</option>
          <option value="FullTime">Full Time</option>
          <option value="PartTime">Part Time</option>
          <option value="Agency">Agency</option>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialisation</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Employment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`${basePath}/${p.id}`} className="font-medium hover:underline">
                      {p.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.user.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{p.specialisation ?? "—"}</TableCell>
                  <TableCell className="text-sm font-mono">{p.licenseNumber}</TableCell>
                  <TableCell className="text-sm">{empTypeLabel[p.employmentType]}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No nurse profiles found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateNurseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchProfiles}
      />
    </div>
  )
}
