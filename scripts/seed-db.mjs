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

const N = 30

// ---------- helpers ----------
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const money = (n) => Math.round(n * 100) / 100
const dateStr = (d) => d.toISOString().split("T")[0]
const daysFromNow = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return dateStr(d)
}
const addDays = (ds, n) => {
  const [y, m, d] = ds.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().split("T")[0]
}
const rangeDates = (start, days) => Array.from({ length: days }, (_, k) => addDays(start, k))

// ---------- sample data pools ----------
const FIRST = ["Amit", "Rajesh", "Suresh", "Mahesh", "Kiran", "Nilesh", "Bhavesh", "Jignesh", "Hardik", "Paresh", "Ketan", "Dipak", "Vijay", "Ashok", "Manoj", "Chetan", "Dharmesh", "Sanjay", "Mehul", "Tushar", "Pankaj", "Vipul", "Rakesh", "Hitesh", "Alpesh"]
const LAST = ["Patel", "Shah", "Desai", "Mehta", "Joshi", "Trivedi", "Parmar", "Solanki", "Chauhan", "Rana", "Vora", "Modi", "Gandhi", "Bhatt", "Pandya", "Thakkar", "Dave", "Raval", "Vyas", "Soni", "Prajapati", "Rathod", "Chavda", "Makwana", "Gohil"]
const CITIES = ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Nadiad", "Mehsana", "Bharuch", "Navsari", "Valsad", "Morbi", "Surendranagar", "Patan", "Palanpur", "Veraval", "Porbandar", "Botad", "Amreli", "Dahod", "Godhra", "Bhuj"]
const CATEGORIES = ["Tents & Pandals", "Chairs", "Tables", "Lighting", "Sound System", "Stage", "Carpets", "Sofa Sets", "Cooking Utensils", "Decoration", "Flowers", "Crockery", "Fans", "Coolers", "Generators", "Mandap Structures", "Drapes", "Entry Gates", "Pillars", "Fountains", "Pandal Cloth", "Mattresses", "Linen", "Heaters", "Miscellaneous", "Pagdi & Safa", "Tea Counters", "Dustbins", "Walkie Talkies", "Photo Booth"]
const ITEM_NAMES = ["Shamiyana Tent 20x40", "Plastic Chair", "Round Table 6ft", "LED Par Light", "DJ Speaker Set", "Wooden Stage Panel", "Red Carpet Roll", "3-Seater Sofa", "Big Cooking Pot", "Flower Garland", "Marigold String", "Steel Thali", "Ceiling Fan", "Air Cooler", "Diesel Generator 15kVA", "Mandap Pillar Set", "Velvet Drape", "Welcome Gate", "Decorative Pillar", "Water Fountain", "Pandal Cloth Roll", "Foam Mattress", "Table Cloth", "Gas Heater", "Misc Hardware Kit", "Royal Pagdi", "Tea Counter Unit", "Steel Dustbin", "Walkie Talkie", "Photo Booth Frame"]
const UNITS = ["Piece", "Set", "Meter", "Kg"]
const EVENT_TYPES = ["Wedding", "Engagement", "Reception", "Birthday", "Corporate", "Puja", "Other"]
const STATUSES = ["Inquiry", "Estimated", "Confirmed", "Running", "Completed", "Closed", "Cancelled"]
const PAY_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque"]
const EXPENSE_CATS = ["Diesel", "Transport", "Food", "Maintenance", "Decoration", "Labor", "Miscellaneous"]
const TXN_TYPES = ["purchase", "reserve", "return", "damage", "adjust"]

const fullName = (i) => `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`
const mobile = () => `9${rand(100000000, 999999999)}`

