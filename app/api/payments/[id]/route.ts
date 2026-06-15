import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { payment_date, payment_method, amount, notes } = await req.json()
    const { id } = await params

    const [old] = await query<{ amount: string; booking_id: number }>(
      "SELECT amount, booking_id FROM payments WHERE id = $1",
      [id]
    )
    if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const diff = parseFloat(amount) - parseFloat(old.amount)

    const [payment] = await query(
      `UPDATE payments SET payment_date=$1, payment_method=$2, amount=$3, notes=$4
       WHERE id=$5 RETURNING *`,
      [payment_date, payment_method, amount, notes, id]
    )

    if (diff !== 0) {
      await query(
        `UPDATE bookings SET
         advance_paid = advance_paid + $1,
         remaining_balance = remaining_balance - $1,
         updated_at = NOW()
         WHERE id = $2`,
        [diff, old.booking_id]
      )
    }

    await query(
      "INSERT INTO activity_logs (action_type, description, reference_id, reference_type) VALUES ('payment_updated',$1,$2,'payments')",
      [`Payment updated to ₹${amount} for booking ${old.booking_id}`, id]
    )

    return NextResponse.json({ payment })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 })
  }
}
