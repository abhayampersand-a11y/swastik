import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? ""
  const category = req.nextUrl.searchParams.get("category") ?? ""

  try {
    let sql = `
      SELECT i.*, c.name as category_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE 1=1
    `
    const params: unknown[] = []
    if (search) {
      params.push(`%${search}%`)
      sql += ` AND i.name ILIKE $${params.length}`
    }
    if (category) {
      params.push(category)
      sql += ` AND c.name = $${params.length}`
    }
    sql += " ORDER BY i.name"

    const items = await query(sql, params)
    const categories = await query("SELECT * FROM inventory_categories ORDER BY name")
    return NextResponse.json({ items, categories })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      category_id, name, unit_type, total_quantity, purchase_price,
      rental_price, description, features, low_stock_threshold,
    } = body

    const [item] = await query(
      `INSERT INTO inventory_items
       (category_id, name, unit_type, total_quantity, available_quantity,
        purchase_price, rental_price, description, features, low_stock_threshold)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [category_id, name, unit_type ?? "Piece", total_quantity ?? 0,
       purchase_price ?? 0, rental_price ?? 0, description, features,
       low_stock_threshold ?? 10]
    )

    await query(
      `INSERT INTO activity_logs (action_type, description, reference_id, reference_type)
       VALUES ('inventory_added', $1, $2, 'inventory_items')`,
      [`Added inventory item: ${name}`, item.id]
    )

    return NextResponse.json({ item }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 })
  }
}
