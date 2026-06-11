"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"
import { FieldError } from "@/components/ui/field-error"
import { useInvalidate } from "@/lib/redux/hooks"

interface Props {
  open: boolean
  onClose: () => void
  categories: { id: number; name: string }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item?: any
  onSaved: () => void
}

export function InventoryDialog({ open, onClose, categories, item, onSaved }: Props) {
  const [form, setForm] = useState({
    category_id: "",
    name: "",
    unit_type: "Piece",
    total_quantity: "",
    available_quantity: "",
    purchase_price: "",
    rental_price: "",
    description: "",
    low_stock_threshold: "10",
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const invalidateCache = useInvalidate()

  useEffect(() => {
    setErrors({})
    if (item) {
      setForm({
        category_id: String(item.category_id ?? ""),
        name: String(item.name ?? ""),
        unit_type: String(item.unit_type ?? "Piece"),
        total_quantity: String(item.total_quantity ?? ""),
        available_quantity: String(item.available_quantity ?? ""),
        purchase_price: String(item.purchase_price ?? ""),
        rental_price: String(item.rental_price ?? ""),
        description: String(item.description ?? ""),
        low_stock_threshold: String(item.low_stock_threshold ?? "10"),
      })
    } else {
      setForm({
        category_id: "", name: "", unit_type: "Piece",
        total_quantity: "", available_quantity: "",
        purchase_price: "", rental_price: "", description: "", low_stock_threshold: "10",
      })
    }
  }, [item, open])

  const handleSave = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Item name is required"
    if (!form.category_id) e.category_id = "Please select a category"
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSaving(true)
    try {
      const url = item ? `/api/inventory/${item.id}` : "/api/inventory"
      const method = item ? "PUT" : "POST"
      const payload = {
        ...form,
        category_id: parseInt(form.category_id),
        total_quantity: parseInt(form.total_quantity),
        available_quantity: form.available_quantity ? parseInt(form.available_quantity) : parseInt(form.total_quantity),
        purchase_price: parseFloat(form.purchase_price),
        rental_price: parseFloat(form.rental_price),
        low_stock_threshold: parseInt(form.low_stock_threshold),
      }
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      invalidateCache("/api/inventory")
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">{item ? "Edit Item" : "Add Inventory Item"}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Item Name *</Label>
            <Input
              value={form.name}
              aria-invalid={!!errors.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((p) => ({ ...p, name: "" })) }}
              placeholder="e.g., Plastic Chair"
            />
            <FieldError msg={errors.name} />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category_id} onValueChange={(v) => { setForm({ ...form, category_id: v }); setErrors((p) => ({ ...p, category_id: "" })) }}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError msg={errors.category_id} />
          </div>
          <div>
            <Label>Unit Type</Label>
            <Select value={form.unit_type} onValueChange={(v) => setForm({ ...form, unit_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Piece", "Set", "Meter", "Kg"].map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Total Quantity</Label>
            <Input type="number" value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: e.target.value })} />
          </div>
          <div>
            <Label>Low Stock Alert</Label>
            <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
          </div>
          <div>
            <Label>Purchase Price (₹)</Label>
            <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
          </div>
          <div>
            <Label>Rental Price (₹)</Label>
            <Input type="number" value={form.rental_price} onChange={(e) => setForm({ ...form, rental_price: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : item ? "Save Changes" : "Add Item"}
          </Button>
        </div>
    </Modal>
  )
}
