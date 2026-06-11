import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { item_id, quantity, event_date, booking_id } = await req.json()

    const row = await queryOne<{ total_quantity: number; name: string; total_reserved: string }>(
      `SELECT
         i.total_quantity,
         i.name,
         COALESCE((
           SELECT SUM(bi.quantity)
           FROM booking_items bi
           JOIN bookings b ON bi.booking_id = b.id
           WHERE bi.item_id = i.id
             AND b.event_date = $2
             AND b.status IN ('Confirmed','Running')
             AND ($3::int IS NULL OR b.id != $3)
         ), 0) AS total_reserved
       FROM inventory_items i
       WHERE i.id = $1`,
      [item_id, event_date, booking_id ?? null]
    )

    if (!row) {
      return NextResponse.json({ available: false, reason: "Item not found" })
    }

    const totalQty = row.total_quantity
    const totalReserved = parseInt(row.total_reserved)
    const freeQty = totalQty - totalReserved

    if (freeQty >= quantity) {
      return NextResponse.json({
        available: true,
        free_quantity: freeQty,
        total_quantity: totalQty,
        reserved_on_date: totalReserved,
      })
    } else {
      return NextResponse.json({
        available: false,
        free_quantity: freeQty,
        total_quantity: totalQty,
        reserved_on_date: totalReserved,
        reason: `Only ${freeQty} ${row.name} available on this date (${totalReserved} already reserved)`,
      })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 })
  }
}
