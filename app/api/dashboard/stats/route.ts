import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const [bookings] = await query<{ total: string }>(
      "SELECT COUNT(*) as total FROM bookings"
    )
    const [upcoming] = await query<{ total: string }>(
      "SELECT COUNT(*) as total FROM bookings WHERE event_date >= CURRENT_DATE AND event_date <= CURRENT_DATE + INTERVAL '30 days' AND status NOT IN ('Cancelled','Closed')"
    )
    const [active] = await query<{ total: string }>(
      "SELECT COUNT(*) as total FROM bookings WHERE status = 'Running'"
    )
    const [customers] = await query<{ total: string }>(
      "SELECT COUNT(*) as total FROM customers"
    )
    const [inventory] = await query<{ total: string }>(
      "SELECT COUNT(*) as total FROM inventory_items WHERE available_quantity > 0"
    )
    const [pending] = await query<{ total: string }>(
      "SELECT COUNT(*) as total FROM bookings WHERE remaining_balance > 0 AND status NOT IN ('Cancelled')"
    )
    const now = new Date()
    const [revenue] = await query<{ total: string }>(
      "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE EXTRACT(MONTH FROM payment_date)=$1 AND EXTRACT(YEAR FROM payment_date)=$2",
      [now.getMonth() + 1, now.getFullYear()]
    )
    const [expenses] = await query<{ total: string }>(
      "SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2",
      [now.getMonth() + 1, now.getFullYear()]
    )

    const monthlyRevenue = parseFloat(revenue.total ?? "0")
    const monthlyExpenses = parseFloat(expenses.total ?? "0")

    return NextResponse.json({
      total_bookings: parseInt(bookings.total),
      upcoming_events: parseInt(upcoming.total),
      active_events: parseInt(active.total),
      total_customers: parseInt(customers.total),
      available_inventory_items: parseInt(inventory.total),
      pending_payments: parseInt(pending.total),
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      net_profit: monthlyRevenue - monthlyExpenses,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
