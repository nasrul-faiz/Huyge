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
  color?: string
  quantity: number
  stockedAt?: string
  expiresAt?: string
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

function toIsoOrUndefined(raw: unknown) {
  if (typeof raw !== "string") return undefined
  const value = raw.trim()
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

function getDefaultExpiryFromNow(date = new Date()) {
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(0, 0, 0, 0)
  return nextDay.toISOString()
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
      const stockedAt = "stockedAt" in item ? toIsoOrUndefined(item.stockedAt) : undefined
      const expiresAt = "expiresAt" in item ? toIsoOrUndefined(item.expiresAt) : undefined

      if (quantity <= 0) return null
      return {
        color: color || undefined,
        quantity,
        stockedAt,
        expiresAt: expiresAt ?? getDefaultExpiryFromNow(),
      }
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

function isExpiredBatch(batch: RteBatch, now = new Date()) {
  if (!batch.expiresAt) return false
  const parsed = new Date(batch.expiresAt)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getTime() <= now.getTime()
}

function clampStockOut(requested: number, currentInventory: number) {
  return Math.max(0, Math.min(Math.floor(requested), Math.max(0, Math.floor(currentInventory))))
}

function consumeBatchesFromFrontByQty(batches: RteBatch[], quantity: number): RteBatch[] {
  return consumeFromFront(batches, quantity)
}

function alignBatchesWithInventory(batches: RteBatch[], currentInventory: number) {
  const safeInventory = Math.max(0, Math.floor(currentInventory))
  const total = sumBatchQuantity(batches)

  if (total <= safeInventory) return batches

  // Reduce from front (FIFO/FEFO-style) so tracked batches never exceed real inventory.
  return consumeBatchesFromFrontByQty(batches, total - safeInventory)
}

function appendDateBatchToBack(batches: RteBatch[], quantity: number, now = new Date()) {
  const qty = Math.max(0, Math.floor(quantity))
  if (qty <= 0) return batches

  const stockedAt = now.toISOString()
  const expiresAt = getDefaultExpiryFromNow(now)
  const next = batches.map((batch) => ({ ...batch }))
  const last = next[next.length - 1]

  if (last?.expiresAt === expiresAt) {
    last.quantity += qty
    return next
  }

  next.push({ quantity: qty, stockedAt, expiresAt })
  return next
}

export function getRteSuggestedStockOutQuantity(item: {
  currentInventory: number
  productType?: ProductType | ""
  rteBatches?: RteBatch[]
}, now = new Date()) {
  if (!isRteProduct(item.productType)) return 0

  const normalized = alignBatchesWithInventory(
    normalizeRteBatches(item.rteBatches),
    item.currentInventory
  )

  const expiredQty = normalized.reduce((sum, batch) => {
    if (!isExpiredBatch(batch, now)) return sum
    return sum + batch.quantity
  }, 0)

  return clampStockOut(expiredQty, item.currentInventory)
}

export function applyRteRefillCycleWithManualStockOut(
  item: {
    currentInventory: number
    productType?: ProductType | ""
    rteBatches?: RteBatch[]
    maxCapacity?: number
  },
  row: { stockIn: number; overflow: number; stockOut: number },
  now = new Date()
) {
  const safeCurrentInventory = Math.max(0, item.currentInventory)
  const safeMaxCapacity = Math.max(0, item.maxCapacity ?? safeCurrentInventory)
  const acceptedStockIn = Math.max(0, row.stockIn - row.overflow)
  const stockOut = clampStockOut(row.stockOut, safeCurrentInventory)

  const normalized = alignBatchesWithInventory(
    normalizeRteBatches(item.rteBatches),
    safeCurrentInventory
  )
  const afterStockOut = consumeBatchesFromFrontByQty(normalized, stockOut)
  const withStockIn = appendDateBatchToBack(afterStockOut, acceptedStockIn, now)

  const nextInventory = Math.max(
    0,
    Math.min(safeMaxCapacity, sumBatchQuantity(withStockIn))
  )

  return {
    stockOut,
    rteBatches: withStockIn,
    nextInventory,
  }
}

export function getRteAutoStockOutQuantity(item: {
  currentInventory: number
  productType?: ProductType | ""
  rteBatches?: RteBatch[]
}, date = new Date()) {
  return getRteSuggestedStockOutQuantity(item, date)
}

export function applyRteRefillCycle(
  item: {
    currentInventory: number
    productType?: ProductType | ""
    rteBatches?: RteBatch[]
    maxCapacity?: number
  },
  row: { stockIn: number; overflow: number; stockOut?: number },
  date = new Date()
) {
  return applyRteRefillCycleWithManualStockOut(
    item,
    {
      stockIn: row.stockIn,
      overflow: row.overflow,
      stockOut: row.stockOut ?? getRteSuggestedStockOutQuantity(item, date),
    },
    date
  )
}

export function getAutoStockOutQuantity(item: {
  currentInventory: number
  productType?: ProductType | ""
  rteBatches?: RteBatch[]
}) {
  return getRteAutoStockOutQuantity(item)
}