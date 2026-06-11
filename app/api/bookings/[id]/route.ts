import { NextRequest, NextResponse } from "next/server"
import { query, queryOne, withTransaction } from "@/lib/db"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const booking = await queryOne(
      `SELECT b.*, c.name as customer_name, c.mobile as customer_mobile, c.address as customer_address
       FROM bookings b JOIN customers c ON b.customer_id = c.id WHERE b.id=$1`,
      [id]
    )
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [items, payments] = await Promise.all([
      query(
        `SELECT bi.*, i.name as item_name, i.unit_type
         FROM booking_items bi JOIN inventory_items i ON bi.item_id = i.id
         WHERE bi.booking_id=$1`,
        [id]
      ),
      query(
        "SELECT * FROM payments WHERE booking_id=$1 ORDER BY payment_date DESC",
        [id]
      ),
    ])
    return NextResponse.json({ booking, items, payments })
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
      event_name, event_type, event_date, setup_date, return_date,
      venue_address, notes, status, discount, gst_percent,
    } = body

    const existing = await queryOne<{ status: string; total_amount: string; advance_paid: string }>(
      "SELECT status, total_amount, advance_paid FROM bookings WHERE id=$1",
      [id]
    )
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const booking = await withTransaction(async (client) => {
      if (status === "Confirmed" && existing.status !== "Confirmed") {
        const { rows: bookingItems } = await client.query<{ item_id: number; quantity: number }>(
          "SELECT item_id, quantity FROM booking_items WHERE booking_id=$1",
          [id]
        )
        for (const bi of bookingItems) {
          const { rows: [avail] } = await client.query<{ available_quantity: number }>(
            "SELECT available_quantity FROM inventory_items WHERE id=$1 FOR UPDATE",
            [bi.item_id]
          )
          if (!avail || avail.available_quantity < bi.quantity) {
            throw Object.assign(new Error(`Insufficient stock for item ${bi.item_id}`), { status: 400 })
          }
          await client.query(
            `UPDATE inventory_items SET
             available_quantity = available_quantity - $1,
             reserved_quantity = reserved_quantity + $1
             WHERE id=$2`,
            [bi.quantity, bi.item_id]
          )
          await client.query(
            `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_id, reference_type, notes)
             VALUES ($1,'reserve',$2,$3,'bookings','Reserved for booking')`,
            [bi.item_id, bi.quantity, id]
          )
        }
      }

      if (status === "Cancelled" && existing.status === "Confirmed") {
        const { rows: bookingItems } = await client.query<{ item_id: number; quantity: number }>(
          "SELECT item_id, quantity FROM booking_items WHERE booking_id=$1",
          [id]
        )
        await Promise.all(
          bookingItems.map((bi) =>
            client.query(
              `UPDATE inventory_items SET
               available_quantity = available_quantity + $1,
               reserved_quantity = reserved_quantity - $1
               WHERE id=$2`,
              [bi.quantity, bi.item_id]
            )
          )
        )
      }

      const discountAmt = parseFloat(discount) || 0
      const gstPercent = parseFloat(gst_percent) || 0

      const { rows: [booking] } = await client.query(
        `UPDATE bookings SET
         event_name=$1, event_type=$2, event_date=$3, setup_date=$4, return_date=$5,
         venue_address=$6, notes=$7, status=$8, discount=$9, gst_percent=$10,
         gst_amount = (subtotal - $9) * $10 / 100,
         total_amount = (subtotal - $9) * (1 + $10 / 100),
         remaining_balance = (subtotal - $9) * (1 + $10 / 100) - COALESCE(advance_paid, 0),
         updated_at=NOW()
         WHERE id=$11 RETURNING *`,
        [event_name, event_type, event_date, setup_date, return_date,
         venue_address, notes, status, discountAmt, gstPercent, id]
      )

      await client.query(
        "INSERT INTO activity_logs (action_type, description, reference_id, reference_type) VALUES ('booking_updated',$1,$2,'bookings')",
        [`Booking ${booking.booking_number} status → ${status}`, id]
      )

      return booking
    })

    return NextResponse.json({ booking })
  } catch (e: unknown) {
    if (e instanceof Error && (e as { status?: number }).status === 400) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error(e)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await query("DELETE FROM bookings WHERE id=$1", [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
