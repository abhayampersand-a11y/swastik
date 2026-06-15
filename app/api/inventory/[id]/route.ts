import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { notify } from "@/lib/notifications"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const item = await queryOne(
      `SELECT i.*, c.name as category_name
       FROM inventory_items i LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.id = $1`,
      [id]
    )
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const transactions = await query(
      "SELECT * FROM inventory_transactions WHERE item_id = $1 ORDER BY created_at DESC LIMIT 20",
      [id]
    )
    return NextResponse.json({ item, transactions })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const {
      category_id, name, unit_type, total_quantity, available_quantity,
      damaged_quantity, purchase_price, rental_price, description, features, low_stock_threshold,
    } = body

    const [item] = await query(
      `UPDATE inventory_items SET
       category_id=$1, name=$2, unit_type=$3, total_quantity=$4,
       available_quantity=$5, damaged_quantity=$6,
       purchase_price=$7, rental_price=$8, description=$9,
       features=$10, low_stock_threshold=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [category_id, name, unit_type, total_quantity, available_quantity,
       damaged_quantity ?? 0, purchase_price, rental_price, description,
       features, low_stock_threshold ?? 10, id]
    )

    // Warn if this edit leaves the item at/below its low-stock threshold.
    const threshold = item.low_stock_threshold as number
    const available = item.available_quantity as number
    if (threshold > 0 && available <= threshold) {
      await notify({
        type: "low_stock",
        title: `Low stock: ${item.name}`,
        message: `Only ${available} left (threshold: ${threshold})`,
        reference_id: item.id as number,
        reference_type: "inventory_items",
      })
    }

    return NextResponse.json({ item })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await query("DELETE FROM inventory_items WHERE id=$1", [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
