import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { dbQuery } from "@/lib/db"

export const runtime = "nodejs"

interface RefillHistoryRow {
  id: number
  machine_id: string
  machine_label: string
  date: string
  do_code: string | null
  items: unknown
}

async function ensureRefillHistorySchema() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS refill_history (
      id SERIAL PRIMARY KEY,
      machine_id VARCHAR(50) NOT NULL,
      machine_label VARCHAR(255) NOT NULL,
      date VARCHAR(50) NOT NULL,
      do_code VARCHAR(50),
      items JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_refill_history_machine_date
    ON refill_history(machine_id, date DESC)
  `)

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_refill_history_machine_do_created
    ON refill_history(machine_id, do_code, created_at DESC)
  `)
}

export async function GET(request: NextRequest) {
  try {
    await ensureRefillHistorySchema()

    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get("machine_id")

    const fromDate = searchParams.get("from_date")
    const toDate = searchParams.get("to_date")

    const where: string[] = []
    const params: string[] = []

    if (machineId) {
      params.push(machineId)
      where.push(`machine_id = $${params.length}`)
    }

    if (fromDate) {
      params.push(fromDate)
      where.push(`LEFT(date, 10) >= $${params.length}`)
    }

    if (toDate) {
      params.push(toDate)
      where.push(`LEFT(date, 10) <= $${params.length}`)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""

    const result = await dbQuery<RefillHistoryRow>(
      `SELECT id, machine_id, machine_label, date, do_code, items
       FROM refill_history
       ${whereClause}
       ORDER BY date DESC, id DESC`,
      params
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch refill history"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRefillHistorySchema()

    const payload = await request.json()
    const machineId = payload.machine_id as string | undefined
    const machineLabel = payload.machine_label as string | undefined
    const date = payload.date as string | undefined
    const doCode = (payload.do_code ?? null) as string | null
    const items = payload.items as unknown

    if (!machineId || !machineLabel || !date || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "machine_id, machine_label, date, and items array are required" },
        { status: 400 }
      )
    }

    const duplicateResult = await dbQuery<RefillHistoryRow>(
      `SELECT id, machine_id, machine_label, date, do_code, items
       FROM refill_history
       WHERE machine_id = $1
         AND COALESCE(do_code, '') = COALESCE($2, '')
         AND items = $3::jsonb
         AND created_at >= NOW() - INTERVAL '2 minutes'
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [machineId, doCode, JSON.stringify(items)]
    )

    if (duplicateResult.rows.length > 0) {
      return NextResponse.json(duplicateResult.rows[0])
    }

    const result = await dbQuery<RefillHistoryRow>(
      `INSERT INTO refill_history (machine_id, machine_label, date, do_code, items)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, machine_id, machine_label, date, do_code, items`,
      [machineId, machineLabel, date, doCode, JSON.stringify(items)]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save refill history"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
