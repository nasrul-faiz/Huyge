import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { dbQuery, getDbPool } from "@/lib/db"
import { ensureProductsSchema } from "@/lib/db-schema"

export const runtime = "nodejs"

interface Product {
  id?: number
  product_code: string
  product_name: string
  image: string
  max_quantity?: number
  type?: string
}

export async function GET() {
  try {
    await ensureProductsSchema()

    const result = await dbQuery<Product>(
      "SELECT id, product_code, product_name, COALESCE(image, '') AS image, COALESCE(max_quantity, 0) AS max_quantity, COALESCE(type, '') AS type FROM products ORDER BY product_code ASC"
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch products"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureProductsSchema()

    const { product_code, product_name, image = "", max_quantity = 0, type = "" }: Product = await request.json()

    if (!product_code || !product_name) {
      return NextResponse.json(
        { error: "product_code and product_name are required" },
        { status: 400 }
      )
    }

    const result = await dbQuery<Product>(
      `INSERT INTO products (product_code, product_name, image, max_quantity, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, product_code, product_name, COALESCE(image, '') AS image, COALESCE(max_quantity, 0) AS max_quantity, COALESCE(type, '') AS type`,
      [product_code, product_name, image, max_quantity, type]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureProductsSchema()

    const payload = await request.json()

    if (Array.isArray(payload)) {
      const pool = getDbPool()
      const client = await pool.connect()

      try {
        await client.query("BEGIN")
        await client.query("DELETE FROM products")

        for (const product of payload as Product[]) {
          if (!product.product_code || !product.product_name) {
            throw new Error("product_code and product_name are required")
          }

          await client.query(
            `INSERT INTO products (product_code, product_name, image, max_quantity, type)
             VALUES ($1, $2, $3, $4, $5)`,
            [product.product_code, product.product_name, product.image ?? "", product.max_quantity ?? 0, product.type ?? ""]
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

    const {
      id,
      product_code,
      product_name,
      image = "",
      max_quantity = 0,
      type = "",
      previous_product_code,
    }: Product & { previous_product_code?: string } = payload

    if (!id || !product_code || !product_name) {
      return NextResponse.json(
        { error: "id, product_code, and product_name are required" },
        { status: 400 }
      )
    }

    const result = await dbQuery<Product>(
      `UPDATE products
       SET product_code = $1, product_name = $2, image = $3, max_quantity = $4, type = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, product_code, product_name, COALESCE(image, '') AS image, COALESCE(max_quantity, 0) AS max_quantity, COALESCE(type, '') AS type`,
      [product_code, product_name, image, max_quantity, type, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    await dbQuery(
      `UPDATE refill_items
       SET product_code = $1, product_name = $2, image = $3, updated_at = NOW()
       WHERE product_code = $4`,
      [product_code, product_name, image, previous_product_code ?? product_code]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureProductsSchema()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const productCode = searchParams.get("product_code")

    if (!id && !productCode) {
      return NextResponse.json(
        { error: "id or product_code is required" },
        { status: 400 }
      )
    }

    let deletedProductCode = productCode

    if (id) {
      const existing = await dbQuery<{ product_code: string }>(
        "SELECT product_code FROM products WHERE id = $1",
        [id]
      )
      deletedProductCode = existing.rows[0]?.product_code ?? deletedProductCode
      await dbQuery("DELETE FROM products WHERE id = $1", [id])
    } else {
      await dbQuery("DELETE FROM products WHERE product_code = $1", [productCode])
    }

    if (deletedProductCode) {
      await dbQuery("DELETE FROM refill_items WHERE product_code = $1", [deletedProductCode])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
