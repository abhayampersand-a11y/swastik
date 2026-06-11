import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const booking_id = req.nextUrl.searchParams.get("booking_id")
  try {
    let sql = `
      SELECT p.*, b.booking_number, c.name as customer_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN customers c ON p.customer_id = c.id
      WHERE 1=1
    `
    const params: unknown[] = []
    if (booking_id && /^\d+$/.test(booking_id)) {
      params.push(booking_id)
      sql += ` AND p.booking_id = $${params.length}`
    }
    sql += " ORDER BY p.payment_date DESC LIMIT 100"
    const payments = await query(sql, params)
    return NextResponse.json({ payments })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { booking_id, customer_id, payment_date, payment_method, amount, notes } = await req.json()

    const [payment] = await query(
      `INSERT INTO payments (booking_id, customer_id, payment_date, payment_method, amount, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [booking_id, customer_id, payment_date, payment_method, amount, notes]
    )

    // Update booking advance_paid and remaining_balance
    await query(
      `UPDATE bookings SET
       advance_paid = advance_paid + $1,
       remaining_balance = remaining_balance - $1,
       updated_at = NOW()
       WHERE id = $2`,
      [amount, booking_id]
    )

    await query(
      "INSERT INTO activity_logs (action_type, description, reference_id, reference_type) VALUES ('payment_added',$1,$2,'payments')",
      [`Payment ₹${amount} added for booking ${booking_id}`, payment.id]
    )

    return NextResponse.json({ payment }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to add payment" }, { status: 500 })
  }
}
