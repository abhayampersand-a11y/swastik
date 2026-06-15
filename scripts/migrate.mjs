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

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })

async function main() {
  const dir = path.join(__dirname, "../lib/migrations")
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()

  if (files.length === 0) {
    console.log("ℹ️   No migration files found.")
    return
  }

  console.log("🔗  Connecting to Neon PostgreSQL...")
  const client = await pool.connect()
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8")
      console.log(`📦  Applying ${file} ...`)
      await client.query(sql)
      console.log(`✅  ${file} done`)
    }
    console.log("\n🚀  All migrations applied.")
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error("❌  Migration error:", e.message)
  process.exit(1)
})
