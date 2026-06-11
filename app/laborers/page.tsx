"use client"

import { useEffect, useState, useCallback } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { PlusIcon, EditIcon, HardHatIcon, PhoneIcon } from "lucide-react"
import Link from "next/link"
import { Modal } from "@/components/ui/modal"
import { FieldError } from "@/components/ui/field-error"
import { useInvalidate } from "@/lib/redux/hooks"

interface Laborer {
  id: number
  name: string
  mobile: string
  address?: string
  salary_type: string
  basic_salary: number
  overtime_rate: number
  joining_date?: string
  notes?: string
}

function LaborerDialog({ open, onClose, laborer, onSaved }: {
  open: boolean; onClose: () => void; laborer: Laborer | null; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: "", mobile: "", address: "", joining_date: "", salary_type: "Monthly",
    basic_salary: "", overtime_rate: "", notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const invalidateCache = useInvalidate()

  useEffect(() => {
    setErrors({})
    if (laborer) {
      setForm({
        name: laborer.name ?? "",
        mobile: laborer.mobile ?? "",
        address: laborer.address ?? "",
        joining_date: laborer.joining_date ? laborer.joining_date.split("T")[0] : "",
        salary_type: laborer.salary_type ?? "Monthly",
        basic_salary: String(laborer.basic_salary ?? ""),
        overtime_rate: String(laborer.overtime_rate ?? ""),
        notes: laborer.notes ?? "",
      })
    } else {
      setForm({ name: "", mobile: "", address: "", joining_date: "", salary_type: "Monthly", basic_salary: "", overtime_rate: "", notes: "" })
    }
  }, [laborer, open])

  const handleSave = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Laborer name is required"
    if (!form.basic_salary || parseFloat(form.basic_salary) <= 0)
      e.basic_salary = "Basic salary is required"
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSaving(true)
    try {
      const url = laborer ? `/api/laborers/${laborer.id}` : "/api/laborers"
      await fetch(url, {
        method: laborer ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, basic_salary: parseFloat(form.basic_salary), overtime_rate: parseFloat(form.overtime_rate) }),
      })
      invalidateCache("/api/laborers")
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">{laborer ? "Edit Laborer" : "Add Laborer"}</h2>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input
              value={form.name}
              aria-invalid={!!errors.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((p) => ({ ...p, name: "" })) }}
            />
            <FieldError msg={errors.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div><Label>Joining Date</Label><Input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} /></div>
          </div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Salary Type</Label>
              <Select value={form.salary_type} onValueChange={(v) => setForm({ ...form, salary_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Basic Salary (₹) *</Label>
              <Input
                type="number"
                value={form.basic_salary}
                aria-invalid={!!errors.basic_salary}
                onChange={(e) => { setForm({ ...form, basic_salary: e.target.value }); setErrors((p) => ({ ...p, basic_salary: "" })) }}
              />
              <FieldError msg={errors.basic_salary} />
            </div>
            <div><Label>OT Rate/hr (₹)</Label><Input type="number" value={form.overtime_rate} onChange={(e) => setForm({ ...form, overtime_rate: e.target.value })} /></div>
          </div>
          <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : laborer ? "Save Changes" : "Add Laborer"}</Button>
        </div>
    </Modal>
  )
}

export default function LaborersPage() {
  const [laborers, setLaborers] = useState<Laborer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Laborer | null>(null)

  const fetchLaborers = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/laborers")
    const data = await res.json()
    setLaborers(data.laborers ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLaborers() }, [fetchLaborers])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHatIcon className="size-5" />
            <h2 className="text-lg font-semibold">Laborers</h2>
            <Badge variant="outline">{laborers.length}</Badge>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <PlusIcon className="size-4 mr-1" /> Add Laborer
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : laborers.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center py-12 text-muted-foreground"><HardHatIcon className="size-12 mb-3 opacity-30" /><p>No laborers found</p></CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {laborers.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-lg border p-4">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {l.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/laborers/${l.id}`} className="font-medium hover:underline">{l.name}</Link>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {l.mobile && <span className="flex items-center gap-1"><PhoneIcon className="size-3" />{l.mobile}</span>}
                    <Badge variant="outline" className="text-xs">{l.salary_type}</Badge>
                    <span className="font-medium text-foreground">{fmt(l.basic_salary)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(l); setDialogOpen(true) }}>
                  <EditIcon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <LaborerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} laborer={editing} onSaved={fetchLaborers} />
    </MainLayout>
  )
}
