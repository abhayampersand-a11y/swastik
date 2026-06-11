import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const laborers = await query(
      "SELECT * FROM laborers WHERE is_active=TRUE ORDER BY name"
    )
    return NextResponse.json({ laborers })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, mobile, address, joining_date, salary_type, basic_salary, overtime_rate, notes } =
      await req.json()
    const [laborer] = await query(
      `INSERT INTO laborers (name, mobile, address, joining_date, salary_type, basic_salary, overtime_rate, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, mobile, address, joining_date, salary_type ?? "Monthly",
       basic_salary ?? 0, overtime_rate ?? 0, notes]
    )
    return NextResponse.json({ laborer }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to create laborer" }, { status: 500 })
  }
}
