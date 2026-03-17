"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateUserModal } from "@/components/users/CreateUserModal"
import { EditUserModal, type UserRow } from "@/components/users/EditUserModal"
import { formatDateTime } from "@/lib/utils"
import { UserPlus, Pencil } from "lucide-react"

interface UserWithProfile extends UserRow {
  lastLoginAt: string | null
  createdAt: string
  nurseProfile: { id: string } | null
}

const roleColor: Record<string, "default" | "secondary" | "outline"> = {
  Admin: "default",
  Supervisor: "secondary",
  Nurse: "outline",
  Management: "outline",
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/users", { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Error ${res.status}`)
        return
      }
      setUsers(await res.json())
    } catch {
      setError("Failed to load users. Please refresh.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">User Management</h1>
          <p className="text-sm text-muted-foreground">{users.length} user(s) total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {!loading && !error && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleColor[user.role] ?? "outline"}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "success" : "destructive"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLoginAt ? formatDateTime(new Date(user.lastLoginAt)) : "Never"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(new Date(user.createdAt))}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditUser({
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        isActive: user.isActive,
                      })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchUsers}
      />
      <EditUserModal
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onUpdated={fetchUsers}
      />
    </div>
  )
}
