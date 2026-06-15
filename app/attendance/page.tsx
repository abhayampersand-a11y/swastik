"use client"

import { useEffect, useMemo, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ClipboardListIcon, SaveIcon } from "lucide-react"
import { NoticeDialog } from "@/components/ui/modal"
import { useCachedApi } from "@/lib/redux/hooks"

interface Laborer { id: number; name: string }
interface AttendanceRecord {
  laborer_id: number
  laborer_name: string
  status: string
  overtime_hours: number
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function AttendancePage() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split("T")[0])
  const { data: laborersData } = useCachedApi<{ laborers: Laborer[] }>("/api/laborers")
  const laborers = useMemo(() => laborersData?.laborers ?? [], [laborersData])
  const [attendance, setAttendance] = useState<Record<number, AttendanceRecord>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    if (!selectedDate || laborers.length === 0) return
    setLoading(true)
    fetch(`/api/attendance?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => {
        // Map saved records for this date by laborer_id
        const saved: Record<number, AttendanceRecord> = {}
        for (const a of (d.attendance ?? []) as Array<{ laborer_id: number; laborer_name: string; status: string; overtime_hours: number }>) {
          saved[a.laborer_id] = {
            laborer_id: a.laborer_id,
            laborer_name: a.laborer_name,
            status: a.status,
            overtime_hours: Number(a.overtime_hours) || 0,
          }
        }
        // Use saved record where present, otherwise default to Present
        const init: Record<number, AttendanceRecord> = {}
        laborers.forEach((l) => {
          init[l.id] = saved[l.id] ?? { laborer_id: l.id, laborer_name: l.name, status: "Present", overtime_hours: 0 }
        })
        setAttendance(init)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedDate, laborers])

  const updateStatus = (laborer_id: number, field: string, value: string | number) => {
    setAttendance((prev) => ({
      ...prev,
      [laborer_id]: { ...prev[laborer_id], [field]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const records = Object.values(attendance).map((a) => ({
      laborer_id: a.laborer_id,
      attendance_date: selectedDate,
      status: a.status,
      overtime_hours: a.overtime_hours,
    }))
    await fetch("/api/attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    })
    setSaving(false)
    setSavedNotice(true)
  }

  const statusColor: Record<string, string> = {
    Present: "default", Absent: "destructive", "Half Day": "secondary",
  }

  const summary = {
    present: Object.values(attendance).filter((a) => a.status === "Present").length,
    absent: Object.values(attendance).filter((a) => a.status === "Absent").length,
    halfDay: Object.values(attendance).filter((a) => a.status === "Half Day").length,
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardListIcon className="size-5" />
            <h2 className="text-lg font-semibold">Attendance</h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm bg-background"
            />
            <Button onClick={handleSave} disabled={saving || laborers.length === 0}>
              <SaveIcon className="size-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-600">{summary.present}</div><div className="text-xs text-muted-foreground">Present</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-red-500">{summary.absent}</div><div className="text-xs text-muted-foreground">Absent</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-yellow-500">{summary.halfDay}</div><div className="text-xs text-muted-foreground">Half Day</div></CardContent></Card>
        </div>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mark Attendance for {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || laborers.length === 0 ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-2">
                {laborers.map((l) => {
                  const rec = attendance[l.id]
                  return (
                    <div key={l.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {l.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 font-medium text-sm">{l.name}</div>
                      <Select
                        value={rec?.status ?? "Present"}
                        onValueChange={(v) => updateStatus(l.id, "status", v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Present">Present</SelectItem>
                          <SelectItem value="Absent">Absent</SelectItem>
                          <SelectItem value="Half Day">Half Day</SelectItem>
                        </SelectContent>
                      </Select>
                      {rec?.status === "Present" && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-xs text-muted-foreground">OT hrs:</span>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={rec.overtime_hours}
                            onChange={(e) => updateStatus(l.id, "overtime_hours", parseFloat(e.target.value) || 0)}
                            className="w-16 rounded border px-2 py-1 text-sm bg-background"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NoticeDialog
        open={savedNotice}
        title="Attendance saved!"
        description={`Attendance for ${new Date(selectedDate).toLocaleDateString("en-IN")} has been recorded.`}
        variant="success"
        onClose={() => setSavedNotice(false)}
      />
    </MainLayout>
  )
}