async function main() {
  const client = await pool.connect()
  try {
    console.log("🔗  Connected to PostgreSQL")

    // ---------- 1. WIPE EVERYTHING ----------
    console.log("🧹  Emptying database (TRUNCATE all tables)...")
    await client.query(`
      TRUNCATE TABLE
        activity_logs, notifications, damage_reports, expenses, salaries,
        labor_advances, attendance, laborers, invoice_items, invoices,
        payments, quotation_items, quotations, booking_item_days, booking_items,
        bookings, customers, inventory_transactions, inventory_items, inventory_categories
      RESTART IDENTITY CASCADE
    `)
    await client.query("ALTER SEQUENCE booking_seq RESTART WITH 1001")
    await client.query("ALTER SEQUENCE invoice_seq RESTART WITH 2001")
    await client.query("ALTER SEQUENCE quotation_seq RESTART WITH 3001")
    console.log("✅  Database emptied\n")

    // ---------- 2. inventory_categories ----------
    for (let i = 0; i < N; i++) {
      await client.query(
        "INSERT INTO inventory_categories (name, description) VALUES ($1,$2)",
        [CATEGORIES[i], `${CATEGORIES[i]} rental items`]
      )
    }
    console.log(`✅  inventory_categories: ${N}`)

    // ---------- 3. inventory_items ----------
    // reserved_quantity / available_quantity are recomputed from bookings
    // at the end, so we seed them as "all free" here.
    const invItems = [] // { id, name, total, damaged, rate }
    for (let i = 0; i < N; i++) {
      const name = ITEM_NAMES[i]
      // Plastic Chair is fixed at 300 so the overbooking demo is exact.
      const isChair = name === "Plastic Chair"
      const total = isChair ? 300 : rand(50, 500)
      const damaged = isChair ? 0 : rand(0, 5)
      const rate = isChair ? 15 : money(rand(20, 500))
      const { rows: [row] } = await client.query(
        `INSERT INTO inventory_items
         (category_id, name, unit_type, total_quantity, available_quantity, reserved_quantity,
          damaged_quantity, purchase_price, rental_price, description, low_stock_threshold)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [rand(1, N), name, isChair ? "Piece" : pick(UNITS), total, total - damaged, 0,
         damaged, money(rand(100, 5000)), rate, `${name} for events`, rand(5, 20)]
      )
      invItems.push({ id: row.id, name, total, damaged, rate })
    }
    console.log(`✅  inventory_items: ${N}`)

    // ---------- 4. customers ----------
    for (let i = 0; i < N; i++) {
      await client.query(
        `INSERT INTO customers (name, mobile, alternate_mobile, address, city, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [fullName(i), mobile(), Math.random() > 0.5 ? mobile() : null,
         `${rand(1, 99)}, ${pick(["Society", "Nagar", "Park", "Colony"])}`, pick(CITIES),
         Math.random() > 0.7 ? "Regular customer" : null]
      )
    }
    console.log(`✅  customers: ${N}`)

    // ---------- 5. laborers ----------
    for (let i = 0; i < N; i++) {
      await client.query(
        `INSERT INTO laborers (name, mobile, address, joining_date, salary_type, basic_salary, overtime_rate, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [fullName(i + 5), mobile(), pick(CITIES), daysFromNow(-rand(100, 1000)),
         pick(["Monthly", "Daily"]), money(rand(8000, 25000)), money(rand(50, 200)), Math.random() > 0.1]
      )
    }
    console.log(`✅  laborers: ${N}`)

    // ---------- 6. bookings + booking_items + booking_item_days ----------
    // committed["<itemId>|<date>"] = qty held that day by Confirmed/Running
    // bookings. Used to recompute inventory stock counters at the end.
    const committed = new Map()
    const addCommit = (itemId, date, qty) => {
      const k = `${itemId}|${date}`
      committed.set(k, (committed.get(k) || 0) + qty)
    }

    // Line builders — amount uses the PROPER per-day formula.
    //  flat  : amount = qty * rate * days
    //  perDay: amount = SUM(dayQty * rate)   (variable qty per day)
    const flatLine = (it, qty, days) => ({
      itemId: it.id, qty, days, rate: it.rate, amount: money(qty * it.rate * days), perDay: null,
    })
    const perDayLine = (it, setup, dayQtys) => ({
      itemId: it.id,
      qty: Math.max(...dayQtys), // headline qty = peak day
      days: dayQtys.length,
      rate: it.rate,
      amount: money(dayQtys.reduce((s, q) => s + q * it.rate, 0)),
      perDay: dayQtys.map((q, k) => ({ date: addDays(setup, k), qty: q })),
    })

    // Build one booking end-to-end with consistent money + stock math.
    const insertBooking = async ({ customerId, eventName, eventType, status, setup, ret, eventDate, lines }) => {
      const held = status === "Confirmed" || status === "Running"
      const subtotal = money(lines.reduce((s, l) => s + l.amount, 0))
      const discount = money(rand(0, Math.floor(Math.min(5000, subtotal * 0.1))))
      const gst_percent = pick([0, 5, 18])
      const gst_amount = money((subtotal - discount) * gst_percent / 100)
      const total = money(subtotal - discount + gst_amount)
      const advance = money(rand(0, Math.floor(total)))
      const remaining = money(total - advance)

      const { rows: [seq] } = await client.query("SELECT nextval('booking_seq')")
      const { rows: [bk] } = await client.query(
        `INSERT INTO bookings
         (booking_number, customer_id, event_name, event_type, event_date, setup_date, return_date,
          venue_address, status, subtotal, discount, gst_percent, gst_amount, total_amount,
          advance_paid, remaining_balance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [`BK-${seq.nextval}`, customerId, eventName, eventType, eventDate, setup, ret,
         `${pick(CITIES)} Hall`, status, subtotal, discount, gst_percent, gst_amount, total, advance, remaining]
      )

      for (const l of lines) {
        const { rows: [bi] } = await client.query(
          `INSERT INTO booking_items (booking_id, item_id, quantity, days, rental_rate, amount, returned_quantity)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [bk.id, l.itemId, l.qty, l.days, l.rate, l.amount, 0]
        )
        if (l.perDay) {
          for (const p of l.perDay) {
            await client.query(
              `INSERT INTO booking_item_days (booking_item_id, item_id, usage_date, quantity, rental_rate, amount)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [bi.id, l.itemId, p.date, p.qty, l.rate, money(p.qty * l.rate)]
            )
            if (held) addCommit(l.itemId, p.date, p.qty)
          }
        } else if (held) {
          rangeDates(setup, l.days).forEach((d) => addCommit(l.itemId, d, l.qty))
        }
      }
      return bk.id
    }

    const chair = invItems.find((x) => x.name === "Plastic Chair")
    const table = invItems.find((x) => x.name === "Round Table 6ft") || invItems[2]

    // --- Scenario A: same-date overbooking — 300 chairs, demand 200+100+100+100 = 500 ---
    const dDate = daysFromNow(10)
    await insertBooking({
      customerId: 1, eventName: "Patel Grand Wedding", eventType: "Wedding",
      status: "Confirmed", setup: dDate, ret: dDate, eventDate: dDate,
      lines: [flatLine(chair, 200, 1)],
    })
    for (let k = 0; k < 3; k++) {
      await insertBooking({
        customerId: 2 + k, eventName: `${LAST[k]} Reception`, eventType: "Reception",
        status: "Confirmed", setup: dDate, ret: dDate, eventDate: dDate,
        lines: [flatLine(chair, 100, 1)],
      })
    }

    // --- Scenario B: variable per-day quantity over a 3-day event ---
    //  chair: 10 → 20 → 20   table: 20 → 5 → 5   (rent = sum of per-day, not flat)
    const sStart = daysFromNow(20)
    await insertBooking({
      customerId: 5, eventName: "Shah Sangeet & Reception", eventType: "Wedding",
      status: "Confirmed", setup: sStart, ret: addDays(sStart, 2), eventDate: sStart,
      lines: [perDayLine(chair, sStart, [10, 20, 20]), perDayLine(table, sStart, [20, 5, 5])],
    })

    const DEMO = 5 // bookings created above

    // --- remaining random bookings up to N, also internally consistent ---
    for (let i = DEMO; i < N; i++) {
      const status = pick(STATUSES)
      const eventDay = rand(-60, 90)
      const setup = daysFromNow(eventDay)
      const span = rand(1, 4)
      const ret = addDays(setup, span - 1)
      const lineCount = rand(1, 3)
      const lines = []
      for (let li = 0; li < lineCount; li++) {
        const it = pick(invItems)
        if (span > 1 && Math.random() < 0.4) {
          // variable per-day quantities
          lines.push(perDayLine(it, setup, Array.from({ length: span }, () => rand(1, 30))))
        } else {
          lines.push(flatLine(it, rand(1, 30), span))
        }
      }
      await insertBooking({
        customerId: rand(1, N),
        eventName: `${LAST[i % LAST.length]} ${pick(EVENT_TYPES)}`,
        eventType: pick(EVENT_TYPES), status, setup, ret, eventDate: setup, lines,
      })
    }
    console.log(`✅  bookings + booking_items + booking_item_days: ${N}`)

    // ---------- 7. quotations ----------
    for (let i = 0; i < N; i++) {
      const { rows: [seq] } = await client.query("SELECT nextval('quotation_seq')")
      const quotation_number = `QT-${seq.nextval}`
      const inv = money(rand(20000, 150000))
      const labor = money(rand(2000, 20000))
      const transport = money(rand(1000, 10000))
      const decoration = money(rand(5000, 50000))
      const misc = money(rand(0, 5000))
      const subtotal = money(inv + labor + transport + decoration + misc)
      const discount = money(rand(0, 5000))
      const gst_percent = pick([0, 5, 18])
      const gst_amount = money((subtotal - discount) * gst_percent / 100)
      const grand = money(subtotal - discount + gst_amount)
      await client.query(
        `INSERT INTO quotations
         (quotation_number, booking_id, customer_id, valid_until, inventory_charges, labor_charges,
          transport_charges, decoration_charges, misc_charges, subtotal, discount, gst_percent,
          gst_amount, grand_total, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [quotation_number, rand(1, N), rand(1, N), daysFromNow(rand(10, 40)), inv, labor, transport,
         decoration, misc, subtotal, discount, gst_percent, gst_amount, grand,
         pick(["Draft", "Sent", "Accepted", "Rejected"])]
      )
    }
    console.log(`✅  quotations: ${N}`)

    // ---------- 8. quotation_items ----------
    for (let i = 0; i < N; i++) {
      const qty = rand(1, 30)
      const rate = money(rand(50, 1000))
      await client.query(
        `INSERT INTO quotation_items (quotation_id, item_id, description, quantity, rate, amount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [rand(1, N), rand(1, N), ITEM_NAMES[i], qty, rate, money(qty * rate)]
      )
    }
    console.log(`✅  quotation_items: ${N}`)

    // ---------- 9. payments ----------
    for (let i = 0; i < N; i++) {
      await client.query(
        `INSERT INTO payments (booking_id, customer_id, payment_date, payment_method, amount, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [rand(1, N), rand(1, N), daysFromNow(-rand(0, 60)), pick(PAY_METHODS),
         money(rand(5000, 100000)), Math.random() > 0.6 ? "Advance payment" : null]
      )
    }
    console.log(`✅  payments: ${N}`)

    // ---------- 10. invoices ----------
    for (let i = 0; i < N; i++) {
      const { rows: [seq] } = await client.query("SELECT nextval('invoice_seq')")
      const invoice_number = `INV-${seq.nextval}`
      const inv = money(rand(20000, 150000))
      const labor = money(rand(2000, 20000))
      const transport = money(rand(1000, 10000))
      const damage = money(rand(0, 5000))
      const additional = money(rand(0, 5000))
      const subtotal = money(inv + labor + transport + damage + additional)
      const discount = money(rand(0, 5000))
      const gst_percent = pick([0, 5, 18])
      const gst_amount = money((subtotal - discount) * gst_percent / 100)
      const total = money(subtotal - discount + gst_amount)
      const advance = money(rand(0, total))
      const remaining = money(total - advance)
      const payStatus = remaining <= 0 ? "Paid" : advance > 0 ? "Partial" : "Pending"
      await client.query(
        `INSERT INTO invoices
         (invoice_number, booking_id, customer_id, invoice_date, inventory_charges, labor_charges,
          transport_charges, damage_charges, additional_charges, subtotal, discount, gst_percent,
          gst_amount, total_amount, advance_paid, remaining_balance, payment_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [invoice_number, rand(1, N), rand(1, N), daysFromNow(-rand(0, 60)), inv, labor, transport,
         damage, additional, subtotal, discount, gst_percent, gst_amount, total, advance, remaining, payStatus]
      )
    }
    console.log(`✅  invoices: ${N}`)

    // ---------- 11. invoice_items ----------
    for (let i = 0; i < N; i++) {
      const qty = rand(1, 30)
      const rate = money(rand(50, 1000))
      await client.query(
        `INSERT INTO invoice_items (invoice_id, item_id, description, quantity, rate, amount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [rand(1, N), rand(1, N), ITEM_NAMES[i], qty, rate, money(qty * rate)]
      )
    }
    console.log(`✅  invoice_items: ${N}`)

    // ---------- 12. inventory_transactions ----------
    for (let i = 0; i < N; i++) {
      await client.query(
        `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_id, reference_type, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [rand(1, N), pick(TXN_TYPES), rand(1, 50), rand(1, N), "bookings", null]
      )
    }
    console.log(`✅  inventory_transactions: ${N}`)

    // ---------- 13. attendance (unique laborer_id + date) ----------
    for (let i = 0; i < N; i++) {
      await client.query(
        `INSERT INTO attendance (laborer_id, attendance_date, status, overtime_hours)
         VALUES ($1,$2,$3,$4)`,
        [i + 1, daysFromNow(-1), pick(["Present", "Absent", "Half Day"]), money(rand(0, 4))]
      )
    }
    console.log(`✅  attendance: ${N}`)

    // ---------- 14. labor_advances ----------
    for (let i = 0; i < N; i++) {
      await client.query(
        `INSERT INTO labor_advances (laborer_id, advance_date, amount, reason, is_recovered)
         VALUES ($1,$2,$3,$4,$5)`,
        [rand(1, N), daysFromNow(-rand(5, 60)), money(rand(1000, 10000)),
         pick(["Festival", "Medical", "Personal", "Family"]), Math.random() > 0.6]
      )
    }
    console.log(`✅  labor_advances: ${N}`)

    // ---------- 15. salaries (unique laborer_id + month + year) ----------
    const now = new Date()
    for (let i = 0; i < N; i++) {
      const basic = money(rand(8000, 25000))
      const ot = money(rand(0, 5000))
      const advDed = money(rand(0, 3000))
      const otherDed = money(rand(0, 1000))
      const net = money(basic + ot - advDed - otherDed)
      await client.query(
        `INSERT INTO salaries
         (laborer_id, month, year, basic_salary, overtime_amount, advance_deduction, other_deductions,
          net_salary, days_present, days_absent, half_days, payment_method, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [i + 1, now.getMonth() + 1, now.getFullYear(), basic, ot, advDed, otherDed, net,
         rand(20, 30), rand(0, 5), rand(0, 3), pick(PAY_METHODS), pick(["Pending", "Paid"])]
      )
    }
    console.log(`✅  salaries: ${N}`)

    // ---------- 16. expenses ----------
    for (let i = 0; i < N; i++) {
      const cat = pick(EXPENSE_CATS)
      await client.query(
        `INSERT INTO expenses (expense_date, category, amount, description)
         VALUES ($1,$2,$3,$4)`,
        [daysFromNow(-rand(0, 90)), cat, money(rand(500, 20000)), `${cat} expense`]
      )
    }
    console.log(`✅  expenses: ${N}`)

    // ---------- 17. damage_reports ----------
    for (let i = 0; i < N; i++) {
      await client.query(
        `INSERT INTO damage_reports (booking_id, item_id, report_date, damage_type, quantity, estimated_cost, charged_to_customer)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [rand(1, N), rand(1, N), daysFromNow(-rand(0, 60)), pick(["Damaged", "Lost"]),
         rand(1, 10), money(rand(500, 10000)), Math.random() > 0.5]
      )
    }
    console.log(`✅  damage_reports: ${N}`)

    // ---------- 18. notifications ----------
    const NOTIF_TYPES = ["upcoming_event", "pending_payment", "low_stock", "salary_due"]
    for (let i = 0; i < N; i++) {
      const t = pick(NOTIF_TYPES)
      await client.query(
        `INSERT INTO notifications (type, title, message, reference_id, reference_type, is_read)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [t, t.replace(/_/g, " "), `Notification about ${t.replace(/_/g, " ")}`, rand(1, N), "bookings", Math.random() > 0.5]
      )
    }
    console.log(`✅  notifications: ${N}`)

    // ---------- 19. activity_logs ----------
    const ACTIONS = ["booking_created", "booking_updated", "payment_added", "inventory_adjusted", "customer_created"]
    for (let i = 0; i < N; i++) {
      const a = pick(ACTIONS)
      await client.query(
        `INSERT INTO activity_logs (action_type, description, reference_id, reference_type)
         VALUES ($1,$2,$3,$4)`,
        [a, `${a.replace(/_/g, " ")} #${rand(1, N)}`, rand(1, N), "bookings"]
      )
    }
    console.log(`✅  activity_logs: ${N}`)

    // ---------- recompute derived fields ----------
    await client.query(`
      UPDATE customers SET outstanding_balance = COALESCE((
        SELECT SUM(remaining_balance) FROM bookings WHERE bookings.customer_id = customers.id
      ), 0)
    `)

    // Inventory stock counters from actual bookings: reserved = peak quantity
    // committed on any single day (Confirmed/Running), available = rest.
    const peak = new Map()
    for (const [k, q] of committed) {
      const itemId = Number(k.split("|")[0])
      peak.set(itemId, Math.max(peak.get(itemId) || 0, q))
    }
    for (const it of invItems) {
      const reserved = Math.min(peak.get(it.id) || 0, it.total - it.damaged)
      const available = Math.max(it.total - it.damaged - reserved, 0)
      await client.query(
        "UPDATE inventory_items SET reserved_quantity=$1, available_quantity=$2 WHERE id=$3",
        [reserved, available, it.id]
      )
    }

    // keep app sequences ahead of seeded numbers
    await client.query("SELECT setval('invoice_seq', 2000 + $1)", [N])
    await client.query("SELECT setval('quotation_seq', 3000 + $1)", [N])

    console.log(`\n🎉  Done! Seeded ${N} rows per table with consistent formulas.`)
    console.log("   • Plastic Chair (300) is overbooked on", dDate, "— 200+100+100+100 = 500")
    console.log("   • 'Shah Sangeet & Reception' starting", sStart, "uses variable per-day quantities")
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error("❌  Error:", e.message)
  process.exit(1)
})
