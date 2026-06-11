import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// Check if an inventory item is available for given dates
export async function POST(req: NextRequest) {
  try {
    const { item_id, quantity, event_date, booking_id } = await req.json()

    // Total reserved for this date by other bookings
    const reserved = await query<{ total_reserved: string }>(
      `SELECT COALESCE(SUM(bi.quantity), 0) as total_reserved
       FROM booking_items bi
       JOIN bookings b ON bi.booking_id = b.id
       WHERE bi.item_id = $1
         AND b.event_date = $2
         AND b.status IN ('Confirmed','Running')
         AND ($3::int IS NULL OR b.id != $3)`,
      [item_id, event_date, booking_id ?? null]
    )

    const item = await query<{ total_quantity: number; name: string }>(
      "SELECT total_quantity, name FROM inventory_items WHERE id=$1",
      [item_id]
    )

    if (!item[0]) {
      return NextResponse.json({ available: false, reason: "Item not found" })
    }

    const totalQty = item[0].total_quantity
    const totalReserved = parseInt(reserved[0].total_reserved)
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
        reason: `Only ${freeQty} ${item[0].name} available on this date (${totalReserved} already reserved)`,
      })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 })
  }
}
