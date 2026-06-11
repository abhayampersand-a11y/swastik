import pg from "pg"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const { Pool } = pg

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(__dirname, "../.env.local")
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf8").split("\n")
  for (const line of lines) {
    const [key, ...rest] = line.split("=")
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
  }
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("❌  DATABASE_URL not found in .env.local")
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const schemaPath = path.join(__dirname, "../lib/schema.sql")
  const sql = fs.readFileSync(schemaPath, "utf8")

  console.log("🔗  Connecting to Neon PostgreSQL...")
  const client = await pool.connect()

  try {
    console.log("📦  Running schema.sql ...")
    await client.query(sql)
    console.log("✅  All tables created successfully!\n")

    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    )
    console.log("📋  Tables in database:")
    result.rows.forEach((row, i) => {
      console.log(`    ${i + 1}. ${row.table_name}`)
    })
    console.log("\n🚀  Database is ready. Run: npm run dev")
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error("❌  Error:", e.message)
  process.exit(1)
})
