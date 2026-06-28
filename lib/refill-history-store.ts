import type { RefillItem } from "@/components/refill-table"

export type RefillHistoryItem = RefillItem

export interface RefillHistoryEntry {
  id: number
  machineId: string
  machineLabel: string
  date: string
  doCode: string | null
  items: RefillHistoryItem[]
}

interface RefillHistoryApiEntry {
  id: number
  machine_id: string
  machine_label: string
  date: string
  do_code: string | null
  items?: RefillHistoryItem[]
}

interface SaveRefillHistoryPayload {
  machineId: string
  machineLabel: string
  date: string
  doCode: string | null
  items: RefillHistoryItem[]
}

interface GetRefillHistoryOptions {
  machineId?: string
  fromDate?: string
  toDate?: string
}

export async function getRefillHistory(
  options: GetRefillHistoryOptions = {}
): Promise<RefillHistoryEntry[]> {
  try {
    const params = new URLSearchParams()

    if (options.machineId) {
      params.set("machine_id", options.machineId)
    }

    if (options.fromDate) {
      params.set("from_date", options.fromDate)
    }

    if (options.toDate) {
      params.set("to_date", options.toDate)
    }

    const query = params.toString()

    const response = await fetch(`/api/refill-history${query ? `?${query}` : ""}`, {
      cache: "no-store",
    })

    if (!response.ok) throw new Error("Failed to fetch refill history")

    const data: RefillHistoryApiEntry[] = await response.json()
    return data.map((entry) => ({
      id: entry.id,
      machineId: entry.machine_id,
      machineLabel: entry.machine_label,
      date: entry.date,
      doCode: entry.do_code ?? null,
      items: (entry.items ?? []) as RefillHistoryItem[],
    }))
  } catch (error) {
    console.error("Error fetching refill history:", error)
    return []
  }
}

export async function saveRefillHistory(
  payload: SaveRefillHistoryPayload
): Promise<boolean> {
  try {
    const response = await fetch("/api/refill-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machine_id: payload.machineId,
        machine_label: payload.machineLabel,
        date: payload.date,
        do_code: payload.doCode,
        items: payload.items,
      }),
    })

    if (!response.ok) throw new Error("Failed to save refill history")
    return true
  } catch (error) {
    console.error("Error saving refill history:", error)
    return false
  }
}
