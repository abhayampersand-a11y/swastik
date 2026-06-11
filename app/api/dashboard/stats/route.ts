import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

export async function GET() {
  try {
    const now = new Date()
    const stats = await queryOne<{
      total_bookings: string
      upcoming_events: string
      active_events: string
      total_customers: string
      available_inventory_items: string
      pending_payments: string
      monthly_revenue: string
      monthly_expenses: string
    }>(
      `SELECT
        (SELECT COUNT(*) FROM bookings)::int AS total_bookings,
        (SELECT COUNT(*) FROM bookings
         WHERE event_date >= CURRENT_DATE
           AND event_date <= CURRENT_DATE + INTERVAL '30 days'
           AND status NOT IN ('Cancelled','Closed'))::int AS upcoming_events,
        (SELECT COUNT(*) FROM bookings WHERE status = 'Running')::int AS active_events,
        (SELECT COUNT(*) FROM customers)::int AS total_customers,
        (SELECT COUNT(*) FROM inventory_items WHERE available_quantity > 0)::int AS available_inventory_items,
        (SELECT COUNT(*) FROM bookings WHERE remaining_balance > 0 AND status NOT IN ('Cancelled'))::int AS pending_payments,
        (SELECT COALESCE(SUM(amount),0) FROM payments
         WHERE EXTRACT(MONTH FROM payment_date)=$1
           AND EXTRACT(YEAR FROM payment_date)=$2) AS monthly_revenue,
        (SELECT COALESCE(SUM(amount),0) FROM expenses
         WHERE EXTRACT(MONTH FROM expense_date)=$1
           AND EXTRACT(YEAR FROM expense_date)=$2) AS monthly_expenses`,
      [now.getMonth() + 1, now.getFullYear()]
    )

    const monthlyRevenue = parseFloat(stats!.monthly_revenue ?? "0")
    const monthlyExpenses = parseFloat(stats!.monthly_expenses ?? "0")

    return NextResponse.json({
      total_bookings: stats!.total_bookings,
      upcoming_events: stats!.upcoming_events,
      active_events: stats!.active_events,
      total_customers: stats!.total_customers,
      available_inventory_items: stats!.available_inventory_items,
      pending_payments: stats!.pending_payments,
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      net_profit: monthlyRevenue - monthlyExpenses,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
