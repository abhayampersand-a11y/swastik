"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BanknoteIcon, Calculator, CheckCircleIcon, HandCoinsIcon, ClockIcon, ReceiptTextIcon } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { FieldError } from "@/components/ui/field-error"
import { useCachedApi } from "@/lib/redux/hooks"

interface Laborer { id: number; name: string; salary_type: string; basic_salary: number }
interface Advance {
  id: number
  laborer_id: number
  advance_date: string
  amount: number
  pending_amount: number
  recovered_amount: number
  monthly_deduction: number | null
  reason: string | null
  is_recovered: boolean
}
interface Salary {
  id: number
  laborer_id: number
  laborer_name: string
  month: number
  year: number
  basic_salary: number
  overtime_amount: number
  advance_deduction: number
  other_deductions: number
  net_salary: number
  days_present: number
  status: string
  salary_type: string
}

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function SalaryPage() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const { data: laborersData } = useCachedApi<{ laborers: Laborer[] }>("/api/laborers")
  const laborers = laborersData?.laborers ?? []
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [advances, setAdvances] = useState<Advance[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState<number | null>(null)
  const [advanceFor, setAdvanceFor] = useState<Laborer | null>(null)
  const [historyFor, setHistoryFor] = useState<Laborer | null>(null)
  const [advForm, setAdvForm] = useState({
    amount: "",
    monthly_deduction: "",
    reason: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [advError, setAdvError] = useState("")

  // Configurable full-day / half-day hours (global, used by attendance auto-fill)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [hoursForm, setHoursForm] = useState({ full_day_hours: "", half_day_hours: "" })
  const [hoursError, setHoursError] = useState("")
  const [savingHours, setSavingHours] = useState(false)

  const openHours = async () => {
    setHoursError("")
    const res = await fetch("/api/salary/settings")
    const data = await res.json()
    setHoursForm({
      full_day_hours: String(data.settings?.full_day_hours ?? 8),
      half_day_hours: String(data.settings?.half_day_hours ?? 4),
    })
    setHoursOpen(true)
  }

  const saveHours = async () => {
    const full = parseFloat(hoursForm.full_day_hours)
    const half = parseFloat(hoursForm.half_day_hours)
    if (!(full > 0) || !(half > 0)) { setHoursError("Enter hours greater than 0"); return }
    if (half > full) { setHoursError("Half-day hours can't exceed full-day hours"); return }
    setSavingHours(true)
    try {
      const res = await fetch("/api/salary/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_day_hours: full, half_day_hours: half }),
      })
      const data = await res.json()
      if (!res.ok) { setHoursError(data.error ?? "Failed to save"); return }
      setHoursOpen(false)
    } finally { setSavingHours(false) }
  }

  const fetchAdvances = () =>
    fetch("/api/labor-advances").then((r) => r.json()).then((d) => setAdvances(d.advances ?? []))

  useEffect(() => {
    fetchAdvances()
  }, [])

  const fetchSalaries = async () => {
    setLoading(true)
    const res = await fetch(`/api/salary?month=${month}&year=${year}`)
    const data = await res.json()
    setSalaries(data.salaries ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSalaries() }, [month, year])

  const calculateSalary = async (laborer_id: number) => {
    setCalculating(laborer_id)
    await fetch("/api/salary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laborer_id, month: parseInt(month), year: parseInt(year) }),
    })
    await fetchSalaries()
    setCalculating(null)
  }

  const markPaid = async (salary_id: number) => {
    await fetch("/api/salary", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salary_id, payment_date: new Date().toISOString().split("T")[0] }),
    })
    fetchSalaries()
    fetchAdvances()
  }

  const giveAdvance = async () => {
    if (!advanceFor) return
    if (!advForm.amount || parseFloat(advForm.amount) <= 0) {
      setAdvError("Please enter a valid advance amount")
      return
    }
    await fetch("/api/labor-advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        laborer_id: advanceFor.id,
        advance_date: advForm.date,
        amount: parseFloat(advForm.amount),
        reason: advForm.reason,
        monthly_deduction: advForm.monthly_deduction,
      }),
    })
    setAdvanceFor(null)
    setAdvForm({ amount: "", monthly_deduction: "", reason: "", date: new Date().toISOString().split("T")[0] })
    fetchAdvances()
  }

  const calculateAll = async () => {
    for (const l of laborers) {
      await calculateSalary(l.id)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

  const salaryMap = Object.fromEntries(salaries.map((s) => [s.laborer_id, s]))

  // All advances for one laborer, newest first (API already sorts by date DESC).
  const advancesFor = (laborer_id: number) =>
    advances.filter((a) => a.laborer_id === laborer_id)

  const pendingAdvanceFor = (laborer_id: number) =>
    advances
      .filter((a) => a.laborer_id === laborer_id && !a.is_recovered)
      .reduce((sum, a) => sum + Number(a.pending_amount), 0)

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BanknoteIcon className="size-5" />
            <h2 className="text-lg font-semibold">Salary Management</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.slice(1).map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026"].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={openHours}>
              <ClockIcon className="size-4 mr-1" /> Work Hours
            </Button>
            <Button variant="outline" onClick={calculateAll}>
              <Calculator className="size-4 mr-1" /> Calculate All
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : (
          <div className="space-y-3">
            {laborers.map((l) => {
              const s = salaryMap[l.id]
              const pendingAdv = pendingAdvanceFor(l.id)
              const advCount = advancesFor(l.id).length
              return (
                <Card key={l.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-muted-foreground">{l.salary_type} · {fmt(l.basic_salary)}/mo</div>
                        {pendingAdv > 0 && (
                          <button
                            type="button"
                            onClick={() => setHistoryFor(l)}
                            className="mt-1 text-xs font-medium text-orange-600 underline-offset-2 hover:underline"
                          >
                            Advance pending: {fmt(pendingAdv)} — view details
                          </button>
                        )}
                      </div>
                      {s ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="text-sm text-muted-foreground">
                            <span>Basic: {fmt(s.basic_salary)}</span>
                            {s.overtime_amount > 0 && <span className="ml-2 text-green-600">+OT: {fmt(s.overtime_amount)}</span>}
                            {s.advance_deduction > 0 && <span className="ml-2 text-red-500">-Adv: {fmt(s.advance_deduction)}</span>}
                          </div>
                          <div className="font-semibold text-lg">{fmt(s.net_salary)}</div>
                          <Badge variant={s.status === "Paid" ? "default" : "secondary"}>{s.status}</Badge>
                          {advCount > 0 && (
                            <Button size="sm" variant="outline" onClick={() => setHistoryFor(l)}>
                              <ReceiptTextIcon className="size-3.5 mr-1" /> Advances ({advCount})
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setAdvanceFor(l)}>
                            <HandCoinsIcon className="size-3.5 mr-1" /> Advance
                          </Button>
                          {s.status !== "Paid" && (
                            <Button size="sm" onClick={() => markPaid(s.id)}>
                              <CheckCircleIcon className="size-3.5 mr-1" /> Mark Paid
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {advCount > 0 && (
                            <Button size="sm" variant="outline" onClick={() => setHistoryFor(l)}>
                              <ReceiptTextIcon className="size-3.5 mr-1" /> Advances ({advCount})
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setAdvanceFor(l)}>
                            <HandCoinsIcon className="size-3.5 mr-1" /> Advance
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => calculateSalary(l.id)}
                            disabled={calculating === l.id}
                          >
                            <Calculator className="size-3.5 mr-1" />
                            {calculating === l.id ? "Calculating..." : "Calculate"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Work Hours Settings Dialog */}
      <Modal open={hoursOpen} onClose={() => setHoursOpen(false)} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClockIcon className="size-4" /> Work Hours
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Standard hours used to auto-fill attendance. A full day = Present, half day = Half Day.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Full day hours *</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={hoursForm.full_day_hours}
              onChange={(e) => { setHoursForm({ ...hoursForm, full_day_hours: e.target.value }); setHoursError("") }}
              placeholder="e.g., 9"
            />
          </div>
          <div>
            <Label>Half day hours *</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={hoursForm.half_day_hours}
              onChange={(e) => { setHoursForm({ ...hoursForm, half_day_hours: e.target.value }); setHoursError("") }}
              placeholder="e.g., 5"
            />
          </div>
          <FieldError msg={hoursError} />
          <p className="text-xs text-muted-foreground">
            Note: this only auto-fills attendance hours. Salary is still calculated from days worked.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setHoursOpen(false)}>Cancel</Button>
          <Button onClick={saveHours} disabled={savingHours}>{savingHours ? "Saving..." : "Save"}</Button>
        </div>
      </Modal>

      {/* Give Advance Dialog */}
      <Modal open={!!advanceFor} onClose={() => setAdvanceFor(null)} className="space-y-4">
            <h2 className="text-lg font-semibold">Give Advance — {advanceFor?.name}</h2>
            <div className="space-y-3">
              <div>
                <Label>Advance Amount (₹) *</Label>
                <Input
                  type="number"
                  value={advForm.amount}
                  aria-invalid={!!advError}
                  onChange={(e) => { setAdvForm({ ...advForm, amount: e.target.value }); setAdvError("") }}
                  placeholder="e.g., 15000"
                />
                <FieldError msg={advError} />
              </div>
              <div>
                <Label>Recover Per Month (₹)</Label>
                <Input
                  type="number"
                  value={advForm.monthly_deduction}
                  onChange={(e) => setAdvForm({ ...advForm, monthly_deduction: e.target.value })}
                  placeholder="e.g., 5000 — leave empty for full recovery"
                />
                {advForm.amount && advForm.monthly_deduction && parseFloat(advForm.monthly_deduction) > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Will be recovered in {Math.ceil(parseFloat(advForm.amount) / parseFloat(advForm.monthly_deduction))} month(s)
                  </p>
                )}
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={advForm.date} onChange={(e) => setAdvForm({ ...advForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  value={advForm.reason}
                  onChange={(e) => setAdvForm({ ...advForm, reason: e.target.value })}
                  placeholder="e.g., Family emergency"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdvanceFor(null)}>Cancel</Button>
              <Button onClick={giveAdvance}>Give Advance</Button>
            </div>
      </Modal>

      {/* Advance History (date-wise, with reason) */}
      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} className="max-w-md space-y-4">
        {historyFor && (() => {
          const list = advancesFor(historyFor.id)
          const totalTaken = list.reduce((sum, a) => sum + Number(a.amount), 0)
          const totalPending = list.reduce((sum, a) => sum + Number(a.pending_amount), 0)
          return (
            <>
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ReceiptTextIcon className="size-4" /> Advance Details — {historyFor.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {list.length} advance{list.length === 1 ? "" : "s"} · Total taken {fmt(totalTaken)} ·
                  Pending {fmt(totalPending)}
                </p>
              </div>

              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">No advances recorded yet.</p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {list.map((a) => (
                    <div key={a.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{fmtDate(a.advance_date)}</span>
                        <span className="font-semibold">{fmt(Number(a.amount))}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">
                          Reason: {a.reason?.trim() ? a.reason : "—"}
                        </span>
                        {a.is_recovered ? (
                          <Badge variant="secondary">Recovered</Badge>
                        ) : (
                          <span className="font-medium text-orange-600">
                            Pending {fmt(Number(a.pending_amount))}
                          </span>
                        )}
                      </div>
                      {a.monthly_deduction != null && Number(a.monthly_deduction) > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Recovering {fmt(Number(a.monthly_deduction))}/month
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setHistoryFor(null)}>Close</Button>
              </div>
            </>
          )
        })()}
      </Modal>
    </MainLayout>
  )
}
