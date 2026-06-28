import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { dbQuery } from "@/lib/db"

export const runtime = "nodejs"

interface Machine {
  id?: number
  value: string
  label: string
  route?: string
}

async function ensureMachinesRoute() {
  await dbQuery(`
    ALTER TABLE machines
    ADD COLUMN IF NOT EXISTS route VARCHAR(255)
  `)
}

export async function GET() {
  try {
    await ensureMachinesRoute()
    const result = await dbQuery<Machine>(
      "SELECT id, value, label, COALESCE(route, '') AS route FROM machines ORDER BY created_at ASC"
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch machines"
    console.error("[GET /api/machines] Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureMachinesRoute()
    const { value, label, route = "" }: Machine = await request.json()

    if (!value || !label) {
      return NextResponse.json(
        { error: "value and label are required" },
        { status: 400 }
      )
    }

    const result = await dbQuery<Machine>(
      "INSERT INTO machines (value, label, route) VALUES ($1, $2, $3) RETURNING id, value, label, COALESCE(route, '') AS route",
      [value, label, route]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create machine"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureMachinesRoute()
    const { id, value, label, route = "" }: Machine = await request.json()

    if (!id || !value || !label) {
      return NextResponse.json(
        { error: "id, value, and label are required" },
        { status: 400 }
      )
    }

    const existing = await dbQuery<Machine>(
      "SELECT value FROM machines WHERE id = $1",
      [id]
    )
    const oldValue = existing.rows[0]?.value

    const result = await dbQuery<Machine>(
      "UPDATE machines SET value = $1, label = $2, route = $3, updated_at = NOW() WHERE id = $4 RETURNING id, value, label, COALESCE(route, '') AS route",
      [value, label, route, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 })
    }

    if (oldValue && oldValue !== value) {
      await dbQuery(
        "UPDATE refill_items SET machine_id = $1 WHERE machine_id = $2",
        [value, oldValue]
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update machine"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      )
    }

    await dbQuery("DELETE FROM machines WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete machine"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
