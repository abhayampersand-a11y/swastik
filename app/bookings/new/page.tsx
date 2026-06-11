"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusIcon, Trash2Icon, AlertCircleIcon, CheckCircleIcon } from "lucide-react"
import { NoticeDialog } from "@/components/ui/modal"
import { FieldError } from "@/components/ui/field-error"
import { useCachedApi, useInvalidate } from "@/lib/redux/hooks"

interface InventoryItem {
  id: number
  name: string
  unit_type: string
  available_quantity: number
  rental_price: number
  category_name: string
}

interface Customer { id: number; name: string; mobile: string }

interface BookingItem {
  item_id: number
  item_name: string
  unit_type: string
  quantity: number
  days: number
  rental_rate: number
  discount: number
  amount: number
  availability?: { available: boolean; free_quantity: number; reason?: string } | null
}

const EVENT_TYPES = ["Wedding", "Engagement", "Reception", "Birthday", "Corporate", "Puja", "Other"]

export default function NewBookingPage() {
  const router = useRouter()
  const invalidateCache = useInvalidate()
  const { data: customersData } = useCachedApi<{ customers: Customer[] }>("/api/customers")
  const { data: inventoryData } = useCachedApi<{ items: InventoryItem[] }>("/api/inventory")
  const customers = customersData?.customers ?? []
  const inventoryItems = inventoryData?.items ?? []
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    customer_id: "",
    event_name: "",
    event_type: "Wedding",
    event_date: "",
    setup_date: "",
    return_date: "",
    venue_address: "",
    notes: "",
    discount: "0",
    gst_percent: "0",
  })

  const [items, setItems] = useState<BookingItem[]>([])
  const [warning, setWarning] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Default rental days from setup → return dates, else 1
  const defaultDays = () => {
    if (form.setup_date && form.return_date) {
      const diff = Math.round(
        (new Date(form.return_date).getTime() - new Date(form.setup_date).getTime()) / 86400_000
      )
      if (diff > 0) return diff
    }
    return 1
  }

  const addItem = () => {
    setItems([...items, { item_id: 0, item_name: "", unit_type: "Piece", quantity: 1, days: defaultDays(), rental_rate: 0, discount: 0, amount: 0, availability: null }])
  }

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

  const updateItem = async (idx: number, field: string, value: string | number) => {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }

    if (field === "item_id" && value) {
      const inv = inventoryItems.find((i) => i.id === Number(value))
      if (inv) {
        updated[idx].item_name = inv.name
        updated[idx].unit_type = inv.unit_type
        updated[idx].rental_rate = inv.rental_price
        updated[idx].availability = null
      }
    }

    // Recalculate amount
    const qty = updated[idx].quantity || 0
    const days = updated[idx].days || 1
    const rate = updated[idx].rental_rate || 0
    const disc = updated[idx].discount || 0
    updated[idx].amount = qty * rate * days - disc

    setItems(updated)

    // Check availability if date and item are set
    if ((field === "item_id" || field === "quantity") && form.event_date && updated[idx].item_id) {
      const res = await fetch("/api/inventory/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: updated[idx].item_id,
          quantity: updated[idx].quantity,
          event_date: form.event_date,
        }),
      })
      const avail = await res.json()
      updated[idx].availability = avail
      setItems([...updated])
    }
  }

  const subtotal = items.reduce((s, i) => s + i.amount, 0)
  const disc = parseFloat(form.discount) || 0
  const gst = ((subtotal - disc) * (parseFloat(form.gst_percent) || 0)) / 100
  const total = subtotal - disc + gst

  const handleSubmit = async () => {
    const e: Record<string, string> = {}
    if (!form.customer_id) e.customer_id = "Please select a customer"
    if (!form.event_name.trim()) e.event_name = "Event name is required"
    if (!form.event_date) e.event_date = "Event date is required"
    setErrors(e)
    if (Object.keys(e).length > 0) return

    if (items.some((i) => i.availability && !i.availability.available)) {
      setWarning("Some items have stock conflicts. Please fix before saving.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.filter((i) => i.item_id > 0),
        }),
      })
      const data = await res.json()
      if (data.booking) {
        // New booking changes booking lists and dashboard numbers
        invalidateCache("/api/bookings")
        invalidateCache("/api/dashboard")
        router.push(`/bookings/${data.booking.id}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Booking</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Customer & Event Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Customer *</Label>
                <Select value={form.customer_id} onValueChange={(v) => { setForm({ ...form, customer_id: v }); setErrors((p) => ({ ...p, customer_id: "" })) }}>
                  <SelectTrigger aria-invalid={!!errors.customer_id}><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name} · {c.mobile}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.customer_id} />
              </div>
              <div>
                <Label>Event Name *</Label>
                <Input
                  value={form.event_name}
                  aria-invalid={!!errors.event_name}
                  onChange={(e) => { setForm({ ...form, event_name: e.target.value }); setErrors((p) => ({ ...p, event_name: "" })) }}
                  placeholder="e.g., Sharma Wedding"
                />
                <FieldError msg={errors.event_name} />
              </div>
              <div>
                <Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Event Date *</Label>
                  <Input
                    type="date"
                    value={form.event_date}
                    aria-invalid={!!errors.event_date}
                    onChange={(e) => { setForm({ ...form, event_date: e.target.value }); setErrors((p) => ({ ...p, event_date: "" })) }}
                  />
                  <FieldError msg={errors.event_date} />
                </div>
                <div>
                  <Label>Setup Date</Label>
                  <Input type="date" value={form.setup_date} onChange={(e) => setForm({ ...form, setup_date: e.target.value })} />
                </div>
                <div>
                  <Label>Return Date</Label>
                  <Input type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Venue Address</Label>
                <Input value={form.venue_address} onChange={(e) => setForm({ ...form, venue_address: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount (₹)</Label>
                  <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                </div>
                <div>
                  <Label>GST %</Label>
                  <Input type="number" value={form.gst_percent} onChange={(e) => setForm({ ...form, gst_percent: e.target.value })} />
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>− {fmt(disc)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>GST ({form.gst_percent}%)</span><span>{fmt(gst)}</span></div>
                <div className="flex justify-between font-semibold text-base border-t pt-1.5"><span>Total</span><span>{fmt(total)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Inventory Items</CardTitle>
            <Button size="sm" variant="outline" onClick={addItem}>
              <PlusIcon className="size-4 mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No items added yet</p>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      <div className="col-span-2">
                        <Label className="text-xs">Item</Label>
                        <Select
                          value={String(item.item_id || "")}
                          onValueChange={(v) => updateItem(idx, "item_id", parseInt(v))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map((i) => (
                              <SelectItem key={i.id} value={String(i.id)}>
                                {i.name} ({i.available_quantity} avail)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Days</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.days}
                          onChange={(e) => updateItem(idx, "days", parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Rate (₹/day)</Label>
                        <Input
                          type="number"
                          value={item.rental_rate}
                          onChange={(e) => updateItem(idx, "rental_rate", parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.availability ? (
                          item.availability.available ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircleIcon className="size-3" /> Available ({item.availability.free_quantity} free)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                              <AlertCircleIcon className="size-3" /> {item.availability.reason}
                            </span>
                          )
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        {item.item_id > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {item.quantity} × {fmt(item.rental_rate)} × {item.days} day{item.days > 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-sm font-medium">{fmt(item.amount)}</span>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NoticeDialog
        open={!!warning}
        title="Cannot create booking"
        description={warning ?? ""}
        variant="warning"
        onClose={() => setWarning(null)}
      />
    </MainLayout>
  )
}
