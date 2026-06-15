"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"
import { FieldError } from "@/components/ui/field-error"
import { CreditCardIcon, PencilIcon } from "lucide-react"
import Link from "next/link"

interface Payment {
  id: number
  booking_id: number
  booking_number: string
  customer_name: string
  payment_date: string
  payment_method: string
  amount: number
  notes?: string
}

const PAGE_SIZE = 10

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [editOpen, setEditOpen] = useState(false)
  const [editPay, setEditPay] = useState<Payment | null>(null)
  const [editForm, setEditForm] = useState({ amount: "", method: "Cash", notes: "", date: "" })
  const [editError, setEditError] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchPayments = () => {
    setLoading(true)
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => {
        setPayments(d.payments ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { fetchPayments() }, [])

  const openEdit = (p: Payment) => {
    setEditPay(p)
    setEditForm({
      amount: String(p.amount),
      method: p.payment_method,
      notes: p.notes ?? "",
      date: p.payment_date.split("T")[0],
    })
    setEditError("")
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      setEditError("Please enter a valid amount")
      return
    }
    setSaving(true)
    await fetch(`/api/payments/${editPay!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_date: editForm.date,
        payment_method: editForm.method,
        amount: parseFloat(editForm.amount),
        notes: editForm.notes,
      }),
    })
    setSaving(false)
    setEditOpen(false)
    fetchPayments()
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  const methodColor: Record<string, string> = {
    Cash: "secondary",
    UPI: "default",
    "Bank Transfer": "outline",
    Cheque: "outline",
  }

  const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const totalPages = Math.ceil(payments.length / PAGE_SIZE)
  const paged = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="size-5" />
            <h2 className="text-lg font-semibold">Payments</h2>
            <Badge variant="outline">{fmt(total)}</Badge>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : payments.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center py-12 text-muted-foreground"><CreditCardIcon className="size-12 mb-3 opacity-30" /><p>No payments recorded</p></CardContent></Card>
        ) : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Customer</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">Booking</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Method</th>
                    <th className="text-right p-3 font-medium">Amount</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paged.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                      <td className="p-3 font-medium">{p.customer_name}</td>
                      <td className="p-3 hidden sm:table-cell">
                        <Link href={`/bookings/${p.booking_id}`} className="text-primary hover:underline text-xs font-mono">
                          {p.booking_number}
                        </Link>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge variant={(methodColor[p.payment_method] as "default" | "secondary" | "outline") ?? "outline"} className="text-xs">
                          {p.payment_method}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-semibold">{fmt(p.amount)}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(p)}>
                          <PencilIcon className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50 font-semibold">
                  <tr>
                    <td colSpan={4} className="p-3">Total Received</td>
                    <td className="p-3 text-right text-green-600">{fmt(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, payments.length)} of {payments.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                    Previous
                  </Button>
                  <span className="px-2">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} className="space-y-4">
        <h2 className="text-lg font-semibold">Edit Payment</h2>
        <div className="space-y-3">
          <div>
            <Label>Amount (₹) *</Label>
            <Input
              type="number"
              value={editForm.amount}
              aria-invalid={!!editError}
              onChange={(e) => { setEditForm({ ...editForm, amount: e.target.value }); setEditError("") }}
            />
            <FieldError msg={editError} />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={editForm.method} onValueChange={(v) => setEditForm({ ...editForm, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Cash", "UPI", "Bank Transfer", "Cheque"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </Modal>
    </MainLayout>
  )
}
