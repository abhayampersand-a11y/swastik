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
import { BanknoteIcon, Calculator, CheckCircleIcon, HandCoinsIcon } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { FieldError } from "@/components/ui/field-error"
import { useCachedApi } from "@/lib/redux/hooks"

interface Laborer { id: number; name: string; salary_type: string; basic_salary: number }
interface Advance {
  id: number
  laborer_id: number
  amount: number
  pending_amount: number
  monthly_deduction: number | null
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
  const [advForm, setAdvForm] = useState({
    amount: "",
    monthly_deduction: "",
    reason: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [advError, setAdvError] = useState("")

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

  const salaryMap = Object.fromEntries(salaries.map((s) => [s.laborer_id, s]))

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
              return (
                <Card key={l.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-muted-foreground">{l.salary_type} · {fmt(l.basic_salary)}/mo</div>
                        {pendingAdv > 0 && (
                          <div className="mt-1 text-xs font-medium text-orange-600">
                            Advance pending: {fmt(pendingAdv)}
                          </div>
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
    </MainLayout>
  )
}
