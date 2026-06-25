import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? ""
  try {
    let sql = "SELECT * FROM customers WHERE 1=1"
    const params: unknown[] = []
    if (search) {
      params.push(`%${search}%`)
      sql += ` AND (name ILIKE $${params.length} OR mobile ILIKE $${params.length})`
    }
    sql += " ORDER BY created_at DESC, id DESC"
    const customers = await query(sql, params)
    return NextResponse.json({ customers })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, mobile, alternate_mobile, address, city, notes } = await req.json()
    const [customer] = await query(
      `INSERT INTO customers (name, mobile, alternate_mobile, address, city, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, mobile, alternate_mobile, address, city, notes]
    )
    await query(
      "INSERT INTO activity_logs (action_type, description, reference_id, reference_type) VALUES ('customer_added',$1,$2,'customers')",
      [`Added customer: ${name}`, customer.id]
    )
    return NextResponse.json({ customer }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
