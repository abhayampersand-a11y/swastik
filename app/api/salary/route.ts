import { NextRequest, NextResponse } from "next/server"
import { query, withTransaction } from "@/lib/db"
import { notify } from "@/lib/notifications"

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month")
  const year = req.nextUrl.searchParams.get("year")

  try {
    let sql = `
      SELECT s.*, l.name as laborer_name, l.salary_type, l.basic_salary as base_salary
      FROM salaries s JOIN laborers l ON s.laborer_id = l.id
      WHERE 1=1
    `
    const params: unknown[] = []
    if (month) { params.push(month); sql += ` AND s.month=$${params.length}` }
    if (year) { params.push(year); sql += ` AND s.year=$${params.length}` }
    sql += " ORDER BY l.name"
    const salaries = await query(sql, params)
    return NextResponse.json({ salaries })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Auto-calculate salary for a laborer/month/year
  try {
    const { laborer_id, month, year, other_deductions = 0, payment_method, notes } = await req.json()

    const laborer = await query<{
      name: string; basic_salary: string; overtime_rate: string; salary_type: string
    }>(
      "SELECT name, basic_salary, overtime_rate, salary_type FROM laborers WHERE id=$1",
      [laborer_id]
    )
    if (!laborer[0]) return NextResponse.json({ error: "Laborer not found" }, { status: 404 })

    const { name: laborerName, basic_salary, overtime_rate, salary_type } = laborer[0]

    // Count attendance
    const attRows = await query<{
      status: string; overtime_hours: string; cnt: string
    }>(
      `SELECT status, overtime_hours, COUNT(*) as cnt
       FROM attendance
       WHERE laborer_id=$1 AND EXTRACT(MONTH FROM attendance_date)=$2 AND EXTRACT(YEAR FROM attendance_date)=$3
       GROUP BY status, overtime_hours`,
      [laborer_id, month, year]
    )

    let present = 0, absent = 0, halfDays = 0, totalOT = 0
    for (const r of attRows) {
      const c = parseInt(r.cnt)
      if (r.status === "Present") present += c
      else if (r.status === "Absent") absent += c
      else if (r.status === "Half Day") halfDays += c
      totalOT += parseFloat(r.overtime_hours) * c
    }

    const effectiveDays = present + halfDays * 0.5
    const totalWorkDays = present + absent + halfDays

    let baseSalaryCalc = parseFloat(basic_salary)
    if (salary_type === "Daily") {
      baseSalaryCalc = baseSalaryCalc * effectiveDays
    }

    const overtimeAmount = totalOT * parseFloat(overtime_rate)

    // Pending advances — deduct only this month's installment per advance.
    // monthly_deduction NULL means "recover as much as possible".
    const advances = await query<{ pending: string; monthly_deduction: string | null }>(
      `SELECT (amount - recovered_amount) as pending, monthly_deduction
       FROM labor_advances
       WHERE laborer_id=$1 AND is_recovered=FALSE AND amount > recovered_amount
       ORDER BY advance_date, id`,
      [laborer_id]
    )

    const grossPay = baseSalaryCalc + overtimeAmount - parseFloat(other_deductions)
    let advanceDeduction = 0
    for (const adv of advances) {
      const pending = parseFloat(adv.pending)
      const installment = adv.monthly_deduction
        ? Math.min(parseFloat(adv.monthly_deduction), pending)
        : pending
      // Never deduct beyond what's left of this month's pay
      advanceDeduction += Math.min(installment, Math.max(0, grossPay - advanceDeduction))
    }

    const netSalary = grossPay - advanceDeduction

    const [salary] = await query(
      `INSERT INTO salaries
       (laborer_id, month, year, basic_salary, overtime_amount, advance_deduction,
        other_deductions, net_salary, days_present, days_absent, half_days,
        overtime_hours, payment_method, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Pending',$14)
       ON CONFLICT (laborer_id, month, year)
       DO UPDATE SET basic_salary=$4, overtime_amount=$5, advance_deduction=$6,
         other_deductions=$7, net_salary=$8, days_present=$9, days_absent=$10,
         half_days=$11, overtime_hours=$12, payment_method=$13, notes=$14
       RETURNING *`,
      [laborer_id, month, year, baseSalaryCalc, overtimeAmount, advanceDeduction,
       other_deductions, netSalary, present, absent, halfDays,
       totalOT, payment_method, notes]
    )

    // A freshly calculated salary is Pending — remind that it's due to be paid.
    if (salary.status !== "Paid") {
      await notify({
        type: "salary_due",
        title: `Salary pending: ${laborerName}`,
        message: `Net ₹${netSalary.toLocaleString("en-IN")} for ${month}/${year}`,
        reference_id: salary.id as number,
        reference_type: "salaries",
      })
    }

    return NextResponse.json({ salary }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to calculate salary" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  // Mark salary as paid and apply this month's deduction to advances (oldest first)
  try {
    const { salary_id, payment_date } = await req.json()

    const salary = await withTransaction(async (client) => {
      const { rows: [salary] } = await client.query(
        `UPDATE salaries SET status='Paid', payment_date=$1 WHERE id=$2 RETURNING *`,
        [payment_date, salary_id]
      )

      let toRecover = parseFloat(salary.advance_deduction) || 0
      if (toRecover > 0) {
        const { rows: advances } = await client.query<{
          id: number; amount: string; recovered_amount: string
        }>(
          `SELECT id, amount, recovered_amount FROM labor_advances
           WHERE laborer_id=$1 AND is_recovered=FALSE AND amount > recovered_amount
           ORDER BY advance_date, id
           FOR UPDATE`,
          [salary.laborer_id]
        )

        for (const adv of advances) {
          if (toRecover <= 0) break
          const pending = parseFloat(adv.amount) - parseFloat(adv.recovered_amount)
          const portion = Math.min(pending, toRecover)
          await client.query(
            `UPDATE labor_advances SET
             recovered_amount = recovered_amount + $1,
             is_recovered = (recovered_amount + $1 >= amount)
             WHERE id=$2`,
            [portion, adv.id]
          )
          toRecover -= portion
        }
      }

      return salary
    })

    return NextResponse.json({ salary })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to mark paid" }, { status: 500 })
  }
}
