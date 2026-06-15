import { NextRequest, NextResponse } from "next/server"
import { getAvailability } from "@/lib/availability"

/**
 * Date-wise availability check for one item.
 *
 * Body accepts either:
 *  - { item_id, quantity, event_date }                  single-day
 *  - { item_id, quantity, setup_date, return_date }     multi-day range
 *  - { item_id, quantity, from, to }                    explicit range
 * Optional `booking_id` excludes that booking (for edits).
 *
 * Response keeps the old keys (available, free_quantity, total_quantity,
 * reserved_on_date, reason) and adds a per-day `days` breakdown plus the
 * `worst_day` (the tightest day in the range).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { item_id, quantity, event_date, setup_date, return_date, from, to, booking_id } = body

    const start = from ?? setup_date ?? event_date
    const end = to ?? return_date ?? event_date ?? start

    if (!item_id || !start) {
      return NextResponse.json({ available: false, reason: "item_id and a date are required" }, { status: 400 })
    }

    const result = await getAvailability({
      itemId: Number(item_id),
      from: start,
      to: end,
      requestedQuantity: Number(quantity) || 0,
      excludeBookingId: booking_id ?? null,
    })

    if (!result) {
      return NextResponse.json({ available: false, reason: "Item not found" })
    }

    return NextResponse.json({
      available: result.available,
      free_quantity: result.worst_day?.free ?? 0,
      total_quantity: result.total_quantity,
      reserved_on_date: result.worst_day?.committed ?? 0,
      worst_day: result.worst_day,
      days: result.days,
      reason: result.reason,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 })
  }
}
