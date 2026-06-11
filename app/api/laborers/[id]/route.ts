import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const laborer = await queryOne("SELECT * FROM laborers WHERE id=$1", [id])
    if (!laborer) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const advances = await query(
      "SELECT * FROM labor_advances WHERE laborer_id=$1 ORDER BY advance_date DESC",
      [id]
    )
    const salaries = await query(
      "SELECT * FROM salaries WHERE laborer_id=$1 ORDER BY year DESC, month DESC",
      [id]
    )
    return NextResponse.json({ laborer, advances, salaries })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { name, mobile, address, joining_date, salary_type, basic_salary, overtime_rate, notes, is_active } =
      await req.json()
    const [laborer] = await query(
      `UPDATE laborers SET name=$1, mobile=$2, address=$3, joining_date=$4,
       salary_type=$5, basic_salary=$6, overtime_rate=$7, notes=$8,
       is_active=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, mobile, address, joining_date, salary_type, basic_salary, overtime_rate, notes, is_active, id]
    )
    return NextResponse.json({ laborer })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await query("UPDATE laborers SET is_active=FALSE WHERE id=$1", [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
