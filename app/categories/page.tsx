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
  PlusIcon,
  EditIcon,
  Trash2Icon,
  TagIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"

interface Category {
  id: number
  name: string
  description: string | null
  item_count: number
  created_at: string
}

function CategoryDialog({
  open,
  onClose,
  category,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  category: Category | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "")
      setDescription(category?.description ?? "")
      setError("")
    }
  }, [category, open])

  const handleSave = async () => {
    if (!name.trim()) { setError("Category name is required"); return }
    setSaving(true)
    setError("")
    try {
      const url = category ? `/api/inventory/categories/${category.id}` : "/api/inventory/categories"
      const res = await fetch(url, {
        method: category ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to save"); return }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {category ? "Edit Category" : "New Category"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="cat-name">Category Name *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError("") }}
              placeholder="e.g., Chairs, Tables, Lights..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div>
            <Label htmlFor="cat-desc">Description</Label>
            <Input
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : category ? "Save Changes" : "Add Category"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/inventory/categories")
    const data = await res.json()
    setCategories(data.categories ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleDelete = async (cat: Category) => {
    if (cat.item_count > 0) {
      setDeleteError(`"${cat.name}" has ${cat.item_count} item(s). Remove them first.`)
      setTimeout(() => setDeleteError(null), 4000)
      return
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return
    const res = await fetch(`/api/inventory/categories/${cat.id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      setDeleteError(data.error)
      setTimeout(() => setDeleteError(null), 4000)
      return
    }
    fetchCategories()
  }

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (cat: Category) => { setEditing(cat); setDialogOpen(true) }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TagIcon className="size-5" />
            <h2 className="text-lg font-semibold">Inventory Categories</h2>
            <Badge variant="outline">{categories.length}</Badge>
          </div>
          <Button onClick={openAdd}>
            <PlusIcon className="size-4 mr-1" /> Add Category
          </Button>
        </div>

        {/* Delete error banner */}
        {deleteError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            <XIcon className="size-4 shrink-0" />
            {deleteError}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
              <TagIcon className="size-12 opacity-30" />
              <p>No categories yet</p>
              <Button variant="outline" onClick={openAdd}>
                <PlusIcon className="size-4 mr-1" /> Add First Category
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Category Name</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">
                    Description
                  </th>
                  <th className="text-center p-3 font-medium">Items</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center">
                          <TagIcon className="size-3.5 text-primary" />
                        </div>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">
                      {cat.description ?? (
                        <span className="italic opacity-50">No description</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={cat.item_count > 0 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {cat.item_count} {cat.item_count === 1 ? "item" : "items"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(cat)}
                          title="Edit"
                        >
                          <EditIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cat)}
                          title="Delete"
                          disabled={cat.item_count > 0}
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

        {/* Info note */}
        <p className="text-xs text-muted-foreground">
          * Categories with items cannot be deleted. Remove or reassign items first.
        </p>
      </div>

      <CategoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        category={editing}
        onSaved={fetchCategories}
      />
    </MainLayout>
  )
}
