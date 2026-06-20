"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeftIcon, PhoneIcon, CalendarDaysIcon, ClockIcon,
} from "lucide-react"
import Link from "next/link"

interface Laborer {
  id: number
  name: string
  mobile?: string
  address?: string
  salary_type: string
  basic_salary: number
  overtime_rate: number
  joining_date?: string
  is_active: boolean
}
interface AttendanceDay {
  attendance_date: string
  status: string
  overtime_hours: string
  work_hours: string | null
  notes: string | null
}
interface Summary {
  present: string
  absent: string
  half_days: string
  total_work_hours: string
  total_overtime: string
}
interface Salary {
  id: number
  month: number
  year: number
  net_salary: number
  days_present: number
  days_absent: number
  half_days: number
  overtime_hours: number
  status: string
}
interface Advance {
  id: number
  advance_date: string
  amount: number
  reason: string | null
  is_recovered: boolean
}

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS_FULL = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const statusBadge: Record<string, "default" | "secondary" | "destructive"> = {
  Present: "default", "Half Day": "secondary", Absent: "destructive",
}
const statusCell: Record<string, string> = {
  Present: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  "Half Day": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  Absent: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
}

export default function LaborerDetailPage() {
  const { id } = useParams()
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [laborer, setLaborer] = useState<Laborer | null>(null)
  const [attendance, setAttendance] = useState<AttendanceDay[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [advances, setAdvances] = useState<Advance[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/laborers/${id}?month=${month}&year=${year}`)
    const d = await res.json()
    setLaborer(d.laborer ?? null)
    setAttendance(d.attendance ?? [])
    setSummary(d.summary ?? null)
    setSalaries(d.salaries ?? [])
    setAdvances(d.advances ?? [])
    setLoading(false)
  }, [id, month, year])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  // Index attendance by day-of-month for the calendar grid.
  const byDay: Record<number, AttendanceDay> = {}
  for (const a of attendance) byDay[new Date(a.attendance_date).getDate()] = a

  const y = parseInt(year), m = parseInt(month)
  const daysInMonth = new Date(y, m, 0).getDate()
  const firstWeekday = new Date(y, m - 1, 1).getDay()
  const calCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  if (loading && !laborer) {
    return (
      <MainLayout>
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </MainLayout>
    )
  }

  if (!laborer) {
    return (
      <MainLayout>
        <div className="p-6 text-center text-muted-foreground">
          <p>Laborer not found.</p>
          <Link href="/laborers" className="text-primary hover:underline">Back to laborers</Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/laborers">
            <Button variant="ghost" size="icon"><ArrowLeftIcon className="size-4" /></Button>
          </Link>
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
            {laborer.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{laborer.name}</h2>
              <Badge variant="outline">{laborer.salary_type}</Badge>
              {!laborer.is_active && <Badge variant="destructive">Inactive</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
              {laborer.mobile && <span className="flex items-center gap-1"><PhoneIcon className="size-3" />{laborer.mobile}</span>}
              <span className="font-medium text-foreground">{fmt(laborer.basic_salary)}{laborer.salary_type === "Daily" ? "/day" : "/mo"}</span>
              <span>OT: {fmt(laborer.overtime_rate)}/hr</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_FULL.slice(1).map((mn, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{mn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026"].map((yr) => <SelectItem key={yr} value={yr}>{yr}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Monthly summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-600">{summary?.present ?? 0}</div><div className="text-xs text-muted-foreground">Present</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-red-500">{summary?.absent ?? 0}</div><div className="text-xs text-muted-foreground">Leave / Absent</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-yellow-500">{summary?.half_days ?? 0}</div><div className="text-xs text-muted-foreground">Half Day</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{Number(summary?.total_work_hours ?? 0)}</div><div className="text-xs text-muted-foreground">Work Hrs</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-600">{Number(summary?.total_overtime ?? 0)}</div><div className="text-xs text-muted-foreground">OT Hrs</div></CardContent></Card>
        </div>

        {/* Monthly calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDaysIcon className="size-4" /> {MONTHS_FULL[m]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-xs font-medium text-muted-foreground py-1">{w}</div>
              ))}
              {calCells.map((day, i) => {
                if (day === null) return <div key={`e${i}`} />
                const rec = byDay[day]
                return (
                  <div
                    key={day}
                    title={rec ? `${rec.status}${Number(rec.overtime_hours) > 0 ? ` · OT ${rec.overtime_hours}h` : ""}` : "Not marked"}
                    className={`relative aspect-square rounded-md flex items-center justify-center text-sm ${rec ? statusCell[rec.status] ?? "bg-muted" : "bg-muted/40 text-muted-foreground"}`}
                  >
                    {day}
                    {rec && Number(rec.overtime_hours) > 0 && (
                      <span className="absolute bottom-0.5 right-1 size-1.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-3 rounded bg-green-100 dark:bg-green-950" /> Present</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded bg-yellow-100 dark:bg-yellow-950" /> Half Day</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded bg-red-100 dark:bg-red-950" /> Leave</span>
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-blue-600" /> Overtime</span>
            </div>
          </CardContent>
        </Card>

        {/* Daily breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClockIcon className="size-4" /> Daily Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No attendance recorded for this month.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Day</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Work Hrs</th>
                      <th className="text-right p-3 font-medium">OT Hrs</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {attendance.map((a) => {
                      const d = new Date(a.attendance_date)
                      return (
                        <tr key={a.attendance_date} className="hover:bg-muted/30">
                          <td className="p-3">{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                          <td className="p-3 text-muted-foreground">{d.toLocaleDateString("en-IN", { weekday: "short" })}</td>
                          <td className="p-3"><Badge variant={statusBadge[a.status] ?? "secondary"} className="text-xs">{a.status}</Badge></td>
                          <td className="p-3 text-right">{a.work_hours != null ? Number(a.work_hours) : "—"}</td>
                          <td className="p-3 text-right">{Number(a.overtime_hours) > 0 ? <span className="text-blue-600 font-medium">{Number(a.overtime_hours)}</span> : "—"}</td>
                          <td className="p-3 hidden md:table-cell text-muted-foreground">{a.notes ?? ""}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary history + Advances */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Salary History</CardTitle></CardHeader>
            <CardContent>
              {salaries.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No salary records.</p>
              ) : (
                <div className="space-y-2">
                  {salaries.slice(0, 12).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <span className="font-medium">{MONTHS[s.month]} {s.year}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          P{s.days_present} · A{s.days_absent} · H{s.half_days} · OT {s.overtime_hours}h
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{fmt(s.net_salary)}</span>
                        <Badge variant={s.status === "Paid" ? "default" : "secondary"} className="text-xs">{s.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Advances</CardTitle></CardHeader>
            <CardContent>
              {advances.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No advances.</p>
              ) : (
                <div className="space-y-2">
                  {advances.slice(0, 12).map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <span className="font-medium">{fmt(a.amount)}</span>
                        {a.reason && <span className="ml-2 text-xs text-muted-foreground">{a.reason}</span>}
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.advance_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <Badge variant={a.is_recovered ? "secondary" : "outline"} className="text-xs">
                        {a.is_recovered ? "Recovered" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
