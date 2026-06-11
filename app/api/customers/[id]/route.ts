import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const customer = await queryOne("SELECT * FROM customers WHERE id=$1", [id])
    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const bookings = await query(
      `SELECT b.*, COALESCE(SUM(p.amount),0) as paid
       FROM bookings b LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.customer_id=$1 GROUP BY b.id ORDER BY b.event_date DESC`,
      [id]
    )
    return NextResponse.json({ customer, bookings })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { name, mobile, alternate_mobile, address, city, notes } = await req.json()
    const [customer] = await query(
      `UPDATE customers SET name=$1, mobile=$2, alternate_mobile=$3,
       address=$4, city=$5, notes=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, mobile, alternate_mobile, address, city, notes, id]
    )
    return NextResponse.json({ customer })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await query("DELETE FROM customers WHERE id=$1", [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
