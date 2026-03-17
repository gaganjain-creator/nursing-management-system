"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface AvailabilityRecord {
  date: string
  isAvailable: boolean
}

interface AvailabilityCalendarProps {
  initialRecords: AvailabilityRecord[]
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function AvailabilityCalendar({ initialRecords }: AvailabilityCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [availability, setAvailability] = useState<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>()
    for (const r of initialRecords) {
      map.set(r.date.slice(0, 10), r.isAvailable)
    }
    return map
  })
  const [saving, setSaving] = useState<string | null>(null)

  const toKey = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

  const toggle = useCallback(async (day: number) => {
    const key = toKey(day)
    const current = availability.get(key) ?? true
    const next = !current
    setSaving(key)
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date(key).toISOString(), isAvailable: next }),
      })
      if (res.ok) {
        setAvailability((prev) => {
          const m = new Map(prev)
          m.set(key, next)
          return m
        })
      }
    } finally {
      setSaving(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability, year, month])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          ‹ Prev
        </button>
        <h2 className="text-base font-semibold">{MONTH_NAMES[month]} {year}</h2>
        <button
          onClick={nextMonth}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Next ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const key = toKey(day)
          const isAvail = availability.get(key) ?? true
          const isToday = key === todayKey
          const isPast = new Date(key) < new Date(todayKey)
          return (
            <button
              key={key}
              onClick={() => !isPast && toggle(day)}
              disabled={isPast || saving === key}
              title={isAvail ? "Available — click to mark unavailable" : "Unavailable — click to mark available"}
              className={cn(
                "rounded-md p-1.5 text-sm font-medium transition-colors relative",
                isPast
                  ? "opacity-40 cursor-default"
                  : isAvail
                  ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300",
                isToday && "ring-2 ring-primary"
              )}
            >
              {day}
              {saving === key && (
                <span className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60 text-xs">…</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-green-200 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-200 inline-block" /> Unavailable
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-2 ring-primary inline-block" /> Today
        </span>
      </div>
    </div>
  )
}
