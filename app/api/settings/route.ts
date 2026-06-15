import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

const DEFAULTS = {
  business_name: "Swastik Mandap",
  tagline: "Event & Decoration Services",
  email: "admin@swastikmandap.com",
  contact_number: "",
  address: "",
}

// Create the table + default row if they don't exist yet (no migration needed)
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      business_name VARCHAR(200) DEFAULT 'Swastik Mandap',
      tagline VARCHAR(200) DEFAULT 'Event & Decoration Services',
      email VARCHAR(200) DEFAULT 'admin@swastikmandap.com',
      contact_number VARCHAR(50),
      address TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT business_settings_single_row CHECK (id = 1)
    )
  `)
  await query("INSERT INTO business_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING")
}

export async function GET() {
  try {
    await ensureTable()
    const settings = await queryOne("SELECT * FROM business_settings WHERE id = 1")
    return NextResponse.json({ settings: settings ?? { id: 1, ...DEFAULTS } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureTable()
    const { business_name, tagline, email, contact_number, address } = await req.json()
    const [settings] = await query(
      `UPDATE business_settings SET
         business_name = $1,
         tagline = $2,
         email = $3,
         contact_number = $4,
         address = $5,
         updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [
        business_name?.trim() || DEFAULTS.business_name,
        tagline?.trim() ?? DEFAULTS.tagline,
        email?.trim() ?? DEFAULTS.email,
        contact_number?.trim() ?? "",
        address?.trim() ?? "",
      ]
    )
    return NextResponse.json({ settings })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
