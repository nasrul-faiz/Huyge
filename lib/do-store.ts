export interface DOItem {
  slot: string
  productCode: string
  productName: string
  image?: string
  qty: number
}

export interface DeliveryOrder {
  code: string
  machineId: string
  machineLabel: string
  date: string
  items: DOItem[]
  status: "pending" | "completed"
}

export const DELIVERY_ORDERS_STORAGE_KEY = "delivery_orders"
export const DELIVERY_ORDERS_UPDATED_EVENT = "delivery-orders-updated"

function emitDeliveryOrdersUpdated(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(DELIVERY_ORDERS_UPDATED_EVENT))
}

export function generateDOCode(): string {
  const now = new Date()
  const date = now.toISOString().slice(2, 10).replace(/-/g, "")
  const seq = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `DO-${date}-${seq}`
}

export async function saveDO(order: DeliveryOrder): Promise<DeliveryOrder> {
  const response = await fetch("/api/delivery-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: order.code,
      machine_id: order.machineId,
      machine_label: order.machineLabel,
      date: order.date,
      items: order.items,
    }),
  })

  if (!response.ok) {
    let message = "Failed to save delivery order"
    try {
      const data = await response.json()
      if (data?.error) message = data.error
    } catch {
      // Keep fallback message when response body is not JSON.
    }
    throw new Error(message)
  }

  const created = await response.json()
  emitDeliveryOrdersUpdated()
  return {
    code: created.code,
    machineId: created.machine_id,
    machineLabel: created.machine_label,
    date: created.date,
    status: created.status,
    items: (created.items || []).map((i: any) => ({
      slot: i.slot,
      productCode: i.productCode,
      productName: i.productName,
      image: i.image ?? "",
      qty: i.qty,
    })),
  }
}

export async function getAllDOs(): Promise<DeliveryOrder[]> {
  try {
    const response = await fetch("/api/delivery-orders", { cache: "no-store" })
    if (!response.ok) throw new Error("Failed to fetch delivery orders")
    const data = await response.json()
    return data.map(
      (order: any) => ({
        code: order.code,
        machineId: order.machine_id,
        machineLabel: order.machine_label,
        date: order.date,
        status: order.status,
        items: (order.items || []).map((i: any) => ({
          slot: i.slot,
          productCode: i.productCode,
          productName: i.productName,
          image: i.image ?? "",
          qty: i.qty,
        })),
      })
    )
  } catch (error) {
    console.error("Error fetching delivery orders:", error)
    return []
  }
}

export async function getDOByCode(code: string): Promise<DeliveryOrder | null> {
  try {
    const response = await fetch(`/api/delivery-orders?code=${code}`, {
      cache: "no-store",
    })
    if (!response.ok) return null
    const order = await response.json()
    return {
      code: order.code,
      machineId: order.machine_id,
      machineLabel: order.machine_label,
      date: order.date,
      status: order.status,
      items: (order.items || []).map((i: any) => ({
        slot: i.slot,
        productCode: i.productCode,
        productName: i.productName,
        image: i.image ?? "",
        qty: i.qty,
      })),
    }
  } catch (error) {
    console.error("Error fetching delivery order:", error)
    return null
  }
}

export async function markDOComplete(code: string): Promise<void> {
  try {
    const response = await fetch("/api/delivery-orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, status: "completed" }),
    })

    if (!response.ok) throw new Error("Failed to mark DO as complete")
    emitDeliveryOrdersUpdated()
  } catch (error) {
    console.error("Error marking delivery order complete:", error)
  }
}
