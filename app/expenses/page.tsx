"use client"

import { useEffect, useState, useCallback } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { PlusIcon, Trash2Icon, TrendingDownIcon } from "lucide-react"

interface Expense {
  id: number
  expense_date: string
  category: string
  amount: number
  description?: string
}

const CATEGORIES = ["Diesel", "Transport", "Food", "Maintenance", "Decoration", "Labor", "Miscellaneous"]

function ExpenseDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    category: "Miscellaneous",
    amount: "",
    description: "",
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold">Add Expense</h2>
        <div className="space-y-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount (₹) *</Label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.amount}>{saving ? "Saving..." : "Add Expense"}</Button>
        </div>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const now = new Date()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<{ category: string; total: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [dialogOpen, setDialogOpen] = useState(false)

  const MONTHS_LIST = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/expenses?month=${month}&year=${year}`)
    const data = await res.json()
    setExpenses(data.expenses ?? [])
    setSummary(data.summary ?? [])
    setLoading(false)
  }, [month, year])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this expense?")) return
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" })
    fetchExpenses()
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingDownIcon className="size-5" />
            <h2 className="text-lg font-semibold">Expenses</h2>
            <Badge variant="outline">{fmt(total)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_LIST.slice(1).map((m, i) => (
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
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Category Summary */}
        {summary.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summary.map((s) => (
              <Card key={s.category}>
                <CardContent className="pt-3 pb-3">
                  <div className="text-xs text-muted-foreground">{s.category}</div>
                  <div className="font-semibold">{fmt(parseFloat(s.total))}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Expense List */}
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : expenses.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center py-12 text-muted-foreground"><TrendingDownIcon className="size-12 mb-3 opacity-30" /><p>No expenses for this period</p></CardContent></Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Description</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{new Date(e.expense_date).toLocaleDateString("en-IN")}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{e.category}</Badge></td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{e.description}</td>
                    <td className="p-3 text-right font-medium">{fmt(e.amount)}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => handleDelete(e.id)}>
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50 font-semibold">
                <tr>
                  <td colSpan={3} className="p-3">Total</td>
                  <td className="p-3 text-right">{fmt(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      <ExpenseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={fetchExpenses} />
    </MainLayout>
  )
}
