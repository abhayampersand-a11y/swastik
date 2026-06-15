"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon, Trash2Icon, AlertCircleIcon, CheckCircleIcon, CalendarDaysIcon } from "lucide-react"
import { NoticeDialog } from "@/components/ui/modal"
import { fmtINR } from "@/lib/format"
import { useCachedApi, useInvalidate } from "@/lib/redux/hooks"

interface InventoryItem {
  id: number
  name: string
  unit_type: string
  available_quantity: number
  rental_price: number
}

interface Availability { available: boolean; free_quantity: number; reason?: string }

interface EditItem {
  item_id: number
  item_name: string
  unit_type: string
  quantity: number
  days: number
  rental_rate: number
  discount: number
  perDayMode: boolean
  perDay: Record<string, number> // "YYYY-MM-DD" -> qty
  availability?: Availability | null
}

// UTC-safe date helpers (match the seed/migration convention).
const toYMD = (d: unknown): string => {
  if (!d) return ""
  const s = typeof d === "string" ? d : new Date(d as string).toISOString()
  return s.slice(0, 10)
}
const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}
const rangeDates = (start: string, end: string): string[] => {
  if (!start) return []
  const out: string[] = []
  let cur = start
  const stop = end && end >= start ? end : start
  // guard against pathological ranges
  for (let i = 0; i < 60 && cur <= stop; i++) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

const lineAmount = (it: EditItem): number => {
  const rate = it.rental_rate || 0
  const gross = it.perDayMode
    ? Object.values(it.perDay).reduce((s, q) => s + (Number(q) || 0) * rate, 0)
    : (it.quantity || 0) * rate * (it.days || 1)
  return Math.round((gross - (it.discount || 0)) * 100) / 100
}
const peakQty = (it: EditItem): number =>
  it.perDayMode ? Math.max(0, ...Object.values(it.perDay).map((q) => Number(q) || 0)) : it.quantity || 0

export default function EditBookingPage() {
  const { id } = useParams()
  const router = useRouter()
  const invalidateCache = useInvalidate()
  const { data: inventoryData } = useCachedApi<{ items: InventoryItem[] }>("/api/inventory")
  const inventoryItems = inventoryData?.items ?? []

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null)
  const [items, setItems] = useState<EditItem[]>([])
  const [discount, setDiscount] = useState("0")
  const [gstPercent, setGstPercent] = useState("0")

  // Rental window — per-day grids span these dates.
  const dates = useMemo(() => {
    if (!booking) return []
    const setup = toYMD(booking.setup_date) || toYMD(booking.event_date)
    const ret = toYMD(booking.return_date) || toYMD(booking.event_date)
    return rangeDates(setup, ret)
  }, [booking])

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setBooking(d.booking)
        setDiscount(String(d.booking?.discount ?? 0))
        setGstPercent(String(d.booking?.gst_percent ?? 0))
        const loaded: EditItem[] = (d.items ?? []).map((it: Record<string, unknown>) => {
          const perDayRows = (it.per_day as { usage_date: string; quantity: number }[]) ?? []
          const perDay: Record<string, number> = {}
          perDayRows.forEach((p) => { perDay[p.usage_date] = p.quantity })
          return {
            item_id: it.item_id as number,
            item_name: it.item_name as string,
            unit_type: it.unit_type as string,
            quantity: it.quantity as number,
            days: (it.days as number) ?? 1,
            rental_rate: Number(it.rental_rate),
            discount: Number(it.discount ?? 0),
            perDayMode: perDayRows.length > 0,
            perDay,
            availability: null,
          }
        })
        setItems(loaded)
        setLoading(false)
      })
  }, [id])

  const checkAvail = async (next: EditItem[], idx: number) => {
    const it = next[idx]
    if (!it.item_id || dates.length === 0) return
    const res = await fetch("/api/inventory/check-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: it.item_id,
        quantity: peakQty(it),
        from: dates[0],
        to: dates[dates.length - 1],
        booking_id: Number(id), // exclude this booking's own current hold
      }),
    })
    const avail = await res.json()
    setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, availability: avail } : p)))
  }

  const update = (idx: number, patch: Partial<EditItem>) => {
    setItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const setItemId = (idx: number, value: number) => {
    const inv = inventoryItems.find((i) => i.id === value)
    const next = [...items]
    next[idx] = {
      ...next[idx],
      item_id: value,
      item_name: inv?.name ?? "",
      unit_type: inv?.unit_type ?? "Piece",
      rental_rate: inv?.rental_price ?? next[idx].rental_rate,
      availability: null,
    }
    setItems(next)
    checkAvail(next, idx)
  }

  const togglePerDay = (idx: number) => {
    const it = items[idx]
    if (!it.perDayMode) {
      // seed each day with the current flat quantity
      const perDay: Record<string, number> = {}
      dates.forEach((d) => { perDay[d] = it.quantity || 0 })
      update(idx, { perDayMode: true, perDay, days: dates.length })
    } else {
      update(idx, { perDayMode: false })
    }
  }

  const setPerDayQty = (idx: number, date: string, qty: number) => {
    const next = [...items]
    next[idx] = { ...next[idx], perDay: { ...next[idx].perDay, [date]: qty } }
    setItems(next)
  }

  const addItem = () =>
    setItems([...items, {
      item_id: 0, item_name: "", unit_type: "Piece", quantity: 1,
      days: dates.length || 1, rental_rate: 0, discount: 0, perDayMode: false, perDay: {}, availability: null,
    }])

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

  const subtotal = items.reduce((s, it) => s + lineAmount(it), 0)
  const disc = parseFloat(discount) || 0
  const gst = ((subtotal - disc) * (parseFloat(gstPercent) || 0)) / 100
  const total = subtotal - disc + gst

  const handleSave = async () => {
    const valid = items.filter((i) => i.item_id > 0)
    if (valid.some((i) => i.availability && !i.availability.available)) {
      setWarning("Some items don't have enough stock for the event dates. Please fix before saving.")
      return
    }
    setSaving(true)
    try {
      const payload = {
        discount: disc,
        gst_percent: parseFloat(gstPercent) || 0,
        items: valid.map((it) => ({
          item_id: it.item_id,
          quantity: peakQty(it),
          days: it.perDayMode ? dates.length : it.days,
          rental_rate: it.rental_rate,
          discount: it.discount,
          per_day: it.perDayMode
            ? dates.map((d) => ({ usage_date: d, quantity: Number(it.perDay[d]) || 0 }))
            : undefined,
        })),
      }
      const res = await fetch(`/api/bookings/${id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setWarning(data.error ?? "Failed to save changes")
        return
      }
      invalidateCache("/api/bookings")
      invalidateCache("/api/dashboard")
      invalidateCache("/api/inventory")
      router.push(`/bookings/${id}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-4 max-w-4xl">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold">Edit Booking · {String(booking?.booking_number ?? "")}</h2>
            <p className="text-sm text-muted-foreground">
              {String(booking?.event_name ?? "")}
              {dates.length > 0 && ` · ${dates.length} day${dates.length > 1 ? "s" : ""} (${dates[0]} → ${dates[dates.length - 1]})`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/bookings/${id}`)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </div>

        {(booking?.status === "Confirmed" || booking?.status === "Running") && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This booking holds stock ({String(booking?.status)}). Saving will re-reserve inventory for the new quantities.
          </div>
        )}

        {/* Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Items</CardTitle>
            <Button size="sm" variant="outline" onClick={addItem}>
              <PlusIcon className="size-4 mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No items</p>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-6 items-end">
                      <div className="col-span-2">
                        <Label className="text-xs">Item</Label>
                        <Select value={String(item.item_id || "")} onValueChange={(v) => setItemId(idx, parseInt(v))}>
                          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map((i) => (
                              <SelectItem key={i.id} value={String(i.id)}>{i.name} ({i.available_quantity} avail)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {!item.perDayMode && (
                        <>
                          <div>
                            <Label className="text-xs">Qty</Label>
                            <Input type="number" min={1} value={item.quantity}
                              onChange={(e) => { const next = [...items]; next[idx] = { ...item, quantity: parseInt(e.target.value) || 0 }; setItems(next); checkAvail(next, idx) }} />
                          </div>
                          <div>
                            <Label className="text-xs">Days</Label>
                            <Input type="number" min={1} value={item.days}
                              onChange={(e) => update(idx, { days: parseInt(e.target.value) || 1 })} />
                          </div>
                        </>
                      )}
                      <div>
                        <Label className="text-xs">Rate/Day</Label>
                        <Input type="number" value={item.rental_rate}
                          onChange={(e) => update(idx, { rental_rate: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant={item.perDayMode ? "default" : "outline"}
                          size="sm"
                          className="w-full"
                          disabled={dates.length < 2 && !item.perDayMode}
                          onClick={() => togglePerDay(idx)}
                        >
                          <CalendarDaysIcon className="size-3.5 mr-1" /> Per-day
                        </Button>
                      </div>
                    </div>

                    {item.perDayMode && (
                      <div className="rounded-md bg-muted/40 p-2">
                        <p className="text-xs text-muted-foreground mb-1.5">Quantity per day (rent = sum of all days × rate)</p>
                        <div className="flex flex-wrap gap-2">
                          {dates.map((d) => (
                            <div key={d} className="flex flex-col">
                              <Label className="text-[10px] text-muted-foreground">{d.slice(5)}</Label>
                              <Input
                                type="number" min={0} className="w-20 h-8"
                                value={item.perDay[d] ?? 0}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value) || 0
                                  setPerDayQty(idx, d, v)
                                  const next = [...items]
                                  next[idx] = { ...item, perDay: { ...item.perDay, [d]: v } }
                                  checkAvail(next, idx)
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
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
                        <span className="text-sm font-medium">{fmtINR(lineAmount(item))}</span>
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

        {/* Pricing */}
        <Card>
          <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount (₹)</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div>
                <Label>GST %</Label>
                <Input type="number" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmtINR(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>− {fmtINR(disc)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST ({gstPercent}%)</span><span>{fmtINR(gst)}</span></div>
              <div className="flex justify-between font-semibold text-base border-t pt-1.5"><span>Total</span><span>{fmtINR(total)}</span></div>
              {booking != null && Number(booking.advance_paid) > 0 && (
                <>
                  <div className="flex justify-between text-green-600"><span>Already paid</span><span>− {fmtINR(Number(booking.advance_paid))}</span></div>
                  <div className="flex justify-between font-semibold"><span>New balance</span><span>{fmtINR(total - Number(booking.advance_paid))}</span></div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <NoticeDialog
        open={!!warning}
        title="Cannot save changes"
        description={warning ?? ""}
        variant="warning"
        onClose={() => setWarning(null)}
      />
    </MainLayout>
  )
}
