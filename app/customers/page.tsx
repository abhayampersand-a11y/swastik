"use client"

import { useEffect, useState, useCallback } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { PlusIcon, SearchIcon, EditIcon, Trash2Icon, UsersIcon, PhoneIcon } from "lucide-react"
import Link from "next/link"
import { Modal, ConfirmDialog } from "@/components/ui/modal"
import { FieldError } from "@/components/ui/field-error"
import { useInvalidate } from "@/lib/redux/hooks"

interface Customer {
  id: number
  name: string
  mobile: string
  alternate_mobile?: string
  address?: string
  city?: string
  notes?: string
  outstanding_balance: number
}

function CustomerDialog({
  open, onClose, customer, onSaved,
}: {
  open: boolean
  onClose: () => void
  customer: Customer | null
  onSaved: () => void
}) {
  const [form, setForm] = useState({ name: "", mobile: "", alternate_mobile: "", address: "", city: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const invalidateCache = useInvalidate()

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name ?? "",
        mobile: customer.mobile ?? "",
        alternate_mobile: customer.alternate_mobile ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
        notes: customer.notes ?? "",
      })
    } else {
      setForm({ name: "", mobile: "", alternate_mobile: "", address: "", city: "", notes: "" })
    }
    setErrors({})
  }, [customer, open])

  const handleSave = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Customer name is required"
    if (!form.mobile.trim()) e.mobile = "Mobile number is required"
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSaving(true)
    try {
      const url = customer ? `/api/customers/${customer.id}` : "/api/customers"
      await fetch(url, {
        method: customer ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      invalidateCache("/api/customers")
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md space-y-4">
        <h2 className="text-lg font-semibold">{customer ? "Edit Customer" : "Add Customer"}</h2>
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
            <div>
              <Label>Mobile *</Label>
              <Input
                value={form.mobile}
                aria-invalid={!!errors.mobile}
                onChange={(e) => { setForm({ ...form, mobile: e.target.value }); setErrors((p) => ({ ...p, mobile: "" })) }}
              />
              <FieldError msg={errors.mobile} />
            </div>
            <div>
              <Label>Alternate Mobile</Label>
              <Input value={form.alternate_mobile} onChange={(e) => setForm({ ...form, alternate_mobile: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>City/Village</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : customer ? "Save Changes" : "Add Customer"}
          </Button>
        </div>
    </Modal>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    const res = await fetch(`/api/customers?${params}`)
    const data = await res.json()
    setCustomers(data.customers ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const handleDelete = async () => {
    if (!deleting) return
    await fetch(`/api/customers/${deleting.id}`, { method: "DELETE" })
    setDeleting(null)
    fetchCustomers()
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-5" />
            <h2 className="text-lg font-semibold">Customers</h2>
            <Badge variant="outline">{customers.length}</Badge>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <PlusIcon className="size-4 mr-1" /> Add Customer
          </Button>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : customers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <UsersIcon className="size-12 mb-3 opacity-30" />
              <p>No customers found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {customers.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <PhoneIcon className="size-3" /> {c.mobile}
                    </span>
                    {c.city && <span>{c.city}</span>}
                  </div>
                </div>
                {c.outstanding_balance > 0 && (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    Due: {fmt(c.outstanding_balance)}
                  </Badge>
                )}
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setDialogOpen(true) }}>
                    <EditIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting(c)}>
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CustomerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        customer={editing}
        onSaved={fetchCustomers}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete customer?"
        description={deleting ? `"${deleting.name}" and their details will be permanently removed.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </MainLayout>
  )
}
