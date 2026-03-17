"use client"

import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import type { Role } from "@prisma/client"

interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  user: { email: string; role: Role }
}

interface AuditLogClientProps {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
  entityTypeFilter: string
  actionFilter: string
}

const actionVariant: Record<string, "destructive" | "warning" | "success" | "outline"> = {
  CREATE: "success",
  UPDATE: "warning",
  DELETE: "destructive",
  ASSIGN: "outline",
  UNASSIGN: "outline",
  REVIEW: "outline",
}

export function AuditLogClient({ logs, total, page, limit, entityTypeFilter, actionFilter }: AuditLogClientProps) {
  const router = useRouter()

  function buildUrl(overrides: { page?: number; entityType?: string; action?: string }) {
    const params = new URLSearchParams()
    const et = overrides.entityType !== undefined ? overrides.entityType : entityTypeFilter
    const ac = overrides.action !== undefined ? overrides.action : actionFilter
    const pg = overrides.page ?? 1
    if (et) params.set("entityType", et)
    if (ac) params.set("action", ac)
    if (pg > 1) params.set("page", String(pg))
    const qs = params.toString()
    return `/admin/audit-log${qs ? `?${qs}` : ""}`
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={entityTypeFilter}
          onChange={(e) => router.push(buildUrl({ entityType: e.target.value }))}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All entity types</option>
          {["User", "NurseProfile", "Document", "Shift", "ShiftRequest"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => router.push(buildUrl({ action: e.target.value }))}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All actions</option>
          {["CREATE", "UPDATE", "DELETE", "ASSIGN", "UNASSIGN", "REVIEW"].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-muted-foreground self-center">
          {total} total entries
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          No audit log entries found.
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{log.user.email}</TableCell>
                  <TableCell>
                    <Badge variant={actionVariant[log.action] ?? "outline"}>{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{log.entityType}</span>
                    <span className="ml-1 text-xs text-muted-foreground font-mono">
                      {log.entityId.slice(0, 8)}…
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {log.newValues && (
                      <pre className="text-xs text-muted-foreground truncate">
                        {JSON.stringify(log.newValues)}
                      </pre>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(buildUrl({ page: page - 1 }))}
              disabled={page <= 1}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => router.push(buildUrl({ page: page + 1 }))}
              disabled={page >= totalPages}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
