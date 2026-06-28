export type ProductType = "RTE" | "GM" | "LLSD"

export interface Product {
  id?: number
  productCode: string
  productName: string
  image: string
  maxQuantity: number
  type?: ProductType | ""
}

function toApiProduct(product: Product) {
  return {
    id: product.id,
    product_code: product.productCode,
    product_name: product.productName,
    image: product.image,
    max_quantity: product.maxQuantity ?? 0,
    type: product.type ?? "",
  }
}

function fromApiProduct(product: {
  id?: number
  product_code: string
  product_name: string
  image?: string | null
  max_quantity?: number | null
  type?: string | null
}): Product {
  return {
    id: product.id,
    productCode: product.product_code,
    productName: product.product_name,
    image: product.image ?? "",
    maxQuantity: product.max_quantity ?? 0,
    type: (product.type as ProductType) ?? "",
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch("/api/products", { cache: "no-store" })
    if (!response.ok) throw new Error("Failed to fetch products")
    const data = await response.json()
    return data.map(fromApiProduct)
  } catch (error) {
    console.error("Error fetching products:", error)
    return []
  }
}

export async function replaceProducts(products: Product[]): Promise<boolean> {
  try {
    const response = await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products.map(toApiProduct)),
    })

    if (!response.ok) throw new Error("Failed to save products")
    return true
  } catch (error) {
    console.error("Error saving products:", error)
    return false
  }
}
