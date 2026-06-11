import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "financial"
  const month = req.nextUrl.searchParams.get("month")
  const year = req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear())

  try {
    if (type === "financial") {
      const revenues = await query<{ month: string; total: string }>(
        `SELECT EXTRACT(MONTH FROM payment_date)::int as month, SUM(amount) as total
         FROM payments WHERE EXTRACT(YEAR FROM payment_date)=$1
         GROUP BY 1 ORDER BY 1`,
        [year]
      )
      const expenses = await query<{ month: string; total: string }>(
        `SELECT EXTRACT(MONTH FROM expense_date)::int as month, SUM(amount) as total
         FROM expenses WHERE EXTRACT(YEAR FROM expense_date)=$1
         GROUP BY 1 ORDER BY 1`,
        [year]
      )
      return NextResponse.json({ revenues, expenses })
    }

    if (type === "booking") {
      const bookings = await query(
        `SELECT b.*, c.name as customer_name
         FROM bookings b JOIN customers c ON b.customer_id=c.id
         WHERE EXTRACT(YEAR FROM b.event_date)=$1
         ORDER BY b.event_date`,
        [year]
      )
      return NextResponse.json({ bookings })
    }

    if (type === "inventory") {
      const stock = await query(
        `SELECT i.*, c.name as category_name
         FROM inventory_items i LEFT JOIN inventory_categories c ON i.category_id=c.id
         ORDER BY i.name`
      )
      const lowStock = stock.filter((s: Record<string, unknown>) => (s.available_quantity as number) <= (s.low_stock_threshold as number))
      return NextResponse.json({ stock, lowStock })
    }

    if (type === "labor") {
      const laborers = await query("SELECT * FROM laborers WHERE is_active=TRUE ORDER BY name")
      let salaries: Record<string, unknown>[] = []
      if (month && year) {
        salaries = await query(
          `SELECT s.*, l.name as laborer_name
           FROM salaries s JOIN laborers l ON s.laborer_id=l.id
           WHERE s.month=$1 AND s.year=$2 ORDER BY l.name`,
          [month, year]
        )
      }
      return NextResponse.json({ laborers, salaries })
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
