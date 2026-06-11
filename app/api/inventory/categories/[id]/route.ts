import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { name, description } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    const [category] = await query(
      `UPDATE inventory_categories SET name=$1, description=$2 WHERE id=$3 RETURNING *`,
      [name.trim(), description ?? null, id]
    )
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ category })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Category name already exists" }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    // Check if category has items
    const cat = await queryOne<{ item_count: number }>(
      `SELECT COUNT(i.id)::int as item_count FROM inventory_categories c
       LEFT JOIN inventory_items i ON i.category_id = c.id
       WHERE c.id = $1 GROUP BY c.id`,
      [id]
    )
    if (cat && cat.item_count > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${cat.item_count} item(s) are using this category` },
        { status: 409 }
      )
    }
    await query("DELETE FROM inventory_categories WHERE id=$1", [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
