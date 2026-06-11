import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear())

  try {
    const [revenues, expensesData] = await Promise.all([
      query<{ month: string; total: string }>(
        `SELECT EXTRACT(MONTH FROM payment_date)::int as month, COALESCE(SUM(amount),0) as total
         FROM payments WHERE EXTRACT(YEAR FROM payment_date) = $1
         GROUP BY 1 ORDER BY 1`,
        [year]
      ),
      query<{ month: string; total: string }>(
        `SELECT EXTRACT(MONTH FROM expense_date)::int as month, COALESCE(SUM(amount),0) as total
         FROM expenses WHERE EXTRACT(YEAR FROM expense_date) = $1
         GROUP BY 1 ORDER BY 1`,
        [year]
      ),
    ])

    const revMap = Object.fromEntries(revenues.map((r) => [r.month, parseFloat(r.total)]))
    const expMap = Object.fromEntries(expensesData.map((e) => [e.month, parseFloat(e.total)]))

    const monthly = MONTHS.map((name, idx) => {
      const m = idx + 1
      const revenue = revMap[m] ?? 0
      const expenses = expMap[m] ?? 0
      return { month: name, revenue, expenses, profit: revenue - expenses }
    })

    return NextResponse.json({ monthly })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 })
  }
}
