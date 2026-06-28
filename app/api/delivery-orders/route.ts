import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { dbQuery, getDbPool } from "@/lib/db"

export const runtime = "nodejs"

interface DOItem {
  slot: string
  productCode: string
  productName: string
  image?: string
  qty: number
}

interface DeliveryOrder {
  id?: number
  code: string
  machine_id: string
  machine_label: string
  date: string
  status: "pending" | "completed"
  items?: DOItem[]
}

async function ensureImageColumn() {
  await dbQuery(`
    ALTER TABLE delivery_order_items
    ADD COLUMN IF NOT EXISTS image VARCHAR(500)
  `)
}

export async function GET(request: NextRequest) {
  try {
    await ensureImageColumn()

    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (code) {
      const doResult = await dbQuery<DeliveryOrder & { id: number }>(
        "SELECT id, code, machine_id, machine_label, date, status FROM delivery_orders WHERE code = $1",
        [code.toUpperCase()]
      )

      if (doResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Delivery order not found" },
          { status: 404 }
        )
      }

      const order = doResult.rows[0]

      const itemsResult = await dbQuery<DOItem>(
        `SELECT slot,
                product_code AS "productCode",
                product_name AS "productName",
                COALESCE(image, '') AS image,
                qty
         FROM delivery_order_items
         WHERE delivery_order_id = $1
         ORDER BY slot`,
        [order.id]
      )

      return NextResponse.json({ ...order, items: itemsResult.rows })
    }

    // Get all delivery orders with their line items
    const result = await dbQuery<DeliveryOrder>(`
      SELECT
        o.code,
        o.machine_id,
        o.machine_label,
        o.date,
        o.status,
        COALESCE(
          json_agg(
            json_build_object(
              'slot', i.slot,
              'productCode', i.product_code,
              'productName', i.product_name,
              'image', COALESCE(i.image, ''),
              'qty', i.qty
            )
            ORDER BY i.slot
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM delivery_orders o
      LEFT JOIN delivery_order_items i ON i.delivery_order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch delivery orders"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  await ensureImageColumn()

  const pool = getDbPool()
  const client = await pool.connect()
  try {
    const { code, machine_id, machine_label, date, items }: DeliveryOrder & { items: DOItem[] } = await request.json()

    if (!code || !machine_id || !machine_label || !date || !items) {
      return NextResponse.json(
        { error: "code, machine_id, machine_label, date, and items are required" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    const doResult = await client.query<DeliveryOrder & { id: number }>(
      "INSERT INTO delivery_orders (code, machine_id, machine_label, date, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id, code, machine_id, machine_label, date, status",
      [code, machine_id, machine_label, date]
    )

    const orderId = doResult.rows[0].id

    for (const item of items) {
      await client.query(
        `INSERT INTO delivery_order_items
           (delivery_order_id, slot, product_code, product_name, image, qty)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.slot, item.productCode, item.productName, item.image ?? "", item.qty]
      )
    }

    const itemsResult = await client.query<DOItem>(
      `SELECT slot,
              product_code AS "productCode",
              product_name AS "productName",
              COALESCE(image, '') AS image,
              qty
       FROM delivery_order_items
       WHERE delivery_order_id = $1
       ORDER BY slot`,
      [orderId]
    )

    await client.query("COMMIT")

    return NextResponse.json(
      { ...doResult.rows[0], items: itemsResult.rows },
      { status: 201 }
    )
  } catch (error) {
    await client.query("ROLLBACK")
    const message =
      error instanceof Error ? error.message : "Failed to create delivery order"
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { code, status }: { code: string; status: "pending" | "completed" } = await request.json()

    if (!code || !status) {
      return NextResponse.json(
        { error: "code and status are required" },
        { status: 400 }
      )
    }

    const result = await dbQuery<DeliveryOrder>(
      "UPDATE delivery_orders SET status = $1, updated_at = NOW() WHERE code = $2 RETURNING code, machine_id, machine_label, date, status",
      [status, code.toUpperCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Delivery order not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update delivery order"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
