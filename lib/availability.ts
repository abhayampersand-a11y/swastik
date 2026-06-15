import { query } from "@/lib/db"

// Bookings in these states actually hold stock. Inquiry/Estimated are
// not yet committed, Completed/Closed/Cancelled have released it.
export const COMMITTED_STATUSES = ["Confirmed", "Running"] as const

export interface DayAvailability {
  date: string // YYYY-MM-DD
  total: number // rentable stock that day (total - damaged)
  committed: number // already booked that day
  free: number // total - committed
}

export interface AvailabilityResult {
  item_id: number
  name: string
  total_quantity: number
  requested_quantity: number
  from: string
  to: string
  days: DayAvailability[]
  worst_day: DayAvailability | null // day with the least free stock
  available: boolean // free >= requested on EVERY day in range
  reason?: string
}

interface DayRow {
  name: string
  date: string
  total: string
  committed: string
  free: string
}

/**
 * Date-wise availability for one inventory item across [from..to].
 *
 * For each day it sums committed quantity from two sources:
 *  - booking_item_days: explicit per-day quantities (variable per day)
 *  - flat booking_items WITHOUT per-day rows, expanded across their
 *    setup_date..return_date range
 *
 * Effective stock is total_quantity - damaged_quantity (damaged pieces
 * can't be rented). An item is "available" only if every single day in
 * the range has free >= requestedQuantity.
 */
export async function getAvailability(opts: {
  itemId: number
  from: string
  to: string
  requestedQuantity?: number
  excludeBookingId?: number | null
}): Promise<AvailabilityResult | null> {
  const { itemId, from, to } = opts
  const requested = opts.requestedQuantity ?? 0
  const exclude = opts.excludeBookingId ?? null

  const statuses = COMMITTED_STATUSES as readonly string[]

  const rows = await query<DayRow>(
    `
    WITH days AS (
      SELECT gs::date AS d
      FROM generate_series($2::date, $3::date, interval '1 day') gs
    ),
    perday AS (
      SELECT bid.usage_date AS d, SUM(bid.quantity) AS qty
      FROM booking_item_days bid
      JOIN booking_items bi ON bi.id = bid.booking_item_id
      JOIN bookings b ON b.id = bi.booking_id
      WHERE bid.item_id = $1
        AND b.status = ANY($4)
        AND ($5::int IS NULL OR b.id <> $5)
        AND bid.usage_date BETWEEN $2::date AND $3::date
      GROUP BY bid.usage_date
    ),
    flat AS (
      SELECT d.d AS d, SUM(bi.quantity) AS qty
      FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
      JOIN days d
        ON d.d BETWEEN COALESCE(b.setup_date, b.event_date)
                   AND COALESCE(b.return_date, b.event_date)
      WHERE bi.item_id = $1
        AND b.status = ANY($4)
        AND ($5::int IS NULL OR b.id <> $5)
        AND NOT EXISTS (
          SELECT 1 FROM booking_item_days x WHERE x.booking_item_id = bi.id
        )
      GROUP BY d.d
    )
    SELECT
      i.name,
      to_char(d.d, 'YYYY-MM-DD') AS date,
      GREATEST(i.total_quantity - COALESCE(i.damaged_quantity, 0), 0) AS total,
      COALESCE(p.qty, 0) + COALESCE(f.qty, 0) AS committed,
      GREATEST(i.total_quantity - COALESCE(i.damaged_quantity, 0), 0)
        - (COALESCE(p.qty, 0) + COALESCE(f.qty, 0)) AS free
    FROM days d
    CROSS JOIN inventory_items i
    LEFT JOIN perday p ON p.d = d.d
    LEFT JOIN flat f ON f.d = d.d
    WHERE i.id = $1
    ORDER BY d.d
    `,
    [itemId, from, to, statuses, exclude]
  )

  if (rows.length === 0) return null

  const days: DayAvailability[] = rows.map((r) => ({
    date: r.date,
    total: parseInt(r.total),
    committed: parseInt(r.committed),
    free: parseInt(r.free),
  }))

  const worst = days.reduce(
    (min, d) => (min === null || d.free < min.free ? d : min),
    null as DayAvailability | null
  )

  const available = worst !== null && worst.free >= requested

  return {
    item_id: itemId,
    name: rows[0].name,
    total_quantity: days[0]?.total ?? 0,
    requested_quantity: requested,
    from,
    to,
    days,
    worst_day: worst,
    available,
    reason: available
      ? undefined
      : worst
        ? `Only ${worst.free} ${rows[0].name} free on ${worst.date} (${worst.committed} already booked, need ${requested})`
        : "Item not found",
  }
}
