import type { RefillItem } from "@/components/refill-table"

export const REFILL_DATA_STORAGE_KEY = "refill_data"

export type RefillDataMap = Record<string, RefillItem[]>

export async function getRefillData(): Promise<RefillDataMap> {
  try {
    const response = await fetch("/api/refill", { cache: "no-store" })
    if (!response.ok) throw new Error("Failed to fetch refill data")

    const items: Array<RefillItem & { machine_id: string }> = await response.json()

    // Transform flat array into nested object by machine_id
    const dataMap: RefillDataMap = {}
    for (const item of items) {
      const machineId = item.machine_id
      if (!dataMap[machineId]) {
        dataMap[machineId] = []
      }
      dataMap[machineId].push(item)
    }

    return dataMap
  } catch (error) {
    console.error("Error fetching refill data:", error)
    return {}
  }
}

export async function saveRefillData(data: RefillDataMap): Promise<void> {
  try {
    // Flatten the nested object into a single array
    const items: Array<RefillItem & { machine_id: string }> = []
    for (const [machineId, machineItems] of Object.entries(data)) {
      for (const item of machineItems) {
        items.push({ ...item, machine_id: machineId })
      }
    }

    const response = await fetch("/api/refill", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    })

    if (!response.ok) throw new Error("Failed to save refill data")
  } catch (error) {
    console.error("Error saving refill data:", error)
  }
}

export async function upsertRefillItems(
  items: Array<RefillItem & { machine_id: string }>
): Promise<boolean> {
  try {
    const response = await fetch("/api/refill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    })
    if (!response.ok) throw new Error("Failed to upsert refill items")
    return true
  } catch (error) {
    console.error("Error upserting refill items:", error)
    return false
  }
}

export async function deleteRefillItem(
  machineId: string,
  slot: string
): Promise<void> {
  try {
    const response = await fetch(
      `/api/refill?machine_id=${encodeURIComponent(machineId)}&slot=${encodeURIComponent(slot)}`,
      { method: "DELETE" }
    )
    if (!response.ok) throw new Error("Failed to delete refill item")
  } catch (error) {
    console.error("Error deleting refill item:", error)
  }
}

export async function deleteRefillItemsByProduct(
  productCode: string
): Promise<void> {
  try {
    const response = await fetch(
      `/api/refill?product_code=${encodeURIComponent(productCode)}`,
      { method: "DELETE" }
    )
    if (!response.ok) throw new Error("Failed to delete refill items by product")
  } catch (error) {
    console.error("Error deleting refill items by product:", error)
  }
}