import { NextRequest, NextResponse } from "next/server"
import { withTransaction } from "@/lib/db"
import { notify } from "@/lib/notifications"

interface PerDayInput {
  usage_date: string
  quantity: number
}
interface ItemInput {
  item_id: number
  quantity: number
  days: number
  rental_rate: number
  discount?: number
  per_day?: PerDayInput[]
}

const money = (n: number) => Math.round(n * 100) / 100

/**
 * Replace a booking's line items (with optional per-day quantities) and
 * recompute every dependent figure in ONE transaction so that the
 * detail view, estimate PDF, invoice PDF and inventory counters can
 * never drift out of sync:
 *
 *  - booking_items + booking_item_days are fully replaced.
 *  - line amount   = Σ(per-day qty × rate)  when per-day rows exist,
 *                    else qty × rate × days,  minus the line discount.
 *  - subtotal      = Σ line amounts; gst/total/remaining recomputed.
 *  - inventory     : if the booking currently holds stock (Confirmed /
 *                    Running) the old reservation is released and the new
 *                    one re-checked + reserved, so only the delta moves.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const items: ItemInput[] = body.items ?? []
    const discountAmt = parseFloat(body.discount) || 0
    const gstPercent = parseFloat(body.gst_percent) || 0
    const transportCharges = parseFloat(body.transport_charges) || 0

    const booking = await withTransaction(async (client) => {
      const { rows: [existing] } = await client.query<{
        status: string
        advance_paid: string
        booking_number: string
        event_name: string
      }>(
        "SELECT status, advance_paid, booking_number, event_name FROM bookings WHERE id=$1 FOR UPDATE",
        [id]
      )
      if (!existing) {
        throw Object.assign(new Error("Booking not found"), { status: 404 })
      }
      if (existing.status === "Cancelled" || existing.status === "Closed") {
        throw Object.assign(new Error(`Cannot edit a ${existing.status} booking`), { status: 400 })
      }

      const held = existing.status === "Confirmed" || existing.status === "Running"

      // 1. Release the stock this booking currently holds (only if held).
      if (held) {
        const { rows: oldItems } = await client.query<{ item_id: number; quantity: number }>(
          "SELECT item_id, quantity FROM booking_items WHERE booking_id=$1",
          [id]
        )
        for (const oi of oldItems) {
          await client.query(
            `UPDATE inventory_items SET
               available_quantity = available_quantity + $1,
               reserved_quantity = GREATEST(reserved_quantity - $1, 0)
             WHERE id=$2`,
            [oi.quantity, oi.item_id]
          )
        }
      }

      // 2. Wipe old lines (CASCADE removes their booking_item_days).
      await client.query("DELETE FROM booking_items WHERE booking_id=$1", [id])

      // 3. Re-insert lines, compute amounts server-side (never trust client).
      let subtotal = 0
      for (const it of items) {
        const rate = parseFloat(String(it.rental_rate)) || 0
        const lineDiscount = parseFloat(String(it.discount ?? 0)) || 0
        const perDay = Array.isArray(it.per_day) ? it.per_day : []

        let qty: number
        let days: number
        let gross: number
        if (perDay.length > 0) {
          gross = perDay.reduce((s, p) => s + (Number(p.quantity) || 0) * rate, 0)
          qty = Math.max(...perDay.map((p) => Number(p.quantity) || 0))
          days = perDay.length
        } else {
          qty = parseInt(String(it.quantity)) || 0
          days = parseInt(String(it.days)) || 1
          gross = qty * rate * days
        }
        const amount = money(gross - lineDiscount)
        subtotal += amount

        const { rows: [bi] } = await client.query<{ id: number }>(
          `INSERT INTO booking_items (booking_id, item_id, quantity, days, rental_rate, discount, amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [id, it.item_id, qty, days, rate, lineDiscount, amount]
        )

        for (const p of perDay) {
          const pq = Number(p.quantity) || 0
          await client.query(
            `INSERT INTO booking_item_days (booking_item_id, item_id, usage_date, quantity, rental_rate, amount)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [bi.id, it.item_id, p.usage_date, pq, rate, money(pq * rate)]
          )
        }

        // 4. Reserve the new quantity from the global counter (if held).
        if (held && qty > 0) {
          const { rows: [inv] } = await client.query<{
            name: string
            available_quantity: number
            low_stock_threshold: number
          }>(
            "SELECT name, available_quantity, low_stock_threshold FROM inventory_items WHERE id=$1 FOR UPDATE",
            [it.item_id]
          )
          if (!inv || inv.available_quantity < qty) {
            throw Object.assign(
              new Error(`Insufficient stock for ${inv?.name ?? `item ${it.item_id}`}: need ${qty}, have ${inv?.available_quantity ?? 0}`),
              { status: 400 }
            )
          }
          await client.query(
            `UPDATE inventory_items SET
               available_quantity = available_quantity - $1,
               reserved_quantity = reserved_quantity + $1
             WHERE id=$2`,
            [qty, it.item_id]
          )
          await client.query(
            `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_id, reference_type, notes)
             VALUES ($1,'reserve',$2,$3,'bookings','Re-reserved after edit')`,
            [it.item_id, qty, id]
          )
          const remaining = inv.available_quantity - qty
          if (inv.low_stock_threshold > 0 && remaining <= inv.low_stock_threshold) {
            await notify({
              type: "low_stock",
              title: `Low stock: ${inv.name}`,
              message: `Only ${remaining} left (threshold: ${inv.low_stock_threshold})`,
              reference_id: it.item_id,
              reference_type: "inventory_items",
            }, client)
          }
        }
      }

      // 5. Recompute booking financials and persist.
      //    Transport is part of the taxable base: base = subtotal - discount + transport.
      subtotal = money(subtotal)
      const taxableBase = subtotal - discountAmt + transportCharges
      const gstAmount = money(taxableBase * gstPercent / 100)
      const totalAmount = money(taxableBase + gstAmount)
      const advance = parseFloat(existing.advance_paid) || 0
      const remainingBalance = money(totalAmount - advance)

      const { rows: [updated] } = await client.query(
        `UPDATE bookings SET
           subtotal=$1, transport_charges=$2, discount=$3, gst_percent=$4, gst_amount=$5,
           total_amount=$6, remaining_balance=$7, updated_at=NOW()
         WHERE id=$8 RETURNING *`,
        [subtotal, transportCharges, discountAmt, gstPercent, gstAmount, totalAmount, remainingBalance, id]
      )

      await client.query(
        "INSERT INTO activity_logs (action_type, description, reference_id, reference_type) VALUES ('booking_updated',$1,$2,'bookings')",
        [`Items edited: ${existing.booking_number} (${items.length} items, total ₹${totalAmount})`, id]
      )

      return updated
    })

    return NextResponse.json({ booking })
  } catch (e: unknown) {
    const status = e instanceof Error ? (e as { status?: number }).status : undefined
    if (status === 400 || status === 404) {
      return NextResponse.json({ error: (e as Error).message }, { status })
    }
    console.error(e)
    return NextResponse.json({ error: "Failed to update items" }, { status: 500 })
  }
}
