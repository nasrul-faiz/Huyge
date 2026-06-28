import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { dbQuery } from "@/lib/db"

export const runtime = "nodejs"
export const preferredRegion = ["iad1"]

function getTokenFromRequest(request: NextRequest): string {
  const headerToken = request.headers.get("x-migration-token")
  if (headerToken) {
    return headerToken
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim()
  }

  return ""
}

async function runSchemaMigration(): Promise<number> {
  const sqlFilePath = path.join(process.cwd(), "lib", "db-setup.sql")
  const sql = await readFile(sqlFilePath, "utf8")

  const statements = sql
    .replace(/\r\n/g, "\n")
    .split(/;\s*\n/g)
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await dbQuery(statement)
  }

  return statements.length
}

export async function GET() {
  try {
    const result = await dbQuery<{
      machines: string | null
      products: string | null
      refill_items: string | null
      delivery_orders: string | null
      delivery_order_items: string | null
      refill_history: string | null
    }>(`
      SELECT
        to_regclass('public.machines')::text AS machines,
        to_regclass('public.products')::text AS products,
        to_regclass('public.refill_items')::text AS refill_items,
        to_regclass('public.delivery_orders')::text AS delivery_orders,
        to_regclass('public.delivery_order_items')::text AS delivery_order_items,
        to_regclass('public.refill_history')::text AS refill_history
    `)

    const row = result.rows[0]
    const ready = Boolean(
      row?.machines &&
        row?.products &&
        row?.refill_items &&
        row?.delivery_orders &&
        row?.delivery_order_items &&
        row?.refill_history
    )

    return NextResponse.json({
      ok: true,
      ready,
      tables: row ?? null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check schema status"

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.DB_MIGRATION_TOKEN
  const providedToken = getTokenFromRequest(request)

  if (!expectedToken) {
    return NextResponse.json(
      {
        ok: false,
        message: "DB_MIGRATION_TOKEN is not configured",
      },
      { status: 500 }
    )
  }

  if (!providedToken || providedToken !== expectedToken) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized",
      },
      { status: 401 }
    )
  }

  try {
    const executedStatements = await runSchemaMigration()

    return NextResponse.json({
      ok: true,
      message: "Database schema migration completed",
      executedStatements,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to run schema migration"

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    )
  }
}