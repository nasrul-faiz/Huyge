import { dbQuery } from "@/lib/db"

let productsSchemaPromise: Promise<void> | null = null

async function ensureProductsSchemaInternal() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      product_code VARCHAR(100) UNIQUE NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      image VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await dbQuery(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS image VARCHAR(500)
  `)

  await dbQuery(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
  `)

  await dbQuery(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
  `)

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_products_product_code
    ON products(product_code)
  `)

  await dbQuery(`
    ALTER TABLE refill_items
    ADD COLUMN IF NOT EXISTS image VARCHAR(500)
  `)

  await dbQuery(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS max_quantity INTEGER DEFAULT 0
  `)

  await dbQuery(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS type VARCHAR(10)
  `)
}

export async function ensureProductsSchema() {
  if (!productsSchemaPromise) {
    productsSchemaPromise = ensureProductsSchemaInternal().catch((error) => {
      productsSchemaPromise = null
      throw error
    })
  }

  await productsSchemaPromise
}