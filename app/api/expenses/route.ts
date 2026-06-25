import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month")
  const year = req.nextUrl.searchParams.get("year")
  const category = req.nextUrl.searchParams.get("category")

  try {
    let sql = "SELECT * FROM expenses WHERE 1=1"
    const params: unknown[] = []
    if (month && year) {
      params.push(month, year)
      sql += ` AND EXTRACT(MONTH FROM expense_date)=$${params.length - 1}
               AND EXTRACT(YEAR FROM expense_date)=$${params.length}`
    }
    if (category) {
      params.push(category)
      sql += ` AND category=$${params.length}`
    }
    sql += " ORDER BY created_at DESC, id DESC LIMIT 200"
    const expenses = await query(sql, params)

    // Summary by category
    const summary = await query<{ category: string; total: string }>(
      `SELECT category, SUM(amount) as total FROM expenses
       WHERE 1=1 ${month && year ? `AND EXTRACT(MONTH FROM expense_date)=${month} AND EXTRACT(YEAR FROM expense_date)=${year}` : ""}
       GROUP BY category ORDER BY total DESC`
    )

    return NextResponse.json({ expenses, summary })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { expense_date, category, amount, description } = await req.json()
    const [expense] = await query(
      `INSERT INTO expenses (expense_date, category, amount, description)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [expense_date, category, amount, description]
    )
    return NextResponse.json({ expense }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to add expense" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  try {
    await query("DELETE FROM expenses WHERE id=$1", [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
