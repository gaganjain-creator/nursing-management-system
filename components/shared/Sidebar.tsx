"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserCircle,
  ShieldCheck,
  CalendarDays,
  Settings,
  ClipboardList,
  FileText,
  Clock,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Role } from "@prisma/client"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navByRole: Record<Role, NavItem[]> = {
  Admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Nurse Profiles", href: "/admin/nurse-profiles", icon: UserCircle },
    { label: "Compliance", href: "/admin/compliance", icon: ShieldCheck },
    { label: "Scheduling", href: "/admin/scheduling", icon: CalendarDays },
    { label: "Settings", href: "/admin/settings", icon: Settings },
    { label: "Audit Log", href: "/admin/audit-log", icon: ClipboardList },
  ],
  Supervisor: [
    { label: "Dashboard", href: "/supervisor", icon: LayoutDashboard },
    { label: "Nurse Profiles", href: "/supervisor/nurse-profiles", icon: UserCircle },
    { label: "Compliance", href: "/supervisor/compliance", icon: ShieldCheck },
    { label: "Scheduling", href: "/supervisor/scheduling", icon: CalendarDays },
    { label: "Requests", href: "/supervisor/requests", icon: FileText },
  ],
  Nurse: [
    { label: "My Dashboard", href: "/nurse", icon: LayoutDashboard },
    { label: "My Shifts", href: "/nurse/shifts", icon: Clock },
    { label: "Availability", href: "/nurse/availability", icon: CalendarDays },
    { label: "My Documents", href: "/nurse/documents", icon: FileText },
    { label: "Requests", href: "/nurse/requests", icon: ClipboardList },
  ],
  Management: [
    { label: "Dashboard", href: "/management", icon: LayoutDashboard },
    { label: "Reports", href: "/management/reports", icon: BarChart3 },
  ],
}

interface SidebarProps {
  role: Role
  userEmail: string
}

export function Sidebar({ role, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const navItems = navByRole[role] ?? []

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">
            NMS Platform
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === `/${role.toLowerCase()}`
                ? pathname === item.href
                : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer: user info + sign out */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <p className="mb-2 truncate px-1 text-xs text-sidebar-foreground/50">
            {userEmail}
          </p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
