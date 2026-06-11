import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const alerts: { type: string; message: string; detail?: string }[] = []

    // Low stock items
    const lowStock = await query<{ name: string; available_quantity: number; low_stock_threshold: number }>(
      "SELECT name, available_quantity, low_stock_threshold FROM inventory_items WHERE available_quantity <= low_stock_threshold AND low_stock_threshold > 0 LIMIT 5"
    )
    for (const item of lowStock) {
      alerts.push({
        type: "low_stock",
        message: `Low stock: ${item.name}`,
        detail: `Only ${item.available_quantity} left (threshold: ${item.low_stock_threshold})`,
      })
    }

    // Upcoming events in 7 days
    const upcoming = await query<{ event_name: string; event_date: string; customer_name: string }>(
      `SELECT b.event_name, b.event_date, c.name as customer_name
       FROM bookings b JOIN customers c ON b.customer_id = c.id
       WHERE b.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       AND b.status NOT IN ('Cancelled','Closed')
       ORDER BY b.event_date LIMIT 5`
    )
    for (const ev of upcoming) {
      alerts.push({
        type: "upcoming_event",
        message: `Upcoming: ${ev.event_name}`,
        detail: `${ev.customer_name} · ${new Date(ev.event_date).toLocaleDateString("en-IN")}`,
      })
    }

    // Pending payments > 0
    const payments = await query<{ customer_name: string; remaining_balance: string }>(
      `SELECT c.name as customer_name, b.remaining_balance
       FROM bookings b JOIN customers c ON b.customer_id = c.id
       WHERE b.remaining_balance > 0 AND b.status NOT IN ('Cancelled')
       ORDER BY b.remaining_balance DESC LIMIT 5`
    )
    for (const p of payments) {
      alerts.push({
        type: "pending_payment",
        message: `Payment due: ${p.customer_name}`,
        detail: `Balance: ₹${parseFloat(p.remaining_balance).toLocaleString("en-IN")}`,
      })
    }

    // Salary due (current month not paid)
    const now = new Date()
    const salaryDue = await query<{ name: string }>(
      `SELECT l.name FROM laborers l
       WHERE l.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM salaries s WHERE s.laborer_id = l.id
         AND s.month = $1 AND s.year = $2 AND s.status = 'Paid'
       ) LIMIT 3`,
      [now.getMonth() + 1, now.getFullYear()]
    )
    if (salaryDue.length > 0) {
      alerts.push({
        type: "salary_due",
        message: `Salary pending for ${salaryDue.length} laborer(s)`,
        detail: salaryDue.map((l) => l.name).join(", "),
      })
    }

    return NextResponse.json({ alerts })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ alerts: [] })
  }
}
