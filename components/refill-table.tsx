"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon, ClipboardCopyIcon, ClipboardListIcon, EyeIcon, SearchIcon, XIcon } from "lucide-react"
import { ImageLightbox } from "@/components/image-lightbox"
import { getAllDOs, DELIVERY_ORDERS_STORAGE_KEY, DELIVERY_ORDERS_UPDATED_EVENT, type DeliveryOrder } from "@/lib/do-store"
import type { ProductType } from "@/lib/product-store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface RefillItem {
  slot: string
  productCode: string
  productName: string
  image: string
  productType?: ProductType | ""
  rteBatches?: Array<{ color: string; quantity: number }>
  stockIn: number
  overflow: number
  stockOut: number
  currentInventory: number
  maxCapacity: number
}

interface RowValues {
  stockIn: number
  overflow: number
  stockOut: number
}

interface RefillTableProps {
  machineId: string
  items: RefillItem[]
  prefilledStockIn?: Record<string, number>
  isEditable?: boolean
  onValuesChange?: (values: Record<string, RowValues>) => void
  showDoButton?: boolean
}

const inputCls =
  "w-16 rounded-md border bg-background px-1.5 py-1 text-center text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })
}

export function RefillTable({ machineId, items, prefilledStockIn, isEditable = true, onValuesChange, showDoButton = true }: RefillTableProps) {
  const [allOrders, setAllOrders] = React.useState<DeliveryOrder[]>([])
  const [isViewDOpen, setIsViewDOOpen] = React.useState(false)
  const [copiedCode, setCopiedCode] = React.useState("")
  const [doCodeFilter, setDoCodeFilter] = React.useState("")
  const [selectedDoCode, setSelectedDoCode] = React.useState("")

  React.useEffect(() => {
    async function reloadOrders() {
      const orders = await getAllDOs()
      setAllOrders(orders)
    }

    reloadOrders()

    function handleStorage(event: StorageEvent) {
      if (event.key === DELIVERY_ORDERS_STORAGE_KEY) {
        reloadOrders()
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener(DELIVERY_ORDERS_UPDATED_EVENT, reloadOrders)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(DELIVERY_ORDERS_UPDATED_EVENT, reloadOrders)
    }
  }, [])

  const pendingMachineOrders = React.useMemo(
    () =>
      allOrders
        .filter(
          (order) => order.machineId === machineId && order.status === "pending"
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allOrders, machineId]
  )

  const filteredOrders = React.useMemo(() => {
    const keyword = doCodeFilter.trim().toUpperCase()
    if (!keyword) return pendingMachineOrders
    return pendingMachineOrders.filter((order) =>
      order.code.toUpperCase().includes(keyword)
    )
  }, [pendingMachineOrders, doCodeFilter])

  React.useEffect(() => {
    if (filteredOrders.length === 0) {
      setSelectedDoCode("")
      return
    }

    const selectedExists = filteredOrders.some(
      (order) => order.code === selectedDoCode
    )

    if (!selectedExists) {
      setSelectedDoCode(filteredOrders[0].code)
    }
  }, [filteredOrders, selectedDoCode])

  const selectedOrder = React.useMemo(
    () => filteredOrders.find((order) => order.code === selectedDoCode) ?? null,
    [filteredOrders, selectedDoCode]
  )

  const selectedOrderLines = React.useMemo(
    () =>
      (selectedOrder?.items ?? []).map((item) => ({
        doCode: selectedOrder?.code ?? "",
        slot: item.slot,
        productCode: item.productCode,
        productName: item.productName,
        qty: item.qty,
      })),
    [selectedOrder]
  )

  const selectedOrderTotalQty = React.useMemo(
    () => selectedOrderLines.reduce((sum, item) => sum + item.qty, 0),
    [selectedOrderLines]
  )
  const readonlyInputCls = !isEditable
    ? "text-muted-foreground disabled:text-muted-foreground disabled:opacity-100"
    : ""

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      window.setTimeout(() => {
        setCopiedCode((current) => (current === code ? "" : current))
      }, 1200)
    } catch {
      setCopiedCode("")
    }
  }

  const sortedItems = React.useMemo(
    () =>
      [...items].sort((a, b) =>
        a.slot.localeCompare(b.slot, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [items]
  )

  const itemMap = React.useMemo(
    () => Object.fromEntries(items.map((i) => [i.slot, i])),
    [items]
  )

  const calcOverflow = (slot: string, stockIn: number) => {
    const item = itemMap[slot]
    if (!item) return 0
    const available = item.maxCapacity - item.currentInventory
    return Math.max(0, stockIn - available)
  }

  const [values, setValues] = React.useState<Record<string, RowValues>>(
    () =>
      Object.fromEntries(
        items.map((item) => {
          const stockIn = prefilledStockIn?.[item.slot] ?? item.stockIn
          const available = item.maxCapacity - item.currentInventory
          const overflow = prefilledStockIn?.[item.slot] != null
            ? Math.max(0, stockIn - available)
            : item.overflow
          const stockOut = item.stockOut
          return [item.slot, { stockIn, overflow, stockOut }]
        })
      )
  )

  React.useEffect(() => {
    onValuesChange?.(values)
  }, [values, onValuesChange])

  function handleChange(slot: string, field: keyof RowValues, raw: string) {
    const num = raw === "" ? 0 : Math.max(0, parseInt(raw) || 0)
    setValues((prev) => {
      const item = itemMap[slot]
      const baseStockIn = prefilledStockIn?.[slot] ?? item?.stockIn ?? 0
      const baseOverflow = prefilledStockIn?.[slot] != null
        ? calcOverflow(slot, baseStockIn)
        : (item?.overflow ?? 0)
      const baseStockOut = item?.stockOut ?? 0
      const current = prev[slot] ?? {
        stockIn: baseStockIn,
        overflow: baseOverflow,
        stockOut: baseStockOut,
      }
      const updated = { ...current, [field]: num }
      if (field === "stockIn") {
        updated.overflow = calcOverflow(slot, num)
      }
      return { ...prev, [slot]: updated }
    })
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden text-xs">
      {/* Header bar */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/40">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
          {machineId}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{items.length} slots</span>
          {showDoButton && (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsViewDOOpen(true)}
              disabled={filteredOrders.length === 0}
              className={`h-7 text-[11px] gap-1.5 px-2.5 ${filteredOrders.length > 0 ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
              variant={filteredOrders.length > 0 ? "default" : "outline"}
            >
              <ClipboardListIcon className="size-3.5" />
              View DO
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
      <Table className="text-xs min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {["Slot", "Stock In", "Overflow", "Stock Out", "Inventory", "", "Product Name", "Max"].map(
              (h, i) => (
                <TableHead
                  key={i}
                  className="text-center text-[11px] font-semibold tracking-wide py-2"
                >
                  {h}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedItems.map((item) => {
            const baseStockIn = prefilledStockIn?.[item.slot] ?? item.stockIn
            const baseOverflow = prefilledStockIn?.[item.slot] != null
              ? calcOverflow(item.slot, baseStockIn)
              : item.overflow
            const row = values[item.slot] ?? {
              stockIn: baseStockIn,
              overflow: baseOverflow,
              stockOut: item.stockOut,
            }
            return (
              <TableRow key={item.slot} className="h-10">
                {/* Slot */}
                <TableCell className="text-center py-1.5">
                  <span className="font-mono font-bold tracking-wider">{item.slot}</span>
                </TableCell>

                {/* Stock In */}
                <TableCell className="text-center py-1.5">
                  <input
                    type="number"
                    min={0}
                    disabled={!isEditable}
                    value={row.stockIn === 0 ? "" : row.stockIn}
                    placeholder="0"
                    onChange={(e) => handleChange(item.slot, "stockIn", e.target.value)}
                    className={`${inputCls} ${readonlyInputCls} ${prefilledStockIn?.[item.slot] != null ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300" : ""}`}
                  />
                </TableCell>

                {/* Overflow */}
                <TableCell className="text-center py-1.5">
                  <input
                    type="number"
                    min={0}
                    disabled={!isEditable}
                    value={row.overflow === 0 ? "" : row.overflow}
                    placeholder="0"
                    onChange={(e) => handleChange(item.slot, "overflow", e.target.value)}
                    className={`${inputCls} ${readonlyInputCls}`}
                  />
                </TableCell>

                {/* Stock Out */}
                <TableCell className="text-center py-1.5">
                  <input
                    type="number"
                    min={0}
                    disabled={!isEditable}
                    value={row.stockOut === 0 ? "" : row.stockOut}
                    placeholder="0"
                    onChange={(e) => handleChange(item.slot, "stockOut", e.target.value)}
                    className={`${inputCls} ${readonlyInputCls}`}
                  />
                </TableCell>

                {/* Inventory */}
                <TableCell className="text-center py-1.5 font-semibold tabular-nums">
                  {item.currentInventory}
                </TableCell>

                {/* Image */}
                <TableCell className="text-center py-1.5 px-1.5">
                  <div className="h-8 w-8 mx-auto rounded-md overflow-hidden border bg-muted">
                    {item.image ? (
                      <ImageLightbox src={item.image} alt={item.productName}>
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      </ImageLightbox>
                    ) : null}
                  </div>
                </TableCell>

                {/* Product Name */}
                <TableCell className="text-center py-1.5 max-w-[180px]">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{item.productCode}</p>
                </TableCell>

                {/* Max */}
                <TableCell className="text-center py-1.5 text-muted-foreground tabular-nums">
                  {item.maxCapacity}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>

      <Dialog open={showDoButton && isViewDOpen} onOpenChange={setIsViewDOOpen}>
        <DialogContent
          showCloseButton
          className="!top-0 !left-0 !h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none p-0"
        >
          <div className="flex h-full flex-col bg-card">
            <DialogHeader className="border-b bg-background/95 px-4 py-3 pr-14 backdrop-blur supports-[backdrop-filter]:bg-background/70">
              <div className="flex min-w-0 items-center gap-1.5 text-sm">
                <DialogTitle className="sr-only">View DO - {machineId}</DialogTitle>
                <DialogDescription className="sr-only">
                  New DO from Ordering only ({filteredOrders.length}). Previous DO boleh tengok di halaman View DO.
                </DialogDescription>
                <span className="text-muted-foreground shrink-0">Refill</span>
                <ChevronRightIcon className="size-3.5 text-muted-foreground/50 shrink-0" />
                <span className="font-semibold truncate">View DO</span>
                <ChevronRightIcon className="size-3.5 text-muted-foreground/50 shrink-0" />
                <span className="text-muted-foreground truncate">{machineId}</span>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-auto p-6">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="border-b bg-muted/40 px-4 py-3 md:px-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                      Search Delivery Orders
                    </p>
                  </div>
                  <div className="px-4 py-4 md:px-5">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={doCodeFilter}
                        onChange={(event) => setDoCodeFilter(event.target.value.toUpperCase())}
                        placeholder="Search by DO code - e.g. DO-260623-001"
                        className="w-full rounded-lg border bg-background pl-9 pr-9 py-2 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {doCodeFilter && (
                        <button
                          type="button"
                          onClick={() => setDoCodeFilter("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <XIcon className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        {["Code", "Time Refill", "Date", "Action"].map((h) => (
                          <TableHead
                            key={h}
                            className="text-center text-[11px] font-semibold tracking-wide py-2"
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.code} className="h-10">
                          <TableCell className="text-center py-1.5">
                            <span className="font-mono font-bold tracking-wider text-xs">
                              {order.code}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-1.5 tabular-nums">
                            {formatTime(order.date)}
                          </TableCell>
                          <TableCell className="text-center py-1.5">
                            {formatDate(order.date)}
                          </TableCell>
                          <TableCell className="text-center py-1.5">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedDoCode(order.code)}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition hover:bg-muted ${selectedDoCode === order.code ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-background"}`}
                              >
                                <EyeIcon className="size-3.5" />
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCopyCode(order.code)}
                                className="rounded-md border bg-background p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                aria-label="Copy DO code"
                                title="Copy DO code"
                              >
                                {copiedCode === order.code ? (
                                  <CheckIcon className="size-3.5 text-emerald-600" />
                                ) : (
                                  <ClipboardCopyIcon className="size-3.5" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No new DO found for this machine.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground md:px-5">
                    {filteredOrders.length} order{filteredOrders.length !== 1 && "s"} found
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="border-b bg-muted/40 px-4 py-2 md:px-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                      {selectedOrder ? `DO Detail - ${selectedOrder.code}` : "DO Detail"}
                    </p>
                  </div>
                  <div className="max-h-[44vh] overflow-auto">
                    <Table className="text-xs min-w-[780px]">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">DO Code</TableHead>
                          <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">Slot</TableHead>
                          <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Product</TableHead>
                          <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Code</TableHead>
                          <TableHead className="text-right text-[11px] font-semibold tracking-wide py-2">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderLines.map((item) => (
                          <TableRow key={`${item.doCode}-${item.slot}-${item.productCode}`} className="h-9">
                            <TableCell className="py-1.5 font-mono font-bold tracking-wider">
                              {item.doCode}
                            </TableCell>
                            <TableCell className="text-center py-1.5">
                              <span className="font-mono font-bold tracking-wider">{item.slot}</span>
                            </TableCell>
                            <TableCell className="py-1.5 font-medium">{item.productName}</TableCell>
                            <TableCell className="py-1.5 text-muted-foreground">{item.productCode}</TableCell>
                            <TableCell className="py-1.5 text-right font-semibold tabular-nums">{item.qty}</TableCell>
                          </TableRow>
                        ))}
                        {selectedOrderLines.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                              Click View pada DO untuk tengok item list.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {selectedOrder && (
                    <div className="border-t bg-muted/20 px-4 py-2 text-xs md:px-5">
                      <span className="font-semibold tabular-nums">Total Qty: {selectedOrderTotalQty}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
