import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { dbQuery, getDbPool } from "@/lib/db"

export const runtime = "nodejs"

interface RteBatch {
  color?: string
  quantity: number
  stockedAt?: string
  expiresAt?: string
}

let refillSchemaReadyPromise: Promise<void> | null = null

async function ensureRefillSchemaInternal() {
  await dbQuery(`
    ALTER TABLE refill_items
    ADD COLUMN IF NOT EXISTS rte_batches JSONB DEFAULT '[]'::jsonb
  `)
}

async function ensureRefillSchema() {
  if (!refillSchemaReadyPromise) {
    refillSchemaReadyPromise = ensureRefillSchemaInternal().catch((error) => {
      refillSchemaReadyPromise = null
      throw error
    })
  }

  await refillSchemaReadyPromise
}

function normalizeRteBatches(raw: unknown): RteBatch[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const color = "color" in item && typeof item.color === "string" ? item.color.trim().toUpperCase() : ""
      const quantity =
        "quantity" in item && typeof item.quantity === "number"
          ? Math.max(0, Math.floor(item.quantity))
          : 0
      const stockedAt =
        "stockedAt" in item && typeof item.stockedAt === "string" && item.stockedAt.trim()
          ? item.stockedAt.trim()
          : undefined
      const expiresAt =
        "expiresAt" in item && typeof item.expiresAt === "string" && item.expiresAt.trim()
          ? item.expiresAt.trim()
          : undefined

      if (quantity <= 0) return null
      return {
        color: color || undefined,
        quantity,
        stockedAt,
        expiresAt,
      }
    })
    .filter((item): item is RteBatch => item !== null)
}

interface RefillItem {
  id?: number
  machine_id: string
  slot: string
  productCode: string
  productName: string
  image: string
  productType?: string
  rteBatches?: RteBatch[]
  stockIn: number
  overflow: number
  stockOut: number
  currentInventory: number
  maxCapacity: number
}

export async function GET(request: NextRequest) {
  try {
    await ensureRefillSchema()

    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get("machine_id")

    let query = `
      SELECT
        refill_items.*,
        COALESCE(refill_items.rte_batches, '[]'::jsonb) AS rte_batches,
        COALESCE(products.type, '') AS product_type
      FROM refill_items
      LEFT JOIN products ON products.product_code = refill_items.product_code
    `
    const params: (string | null)[] = []

    if (machineId) {
      query += " WHERE machine_id = $1"
      params.push(machineId)
    }

    query += " ORDER BY machine_id, slot ASC"

    const result = await dbQuery<any>(query, params)
    
    // Convert snake_case to camelCase
    const converted = result.rows.map((row: any) => ({
      machine_id: row.machine_id,
      slot: row.slot,
      productCode: row.product_code,
      productName: row.product_name,
      image: row.image,
      productType: row.product_type,
      rteBatches: normalizeRteBatches(row.rte_batches),
      stockIn: row.stock_in,
      overflow: row.overflow,
      stockOut: row.stock_out,
      currentInventory: row.current_inventory,
      maxCapacity: row.max_capacity,
    }))
    
    return NextResponse.json(converted)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch refill items"
    console.error("[GET /api/refill] Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRefillSchema()

    const items: RefillItem[] = await request.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Array of items is required" },
        { status: 400 }
      )
    }

    const createdItems: RefillItem[] = []

    for (const item of items) {
      const result = await dbQuery<RefillItem>(
        `INSERT INTO refill_items 
         (machine_id, slot, product_code, product_name, image, rte_batches, stock_in, overflow, stock_out, current_inventory, max_capacity)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)
         ON CONFLICT (machine_id, slot) DO UPDATE SET
         product_code = $3,
         product_name = $4,
         image = $5,
         rte_batches = $6::jsonb,
         stock_in = $7,
         overflow = $8,
         stock_out = $9,
         current_inventory = $10,
         max_capacity = $11,
         updated_at = NOW()
         RETURNING *`,
        [
          item.machine_id,
          item.slot,
          item.productCode,
          item.productName,
          item.image,
          JSON.stringify(normalizeRteBatches(item.rteBatches)),
          item.stockIn,
          item.overflow,
          item.stockOut,
          item.currentInventory,
          item.maxCapacity,
        ]
      )
      createdItems.push(result.rows[0])
    }

    return NextResponse.json(createdItems, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save refill items"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureRefillSchema()

    const payload: RefillItem | RefillItem[] = await request.json()

    if (Array.isArray(payload)) {
      const pool = getDbPool()
      const client = await pool.connect()

      try {
        await client.query("BEGIN")
        await client.query("DELETE FROM refill_items")

        for (const item of payload) {
          await client.query(
            `INSERT INTO refill_items
             (machine_id, slot, product_code, product_name, image, rte_batches, stock_in, overflow, stock_out, current_inventory, max_capacity)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)`,
            [
              item.machine_id,
              item.slot,
              item.productCode,
              item.productName,
              item.image,
              JSON.stringify(normalizeRteBatches(item.rteBatches)),
              item.stockIn,
              item.overflow,
              item.stockOut,
              item.currentInventory,
              item.maxCapacity,
            ]
          )
        }

        await client.query("COMMIT")
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      } finally {
        client.release()
      }

      return NextResponse.json({ success: true })
    }

    const item = payload

    if (!item.machine_id || !item.slot) {
      return NextResponse.json(
        { error: "machine_id and slot are required" },
        { status: 400 }
      )
    }

    const result = await dbQuery<RefillItem>(
      `UPDATE refill_items SET
       product_code = $1,
       product_name = $2,
       image = $3,
       rte_batches = $4::jsonb,
       stock_in = $5,
       overflow = $6,
       stock_out = $7,
       current_inventory = $8,
       max_capacity = $9,
       updated_at = NOW()
       WHERE machine_id = $10 AND slot = $11
       RETURNING *`,
      [
        item.productCode,
        item.productName,
        item.image,
        JSON.stringify(normalizeRteBatches(item.rteBatches)),
        item.stockIn,
        item.overflow,
        item.stockOut,
        item.currentInventory,
        item.maxCapacity,
        item.machine_id,
        item.slot,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Refill item not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update refill item"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get("machine_id")
    const slot = searchParams.get("slot")
    const productCode = searchParams.get("product_code")

    if (machineId && slot) {
      await dbQuery(
        "DELETE FROM refill_items WHERE machine_id = $1 AND slot = $2",
        [machineId, slot]
      )
    } else if (productCode) {
      await dbQuery(
        "DELETE FROM refill_items WHERE product_code = $1",
        [productCode]
      )
    } else if (machineId) {
      await dbQuery(
        "DELETE FROM refill_items WHERE machine_id = $1",
        [machineId]
      )
    } else {
      return NextResponse.json(
        { error: "machine_id+slot, product_code, or machine_id is required" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete refill item"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
