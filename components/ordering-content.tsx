"use client"

import * as React from "react"
import {
  ShoppingCartIcon,
  PrinterIcon,
  CheckCircleIcon,
  CalendarIcon,
  HashIcon,
  TruckIcon,
} from "lucide-react"
import { FieldSelect } from "@/components/field-select"
import { getMachines } from "@/lib/machine-store"
import { getRefillData, REFILL_DATA_STORAGE_KEY, type RefillDataMap } from "@/lib/refill-store"
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
  generateDOCode,
  saveDO,
  type DeliveryOrder,
} from "@/lib/do-store"

const inputCls =
  "w-16 rounded-md border bg-background px-1.5 py-1 text-center text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"

export function OrderingContent() {
  const [selectedMachine, setSelectedMachine] = React.useState("")
  const [machines, setMachines] = React.useState<Array<{ value: string; label: string }>>([])
  const [refillData, setRefillData] = React.useState<RefillDataMap>({})
  const [quantities, setQuantities] = React.useState<Record<string, number>>({})
  const [submittedDO, setSubmittedDO] = React.useState<DeliveryOrder | null>(null)

  React.useEffect(() => {
    Promise.all([getMachines(), getRefillData()]).then(([m, r]) => {
      setMachines(m)
      setRefillData(r)
    })

    function handleStorage(event: StorageEvent) {
      if (event.key === REFILL_DATA_STORAGE_KEY) {
        getRefillData().then(setRefillData)
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const items = React.useMemo(
    () => (selectedMachine ? refillData[selectedMachine] ?? [] : []),
    [selectedMachine, refillData]
  )
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
  const machineLabel =
    machines.find((m) => m.value === selectedMachine)?.label ?? selectedMachine

  function handleMachineChange(value: string) {
    setSelectedMachine(value)
    setQuantities({})
    setSubmittedDO(null)
  }

  function handleQtyChange(slot: string, raw: string) {
    const num = raw === "" ? 0 : Math.max(0, parseInt(raw) || 0)
    setQuantities((prev) => ({ ...prev, [slot]: num }))
  }

  const orderedItems = sortedItems
    .map((item) => ({ ...item, qty: quantities[item.slot] ?? 0 }))
    .filter((item) => item.qty > 0)

  const totalQty = orderedItems.reduce((a, b) => a + b.qty, 0)

  function handleSubmit() {
    const code = generateDOCode()
    const now = new Date()
    const order: DeliveryOrder = {
      code,
      machineId: selectedMachine,
      machineLabel,
      date: now.toISOString(),
      items: orderedItems.map((item) => ({
        slot: item.slot,
        productCode: item.productCode,
        productName: item.productName,
        qty: item.qty,
      })),
      status: "pending",
    }
    saveDO({ ...order, items: orderedItems.map((item) => ({
      slot: item.slot,
      productCode: item.productCode,
      productName: item.productName,
      image: item.image ?? "",
      qty: item.qty,
    })) }).then(() => {
      setSubmittedDO(order)
    })
  }

  function handleNewOrder() {
    setSubmittedDO(null)
    setSelectedMachine("")
    setQuantities({})
  }

  if (submittedDO) {
    return <DODocument order={submittedDO} onNewOrder={handleNewOrder} />
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldSelect value={selectedMachine} onChange={handleMachineChange} />

      {selectedMachine && items.length > 0 && (
        <>
          <div className="rounded-xl border bg-card overflow-hidden text-xs">
            <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/40">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                {selectedMachine} — Order Sheet
              </span>
              <span className="text-[11px] text-muted-foreground">
                {items.length} products
              </span>
            </div>

            <Table className="text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Slot", "", "Product Name", "Stock", "Max", "Order Qty"].map(
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
                  const qty = quantities[item.slot] ?? 0
                  const isLow = item.currentInventory < item.maxCapacity * 0.3
                  return (
                    <TableRow key={item.slot} className="h-10">
                      <TableCell className="text-center py-1.5">
                        <span className="font-mono font-bold tracking-wider">
                          {item.slot}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1.5">
                        <div className="relative h-8 w-8 mx-auto rounded-md overflow-hidden border bg-muted">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1.5 max-w-[180px]">
                        <p className="truncate font-medium">{item.productName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {item.productCode}
                        </p>
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        <span
                          className={`font-semibold tabular-nums ${isLow ? "text-red-500" : ""}`}
                        >
                          {item.currentInventory}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-1.5 text-muted-foreground tabular-nums">
                        {item.maxCapacity}
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        <input
                          type="number"
                          min={0}
                          value={qty === 0 ? "" : qty}
                          placeholder="0"
                          onChange={(e) =>
                            handleQtyChange(item.slot, e.target.value)
                          }
                          className={inputCls}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">
                  {orderedItems.length}
                </span>{" "}
                products
              </span>
              <span>
                <span className="font-semibold text-foreground">{totalQty}</span>{" "}
                units total
              </span>
            </div>
            <Button
              size="sm"
              disabled={totalQty === 0}
              onClick={handleSubmit}
              className="gap-1.5"
            >
              <ShoppingCartIcon className="size-3.5" />
              Generate DO
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Dots() {
  return (
    <div className="flex gap-[3px] py-2 overflow-hidden">
      {Array.from({ length: 36 }).map((_, i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
      ))}
    </div>
  )
}

function DODocument({
  order,
  onNewOrder,
}: {
  order: DeliveryOrder
  onNewOrder: () => void
}) {
  const dateObj = new Date(order.date)
  const formatted = dateObj.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const total = order.items.reduce((a, b) => a + b.qty, 0)

  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto w-full">
      {/* Success banner */}
      <div className="flex items-center gap-2 justify-center text-emerald-600 font-semibold text-sm">
        <CheckCircleIcon className="size-4" />
        Delivery Order generated
      </div>

      {/* Receipt card */}
      <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">

        {/* Dark header */}
        <div className="bg-gray-900 dark:bg-gray-950 px-5 pt-5 pb-4 text-center">
          <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-medium mb-1">
            Delivery Order
          </p>
          <p className="text-white font-mono text-xl font-bold tracking-wider">
            {order.code}
          </p>
        </div>

        {/* Meta */}
        <div className="px-5">
          <Dots />
          <div className="flex justify-between text-xs pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Machine</p>
              <p className="font-semibold font-mono">{order.machineId}</p>
              <p className="text-muted-foreground">{order.machineLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Date</p>
              <p className="font-semibold">{formatted}</p>
            </div>
          </div>
          <Dots />
        </div>

        {/* Items */}
        <div className="px-5 pb-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Delivery Items
          </p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.slot} className="flex items-center gap-3">
                {/* Slot badge */}
                <span className="bg-muted text-muted-foreground font-mono text-[11px] font-bold px-2 py-0.5 rounded-md min-w-[32px] text-center shrink-0">
                  {item.slot}
                </span>
                {/* Image */}
                <div className="w-7 h-7 rounded-md bg-muted border shrink-0 overflow-hidden flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.productName}</p>
                  <p className="text-[10px] text-muted-foreground">{item.productCode}</p>
                </div>
                {/* Qty badge */}
                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs px-2 py-0.5 rounded-full min-w-[28px] text-center tabular-nums shrink-0">
                  {item.qty}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="px-5">
          <Dots />
          <div className="flex justify-between items-center pb-3">
            <span className="text-xs text-muted-foreground">{order.items.length} items</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Total units:</span>
              <span className="text-lg font-bold tabular-nums">{total}</span>
            </div>
          </div>
        </div>

        {/* Driver hint */}
        <div className="mx-5 mb-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <div className="flex items-start gap-2">
            <TruckIcon className="size-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Give this DO code to the driver:
              </p>
              <p className="font-mono font-bold text-amber-900 dark:text-amber-200 text-sm mt-0.5">
                {order.code}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => window.print()}>
          <PrinterIcon className="size-3.5" />
          Print DO
        </Button>
        <Button size="sm" className="flex-1 gap-1.5" onClick={onNewOrder}>
          New Order
        </Button>
      </div>
    </div>
  )
}
