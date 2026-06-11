"use client"

import { useEffect, useState, useCallback } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon, SearchIcon, EditIcon, Trash2Icon, PackageIcon, AlertTriangleIcon } from "lucide-react"
import { InventoryDialog } from "@/components/inventory-dialog"

interface InventoryItem {
  id: number
  name: string
  category_name: string
  unit_type: string
  total_quantity: number
  available_quantity: number
  reserved_quantity: number
  damaged_quantity: number
  rental_price: number
  purchase_price: number
  low_stock_threshold: number
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (category !== "all") params.set("category", category)
    const res = await fetch(`/api/inventory?${params}`)
    const data = await res.json()
    setItems(data.items ?? [])
    setCategories(data.categories ?? [])
    setLoading(false)
  }, [search, category])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this item?")) return
    await fetch(`/api/inventory/${id}`, { method: "DELETE" })
    fetchInventory()
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  const stockBadge = (item: InventoryItem) => {
    if (item.available_quantity <= 0) return <Badge variant="destructive">Out of Stock</Badge>
    if (item.available_quantity <= item.low_stock_threshold)
      return <Badge className="bg-yellow-500 text-white">Low Stock</Badge>
    return <Badge variant="secondary">In Stock</Badge>
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <PackageIcon className="size-5" />
            <h2 className="text-lg font-semibold">Inventory Items</h2>
            <Badge variant="outline">{items.length} items</Badge>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <PlusIcon className="size-4 mr-1" /> Add Item
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table / Cards */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <PackageIcon className="size-12 mb-3 opacity-30" />
              <p>No inventory items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Item Name</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
                  <th className="text-right p-3 font-medium">Available</th>
                  <th className="text-right p-3 font-medium hidden sm:table-cell">Reserved</th>
                  <th className="text-right p-3 font-medium hidden lg:table-cell">Rental/Day</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.unit_type}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {item.category_name}
                    </td>
                    <td className="p-3 text-right font-medium tabular-nums">
                      {item.available_quantity}
                      <div className="text-xs text-muted-foreground">of {item.total_quantity}</div>
                    </td>
                    <td className="p-3 text-right hidden sm:table-cell text-muted-foreground">
                      {item.reserved_quantity}
                    </td>
                    <td className="p-3 text-right hidden lg:table-cell">
                      {fmt(item.rental_price)}
                    </td>
                    <td className="p-3 text-center">
                      {stockBadge(item)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditing(item); setDialogOpen(true) }}
                        >
                          <EditIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Low stock alert summary */}
        {items.filter((i) => i.available_quantity <= i.low_stock_threshold && i.available_quantity > 0).length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertTriangleIcon className="size-4" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {items
                  .filter((i) => i.available_quantity <= i.low_stock_threshold && i.available_quantity > 0)
                  .map((i) => (
                    <Badge key={i.id} variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                      {i.name}: {i.available_quantity} left
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <InventoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        categories={categories}
        item={editing}
        onSaved={fetchInventory}
      />
    </MainLayout>
  )
}
