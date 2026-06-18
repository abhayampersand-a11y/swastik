import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, withTransaction } from "@/lib/db"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { name } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    const newName = name.trim()

    const category = await withTransaction(async (client) => {
      const existing = await client.query<{ name: string }>(
        `SELECT name FROM expense_categories WHERE id=$1`,
        [id]
      )
      if (!existing.rows[0]) return null
      const oldName = existing.rows[0].name

      const res = await client.query(
        `UPDATE expense_categories SET name=$1 WHERE id=$2 RETURNING *`,
        [newName, id]
      )
      // Keep existing expense rows in sync with the renamed category.
      if (oldName !== newName) {
        await client.query(`UPDATE expenses SET category=$1 WHERE category=$2`, [newName, oldName])
      }
      return res.rows[0]
    })

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
    const cat = await queryOne<{ name: string; expense_count: number }>(
      `SELECT c.name, COUNT(e.id)::int as expense_count
       FROM expense_categories c
       LEFT JOIN expenses e ON e.category = c.name
       WHERE c.id = $1 GROUP BY c.id`,
      [id]
    )
    if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (cat.expense_count > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${cat.expense_count} expense(s) are using this category` },
        { status: 409 }
      )
    }
    await query("DELETE FROM expense_categories WHERE id=$1", [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
