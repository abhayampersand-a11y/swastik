import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const laborer_id = req.nextUrl.searchParams.get("laborer_id")
  try {
    let sql = `
      SELECT la.*, l.name as laborer_name,
             (la.amount - la.recovered_amount) as pending_amount
      FROM labor_advances la JOIN laborers l ON la.laborer_id = l.id
      WHERE 1=1
    `
    const params: unknown[] = []
    if (laborer_id && /^\d+$/.test(laborer_id)) {
      params.push(laborer_id)
      sql += ` AND la.laborer_id=$${params.length}`
    }
    sql += " ORDER BY la.advance_date DESC"
    const advances = await query(sql, params)
    return NextResponse.json({ advances })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { laborer_id, advance_date, amount, reason, notes, monthly_deduction } = await req.json()
    const [advance] = await query(
      `INSERT INTO labor_advances (laborer_id, advance_date, amount, reason, notes, monthly_deduction)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [laborer_id, advance_date, amount, reason, notes,
       parseFloat(monthly_deduction) || null]
    )
    return NextResponse.json({ advance }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to add advance" }, { status: 500 })
  }
}
