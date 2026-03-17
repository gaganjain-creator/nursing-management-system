import { auth } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { NotificationBell } from "@/components/notifications/NotificationBell"

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  Admin: "default",
  Supervisor: "secondary",
  Nurse: "outline",
  Management: "secondary",
}

export async function Header() {
  const session = await auth()
  if (!session?.user) return null

  const { email, role } = session.user
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div />
      <div className="flex items-center gap-3">
        <NotificationBell />
        <Badge variant={roleColors[role] ?? "outline"}>{role}</Badge>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm text-muted-foreground sm:block">{email}</span>
      </div>
    </header>
  )
}
