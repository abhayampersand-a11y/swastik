import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

const DEFAULTS = { full_day_hours: 8, half_day_hours: 4 }

// Create the single-row table if it doesn't exist yet (no migration needed).
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS work_hour_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      full_day_hours NUMERIC(5,2) NOT NULL DEFAULT 8,
      half_day_hours NUMERIC(5,2) NOT NULL DEFAULT 4,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT work_hour_settings_single_row CHECK (id = 1)
    )
  `)
  await query("INSERT INTO work_hour_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING")
}

export async function GET() {
  try {
    await ensureTable()
    const settings = await queryOne("SELECT * FROM work_hour_settings WHERE id = 1")
    return NextResponse.json({ settings: settings ?? { id: 1, ...DEFAULTS } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureTable()
    const { full_day_hours, half_day_hours } = await req.json()
    const full = Number(full_day_hours)
    const half = Number(half_day_hours)
    if (!(full > 0) || !(half > 0)) {
      return NextResponse.json({ error: "Hours must be greater than 0" }, { status: 400 })
    }
    if (half > full) {
      return NextResponse.json({ error: "Half-day hours can't exceed full-day hours" }, { status: 400 })
    }
    const [settings] = await query(
      `UPDATE work_hour_settings
         SET full_day_hours = $1, half_day_hours = $2, updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [full, half]
    )
    return NextResponse.json({ settings })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
