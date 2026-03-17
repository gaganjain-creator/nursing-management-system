"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json() as Notification[]
        setNotifications(data)
      }
    } catch {
      // silent
    }
  }, [])

  // Poll every 45 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 45_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unread = notifications.filter((n) => !n.isRead)

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unread.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No notifications.
                </p>
              ) : (
                <ul>
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={cn(
                        "border-b px-4 py-3 last:border-0",
                        !n.isRead && "bg-muted/50"
                      )}
                    >
                      <p className={cn("text-sm font-medium", !n.isRead && "text-foreground")}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground/60">{formatDateTime(n.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
