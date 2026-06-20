import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const now = new Date()
  const month = req.nextUrl.searchParams.get("month") ?? String(now.getMonth() + 1)
  const year = req.nextUrl.searchParams.get("year") ?? String(now.getFullYear())
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
    // Day-by-day attendance for the selected month (for the daily/monthly view).
    const attendance = await query(
      `SELECT attendance_date, status, overtime_hours, work_hours, notes
       FROM attendance
       WHERE laborer_id=$1
         AND EXTRACT(MONTH FROM attendance_date)=$2
         AND EXTRACT(YEAR FROM attendance_date)=$3
       ORDER BY attendance_date`,
      [id, month, year]
    )
    // Month totals: present / absent (leave) / half days + hours.
    const [summary] = await query<{
      present: string; absent: string; half_days: string
      total_work_hours: string; total_overtime: string
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status='Present')   AS present,
         COUNT(*) FILTER (WHERE status='Absent')    AS absent,
         COUNT(*) FILTER (WHERE status='Half Day')  AS half_days,
         COALESCE(SUM(work_hours), 0)               AS total_work_hours,
         COALESCE(SUM(overtime_hours), 0)           AS total_overtime
       FROM attendance
       WHERE laborer_id=$1
         AND EXTRACT(MONTH FROM attendance_date)=$2
         AND EXTRACT(YEAR FROM attendance_date)=$3`,
      [id, month, year]
    )
    return NextResponse.json({ laborer, advances, salaries, attendance, summary })
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
      [name, mobile, address, joining_date || null, salary_type,
       Number(basic_salary) || 0, Number(overtime_rate) || 0, notes, is_active ?? true, id]
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
