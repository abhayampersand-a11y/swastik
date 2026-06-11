import { NextRequest, NextResponse } from "next/server"
import { query, withTransaction } from "@/lib/db"

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? ""
  const status = req.nextUrl.searchParams.get("status") ?? ""
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50")
  const sort = req.nextUrl.searchParams.get("sort") ?? "event_date"

  try {
    let sql = `
      SELECT b.*, c.name as customer_name, c.mobile as customer_mobile
      FROM bookings b JOIN customers c ON b.customer_id = c.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (search) {
      params.push(`%${search}%`)
      sql += ` AND (c.name ILIKE $${params.length} OR b.booking_number ILIKE $${params.length} OR b.event_name ILIKE $${params.length})`
    }
    if (status) {
      params.push(status)
      sql += ` AND b.status = $${params.length}`
    }

    sql += sort === "recent"
      ? " ORDER BY b.created_at DESC"
      : " ORDER BY b.event_date"

    params.push(limit)
    sql += ` LIMIT $${params.length}`

    const bookings = await query(sql, params)
    return NextResponse.json({ bookings })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customer_id, event_name, event_type, event_date, setup_date,
      return_date, venue_address, notes, items = [],
      discount = 0, gst_percent = 0,
    } = body

    const booking = await withTransaction(async (client) => {
      const { rows: [seq] } = await client.query<{ nextval: string }>("SELECT nextval('booking_seq')")
      const booking_number = `BK-${seq.nextval}`

      let subtotal = 0
      for (const item of items) {
        subtotal += parseFloat(item.amount) || 0
      }
      const discountAmt = parseFloat(discount) || 0
      const gstPercent = parseFloat(gst_percent) || 0
      const gstAmount = ((subtotal - discountAmt) * gstPercent) / 100
      const totalAmount = subtotal - discountAmt + gstAmount

      const { rows: [booking] } = await client.query(
        `INSERT INTO bookings
         (booking_number, customer_id, event_name, event_type, event_date,
          setup_date, return_date, venue_address, notes, status,
          subtotal, discount, gst_percent, gst_amount, total_amount, remaining_balance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Inquiry',$10,$11,$12,$13,$14,$14)
         RETURNING *`,
        [booking_number, customer_id, event_name, event_type, event_date,
         setup_date, return_date, venue_address, notes,
         subtotal, discountAmt, gstPercent, gstAmount, totalAmount]
      )

      for (const item of items) {
        await client.query(
          `INSERT INTO booking_items (booking_id, item_id, quantity, days, rental_rate, discount, amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [booking.id, item.item_id, item.quantity, parseInt(item.days) || 1,
           item.rental_rate, item.discount ?? 0, item.amount]
        )
      }

      await client.query(
        "INSERT INTO activity_logs (action_type, description, reference_id, reference_type) VALUES ('booking_created',$1,$2,'bookings')",
        [`Booking created: ${booking_number}`, booking.id]
      )

      return booking
    })

    return NextResponse.json({ booking }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}
