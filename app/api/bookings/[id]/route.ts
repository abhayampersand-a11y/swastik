import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const booking = await queryOne(
      `SELECT b.*, c.name as customer_name, c.mobile as customer_mobile, c.address as customer_address
       FROM bookings b JOIN customers c ON b.customer_id = c.id WHERE b.id=$1`,
      [id]
    )
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const items = await query(
      `SELECT bi.*, i.name as item_name, i.unit_type
       FROM booking_items bi JOIN inventory_items i ON bi.item_id = i.id
       WHERE bi.booking_id=$1`,
      [id]
    )
    const payments = await query(
      "SELECT * FROM payments WHERE booking_id=$1 ORDER BY payment_date DESC",
      [id]
    )
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

    // Handle inventory reservation on status change
    if (status === "Confirmed" && existing.status !== "Confirmed") {
      const bookingItems = await query<{ item_id: number; quantity: number }>(
        "SELECT item_id, quantity FROM booking_items WHERE booking_id=$1",
        [id]
      )
      for (const bi of bookingItems) {
        // Check availability on date
        const avail = await queryOne<{ available_quantity: number; reserved_quantity: number }>(
          "SELECT available_quantity, reserved_quantity FROM inventory_items WHERE id=$1",
          [bi.item_id]
        )
        if (!avail || avail.available_quantity < bi.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for item ${bi.item_id}` },
            { status: 400 }
          )
        }
        await query(
          `UPDATE inventory_items SET
           available_quantity = available_quantity - $1,
           reserved_quantity = reserved_quantity + $1
           WHERE id=$2`,
          [bi.quantity, bi.item_id]
        )
        await query(
          `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_id, reference_type, notes)
           VALUES ($1,'reserve',$2,$3,'bookings','Reserved for booking')`,
          [bi.item_id, bi.quantity, id]
        )
      }
    }

    // Release inventory on Cancelled
    if (status === "Cancelled" && existing.status === "Confirmed") {
      const bookingItems = await query<{ item_id: number; quantity: number }>(
        "SELECT item_id, quantity FROM booking_items WHERE booking_id=$1",
        [id]
      )
      for (const bi of bookingItems) {
        await query(
          `UPDATE inventory_items SET
           available_quantity = available_quantity + $1,
           reserved_quantity = reserved_quantity - $1
           WHERE id=$2`,
          [bi.quantity, bi.item_id]
        )
      }
    }

    const [booking] = await query(
      `UPDATE bookings SET
       event_name=$1, event_type=$2, event_date=$3, setup_date=$4, return_date=$5,
       venue_address=$6, notes=$7, status=$8, discount=$9, gst_percent=$10,
       updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [event_name, event_type, event_date, setup_date, return_date,
       venue_address, notes, status, discount ?? 0, gst_percent ?? 0, id]
    )

    await query(
      "INSERT INTO activity_logs (action_type, description, reference_id, reference_type) VALUES ('booking_updated',$1,$2,'bookings')",
      [`Booking ${booking.booking_number} status → ${status}`, id]
    )

    return NextResponse.json({ booking })
  } catch (e) {
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
