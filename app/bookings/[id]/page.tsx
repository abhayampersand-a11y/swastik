"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon, PhoneIcon, MapPinIcon, PlusIcon } from "lucide-react"

const STATUS_LIST = ["Inquiry", "Estimated", "Confirmed", "Running", "Completed", "Closed", "Cancelled"]
const statusColor: Record<string, string> = {
  Inquiry: "secondary", Estimated: "outline", Confirmed: "default",
  Running: "default", Completed: "secondary", Closed: "secondary", Cancelled: "destructive",
}

export default function BookingDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payForm, setPayForm] = useState({ amount: "", method: "Cash", notes: "", date: new Date().toISOString().split("T")[0] })
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchData = async () => {
    const res = await fetch(`/api/bookings/${id}`)
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true)
    const booking = data?.booking as Record<string, unknown>
    await fetch(`/api/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...booking, status: newStatus }),
    })
    fetchData()
    setUpdatingStatus(false)
  }

  const handleAddPayment = async () => {
    const booking = data?.booking as Record<string, unknown>
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: id,
        customer_id: booking.customer_id,
        payment_date: payForm.date,
        payment_method: payForm.method,
        amount: parseFloat(payForm.amount),
        notes: payForm.notes,
      }),
    })
    setPaymentOpen(false)
    setPayForm({ amount: "", method: "Cash", notes: "", date: new Date().toISOString().split("T")[0] })
    fetchData()
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </MainLayout>
    )
  }

  const booking = data?.booking as Record<string, number & string>
  const items = (data?.items as Record<string, unknown>[]) ?? []
  const payments = (data?.payments as Record<string, unknown>[]) ?? []

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold">{booking.event_name}</h2>
              <Badge variant={(statusColor[booking.status] as "default" | "secondary" | "outline" | "destructive") ?? "outline"}>
                {booking.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{booking.booking_number}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>Back</Button>
            <Button onClick={() => setPaymentOpen(true)}>
              <PlusIcon className="size-4 mr-1" /> Add Payment
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Customer & Event Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Event Information</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium text-base">{booking.customer_name}</div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <PhoneIcon className="size-3.5" /> {booking.customer_mobile}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="size-3.5" />
                Event: {new Date(booking.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
              {booking.setup_date && (
                <div className="text-muted-foreground">Setup: {new Date(booking.setup_date).toLocaleDateString("en-IN")}</div>
              )}
              {booking.return_date && (
                <div className="text-muted-foreground">Return: {new Date(booking.return_date).toLocaleDateString("en-IN")}</div>
              )}
              {booking.venue_address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPinIcon className="size-3.5 mt-0.5 shrink-0" /> {booking.venue_address}
                </div>
              )}
              {booking.notes && <div className="text-muted-foreground italic">{booking.notes}</div>}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">Financial Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmt(booking.subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>− {fmt(booking.discount)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST ({booking.gst_percent}%)</span><span>{fmt(booking.gst_amount)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>{fmt(booking.total_amount)}</span></div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{fmt(booking.advance_paid)}</span></div>
              <div className={`flex justify-between font-semibold ${booking.remaining_balance > 0 ? "text-red-500" : "text-green-600"}`}>
                <span>Balance</span><span>{fmt(booking.remaining_balance)}</span>
              </div>

              <div className="pt-2">
                <Label className="text-xs">Change Status</Label>
                <Select value={booking.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader><CardTitle className="text-base">Booked Items</CardTitle></CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2">{item.item_name as string} <span className="text-muted-foreground text-xs">({item.unit_type as string})</span></td>
                      <td className="py-2 text-right">{item.quantity as number}</td>
                      <td className="py-2 text-right">{fmt(item.rental_rate as number)}</td>
                      <td className="py-2 text-right font-medium">{fmt(item.amount as number)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b pb-2">
                    <div>
                      <div className="font-medium">{fmt(p.amount as number)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.payment_date as string).toLocaleDateString("en-IN")} · {p.payment_method as string}
                      </div>
                    </div>
                    {Boolean(p.notes) && <div className="text-xs text-muted-foreground">{String(p.notes)}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Add Payment</h2>
            <div className="space-y-3">
              <div>
                <Label>Amount (₹) *</Label>
                <Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
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
                <Input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <Button onClick={handleAddPayment} disabled={!payForm.amount}>Add Payment</Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
