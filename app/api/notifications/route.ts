import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const notifications = await query(
      "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50"
    )
    const [unread] = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM notifications WHERE is_read=FALSE"
    )
    return NextResponse.json({ notifications, unread_count: parseInt(unread.count) })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Reading a notification removes it from the database entirely.
    const { id } = await req.json()
    if (id === "all") {
      await query("DELETE FROM notifications")
    } else {
      await query("DELETE FROM notifications WHERE id=$1", [id])
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
