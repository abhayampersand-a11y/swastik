import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month")
  const year = req.nextUrl.searchParams.get("year")
  const laborer_id = req.nextUrl.searchParams.get("laborer_id")

  try {
    let sql = `
      SELECT a.*, l.name as laborer_name
      FROM attendance a JOIN laborers l ON a.laborer_id = l.id
      WHERE 1=1
    `
    const params: unknown[] = []
    if (month && year) {
      params.push(month, year)
      sql += ` AND EXTRACT(MONTH FROM a.attendance_date)=$${params.length - 1}
               AND EXTRACT(YEAR FROM a.attendance_date)=$${params.length}`
    }
    // Ignore non-numeric values like "all" — they mean no filter
    if (laborer_id && /^\d+$/.test(laborer_id)) {
      params.push(laborer_id)
      sql += ` AND a.laborer_id=$${params.length}`
    }
    sql += " ORDER BY a.attendance_date DESC, l.name"
    const attendance = await query(sql, params)
    return NextResponse.json({ attendance })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { laborer_id, attendance_date, status, overtime_hours, notes } = await req.json()
    const [record] = await query(
      `INSERT INTO attendance (laborer_id, attendance_date, status, overtime_hours, notes)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (laborer_id, attendance_date)
       DO UPDATE SET status=$3, overtime_hours=$4, notes=$5
       RETURNING *`,
      [laborer_id, attendance_date, status ?? "Present", overtime_hours ?? 0, notes]
    )
    return NextResponse.json({ record }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  // Bulk attendance entry for a date
  try {
    const { records } = await req.json() // [{laborer_id, attendance_date, status, overtime_hours}]
    const saved = []
    for (const rec of records) {
      const [record] = await query(
        `INSERT INTO attendance (laborer_id, attendance_date, status, overtime_hours)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (laborer_id, attendance_date)
         DO UPDATE SET status=$3, overtime_hours=$4
         RETURNING *`,
        [rec.laborer_id, rec.attendance_date, rec.status ?? "Present", rec.overtime_hours ?? 0]
      )
      saved.push(record)
    }
    return NextResponse.json({ saved })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to save bulk attendance" }, { status: 500 })
  }
}
