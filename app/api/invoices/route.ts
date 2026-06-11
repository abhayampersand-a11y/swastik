import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const booking_id = req.nextUrl.searchParams.get("booking_id")
  try {
    let sql = `
      SELECT inv.*, b.booking_number, c.name as customer_name
      FROM invoices inv
      JOIN bookings b ON inv.booking_id = b.id
      JOIN customers c ON inv.customer_id = c.id
      WHERE 1=1
    `
    const params: unknown[] = []
    if (booking_id) {
      params.push(booking_id)
      sql += ` AND inv.booking_id = $${params.length}`
    }
    sql += " ORDER BY inv.invoice_date DESC LIMIT 100"
    const invoices = await query(sql, params)
    return NextResponse.json({ invoices })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      booking_id, customer_id, invoice_date,
      inventory_charges = 0, labor_charges = 0, transport_charges = 0,
      damage_charges = 0, additional_charges = 0,
      discount = 0, gst_percent = 0, notes,
    } = body

    // Generate invoice number
    const [seq] = await query<{ nextval: string }>("SELECT nextval('invoice_seq')")
    const invoice_number = `INV-${seq.nextval}`

    // Get advance paid
    const booking = await query<{ advance_paid: string }>(
      "SELECT advance_paid FROM bookings WHERE id=$1",
      [booking_id]
    )
    const advancePaid = parseFloat(booking[0]?.advance_paid ?? "0")

    const subtotal =
      parseFloat(inventory_charges) + parseFloat(labor_charges) +
      parseFloat(transport_charges) + parseFloat(damage_charges) +
      parseFloat(additional_charges)
    const disc = parseFloat(discount)
    const gstAmt = ((subtotal - disc) * parseFloat(gst_percent)) / 100
    const totalAmount = subtotal - disc + gstAmt
    const remaining = totalAmount - advancePaid

    const [invoice] = await query(
      `INSERT INTO invoices
       (invoice_number, booking_id, customer_id, invoice_date,
        inventory_charges, labor_charges, transport_charges,
        damage_charges, additional_charges, subtotal, discount,
        gst_percent, gst_amount, total_amount, advance_paid, remaining_balance,
        payment_status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
               CASE WHEN $16 <= 0 THEN 'Paid' WHEN $15 > 0 THEN 'Partial' ELSE 'Pending' END,
               $17)
       RETURNING *`,
      [invoice_number, booking_id, customer_id, invoice_date,
       inventory_charges, labor_charges, transport_charges,
       damage_charges, additional_charges, subtotal, disc,
       gst_percent, gstAmt, totalAmount, advancePaid, remaining, notes]
    )

    await query(
      "INSERT INTO activity_logs (action_type, description, reference_id, reference_type) VALUES ('invoice_created',$1,$2,'invoices')",
      [`Invoice ${invoice_number} created`, invoice.id]
    )

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}
