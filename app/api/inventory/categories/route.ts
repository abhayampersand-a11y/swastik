import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const categories = await query(
      `SELECT c.*, COUNT(i.id)::int as item_count
       FROM inventory_categories c
       LEFT JOIN inventory_items i ON i.category_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC, c.id DESC`
    )
    return NextResponse.json({ categories })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    const [category] = await query(
      `INSERT INTO inventory_categories (name, description)
       VALUES ($1, $2) RETURNING *`,
      [name.trim(), description ?? null]
    )
    return NextResponse.json({ category }, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Category name already exists" }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}
