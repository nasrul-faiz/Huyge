import type { ProductType } from "@/lib/product-store"

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

export const STOCK_IN_COLORS = ["#3B82F6", "#F97316", "#92400E", "#22C55E", "#A855F7", "#EC4899", "#EAB308"]
export const MOVE_FRONT_COLORS = ["#EAB308", "#3B82F6", "#F97316", "#92400E", "#22C55E", "#A855F7", "#EC4899"]
export const EXPIRED_COLORS = ["#EC4899", "#EAB308", "#3B82F6", "#F97316", "#92400E", "#22C55E", "#A855F7"]

export const COLOR_LABELS = [
  { color: "#3B82F6", label: "Blue" },
  { color: "#F97316", label: "Orange" },
  { color: "#92400E", label: "Brown" },
  { color: "#22C55E", label: "Green" },
  { color: "#A855F7", label: "Purple" },
  { color: "#EC4899", label: "Pink" },
  { color: "#EAB308", label: "Yellow" },
] as const

export interface RteBatch {
  color: string
  quantity: number
}

export function getTodayExpiredIndex(date = new Date()) {
  return (date.getDay() + 6) % 7
}

export function getTodayExpiredInfo(date = new Date()) {
  const index = getTodayExpiredIndex(date)
  const color = EXPIRED_COLORS[index]
  const match = COLOR_LABELS.find((item) => item.color === color)

  return {
    index,
    day: DAYS[index],
    color,
    label: match?.label ?? color,
  }
}

export function getTodayStockInInfo(date = new Date()) {
  const index = getTodayExpiredIndex(date)
  const color = STOCK_IN_COLORS[index]
  const match = COLOR_LABELS.find((item) => item.color === color)

  return {
    index,
    day: DAYS[index],
    color,
    label: match?.label ?? color,
  }
}

export function isRteProduct(type?: ProductType | "") {
  return type === "RTE"
}

function normalizeHexColor(color: string) {
  return color.trim().toUpperCase()
}

export function normalizeRteBatches(raw: unknown): RteBatch[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const color = "color" in item && typeof item.color === "string" ? normalizeHexColor(item.color) : ""
      const quantity =
        "quantity" in item && typeof item.quantity === "number"
          ? Math.max(0, Math.floor(item.quantity))
          : 0

      if (!color || quantity <= 0) return null
      return { color, quantity }
    })
    .filter((item): item is RteBatch => item !== null)
}

function getFrontExpiredBatchQty(batches: RteBatch[], expiredColor: string) {
  let total = 0
  for (const batch of batches) {
    if (normalizeHexColor(batch.color) !== expiredColor) {
      break
    }
    total += batch.quantity
  }
  return total
}

function consumeFromFront(batches: RteBatch[], quantity: number): RteBatch[] {
  let remaining = Math.max(0, quantity)
  const next = batches.map((batch) => ({ ...batch }))

  while (remaining > 0 && next.length > 0) {
    const front = next[0]
    if (front.quantity <= remaining) {
      remaining -= front.quantity
      next.shift()
      continue
    }

    front.quantity -= remaining
    remaining = 0
  }

  return next
}

function appendToBack(batches: RteBatch[], color: string, quantity: number): RteBatch[] {
  if (quantity <= 0) return batches

  const normalizedColor = normalizeHexColor(color)
  const next = batches.map((batch) => ({ ...batch }))
  const last = next[next.length - 1]

  if (last && normalizeHexColor(last.color) === normalizedColor) {
    last.quantity += quantity
    return next
  }

  next.push({ color: normalizedColor, quantity })
  return next
}

function sumBatchQuantity(batches: RteBatch[]) {
  return batches.reduce((sum, batch) => sum + batch.quantity, 0)
}

export function getRteAutoStockOutQuantity(item: {
  currentInventory: number
  productType?: ProductType | ""
  rteBatches?: RteBatch[]
}, date = new Date()) {
  if (!isRteProduct(item.productType)) return 0

  const batches = normalizeRteBatches(item.rteBatches)
  if (batches.length === 0) {
    // Backward compatible fallback for records created before batch tracking.
    return Math.max(0, item.currentInventory)
  }

  const expiredColor = normalizeHexColor(getTodayExpiredInfo(date).color)
  return getFrontExpiredBatchQty(batches, expiredColor)
}

export function applyRteRefillCycle(
  item: {
    currentInventory: number
    productType?: ProductType | ""
    rteBatches?: RteBatch[]
  },
  row: { stockIn: number; overflow: number },
  date = new Date()
) {
  const acceptedStockIn = Math.max(0, row.stockIn - row.overflow)
  const stockInColor = getTodayStockInInfo(date).color
  const existingBatches = normalizeRteBatches(item.rteBatches)

  if (existingBatches.length === 0) {
    const fallbackStockOut = Math.max(0, item.currentInventory)
    const nextBatches = appendToBack([], stockInColor, acceptedStockIn)
    return {
      stockOut: fallbackStockOut,
      rteBatches: nextBatches,
      nextInventory: sumBatchQuantity(nextBatches),
    }
  }

  const expiredColor = normalizeHexColor(getTodayExpiredInfo(date).color)
  const stockOut = getFrontExpiredBatchQty(existingBatches, expiredColor)
  const consumed = consumeFromFront(existingBatches, stockOut)
  const nextBatches = appendToBack(consumed, stockInColor, acceptedStockIn)

  return {
    stockOut,
    rteBatches: nextBatches,
    nextInventory: sumBatchQuantity(nextBatches),
  }
}

export function getAutoStockOutQuantity(item: {
  currentInventory: number
  productType?: ProductType | ""
  rteBatches?: RteBatch[]
}) {
  return getRteAutoStockOutQuantity(item)
}