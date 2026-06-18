import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const categories = await query(
      `SELECT c.*, COUNT(e.id)::int as expense_count
       FROM expense_categories c
       LEFT JOIN expenses e ON e.category = c.name
       GROUP BY c.id
       ORDER BY c.name`
    )
    return NextResponse.json({ categories })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    const [category] = await query(
      `INSERT INTO expense_categories (name) VALUES ($1) RETURNING *`,
      [name.trim()]
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
