"use client"

import * as React from "react"
import {
  SearchIcon,
  MoreHorizontalIcon,
  EyeIcon,
  DownloadIcon,
  XIcon,
  ClipboardCopyIcon,
  CheckIcon,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAllDOs, type DeliveryOrder } from "@/lib/do-store"
import { getRefillData, type RefillDataMap } from "@/lib/refill-store"
import type { RefillItem } from "@/components/refill-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

function compareSlots(a: string, b: string) {
  return a.trim().toUpperCase().localeCompare(b.trim().toUpperCase(), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

interface DetailRow {
  slot: string
  productCode: string
  productName: string
  image: string
  qty: number
  currentInventory: number
  maxCapacity: number
}

function ActionMenu({
  do: order,
  onView,
}: {
  do: DeliveryOrder
  onView: (order: DeliveryOrder) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreHorizontalIcon className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-32 rounded-lg border bg-popover shadow-lg py-1 text-xs">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
            onClick={() => {
              setOpen(false)
              onView(order)
            }}
          >
            <EyeIcon className="size-3.5 shrink-0" />
            View
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-muted-foreground"
            onClick={() => setOpen(false)}
            disabled
          >
            <DownloadIcon className="size-3.5 shrink-0" />
            Export
          </button>
        </div>
      )}
    </div>
  )
}

function DODetailSheet({
  order,
  refillItems,
  onClose,
}: {
  order: DeliveryOrder
  refillItems: RefillItem[]
  onClose: () => void
}) {
  const [copiedCode, setCopiedCode] = React.useState("")

  const refillBySlot = React.useMemo(
    () => new Map(refillItems.map((item) => [item.slot, item])),
    [refillItems]
  )

  const detailRows = React.useMemo<DetailRow[]>(
    () =>
      [...order.items]
        .sort((a, b) => compareSlots(a.slot, b.slot))
        .map((item) => {
          const refill = refillBySlot.get(item.slot)
          return {
            slot: item.slot,
            productCode: item.productCode,
            productName: item.productName,
            image: item.image ?? refill?.image ?? "",
            qty: item.qty,
            currentInventory: refill?.currentInventory ?? 0,
            maxCapacity: refill?.maxCapacity ?? 0,
          }
        }),
    [order.items, refillBySlot]
  )

  const totals = React.useMemo(
    () =>
      detailRows.reduce(
        (acc, row) => ({
          qty: acc.qty + row.qty,
          currentInventory: acc.currentInventory + row.currentInventory,
        }),
        { qty: 0, currentInventory: 0 }
      ),
    [detailRows]
  )

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(order.code)
      setCopiedCode(order.code)
      window.setTimeout(() => {
        setCopiedCode((current) => (current === order.code ? "" : current))
      }, 1200)
    } catch {
      setCopiedCode("")
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton
        className="!top-0 !left-0 !h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none p-0"
      >
        <div className="flex h-full flex-col bg-card">
          <DialogHeader className="border-b bg-muted/40 px-4 py-3 pr-14">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 text-left">
                <DialogTitle>View DO</DialogTitle>
                <DialogDescription className="text-sm text-foreground">
                  <span className="font-semibold">{order.machineId}</span> - {order.machineLabel}
                </DialogDescription>
                <p className="text-xs text-muted-foreground">
                  {formatDate(order.date)} {formatTime(order.date)}
                </p>
                <div className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">DO</span>
                  <span className="font-mono text-xs font-bold tracking-wider">{order.code}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
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
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Status</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-foreground">
                  {order.status}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="text-xs min-w-[760px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">Slot</TableHead>
                  <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">DO Qty</TableHead>
                  <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">Inventory</TableHead>
                  <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2"></TableHead>
                  <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">Product Name</TableHead>
                  <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailRows.map((item) => (
                  <TableRow key={`${item.slot}-${item.productCode}`} className="h-9">
                    <TableCell className="text-center py-1.5">
                      <span className="font-mono font-bold tracking-wider">{item.slot}</span>
                    </TableCell>
                    <TableCell className="text-center py-1.5 font-semibold tabular-nums">
                      {item.qty}
                    </TableCell>
                    <TableCell className="text-center py-1.5 tabular-nums text-muted-foreground">
                      {item.currentInventory}
                    </TableCell>
                    <TableCell className="text-center py-1.5 px-1.5">
                      <div className="h-8 w-8 mx-auto rounded-md overflow-hidden border bg-muted">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-1.5 font-medium">
                      <p className="truncate">{item.productName}</p>
                      <p className="text-[10px] text-muted-foreground">{item.productCode}</p>
                    </TableCell>
                    <TableCell className="text-center py-1.5 tabular-nums text-muted-foreground">
                      {item.maxCapacity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="sticky bottom-0 border-t bg-muted/95 px-6 py-4 text-xs backdrop-blur supports-[backdrop-filter]:bg-muted/75">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Items</p>
                <p className="mt-1 font-bold tabular-nums">{detailRows.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Order Qty</p>
                <p className="mt-1 font-bold tabular-nums">{totals.qty}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Inventory</p>
                <p className="mt-1 font-bold tabular-nums">{totals.currentInventory}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ViewDOContent() {
  const [allDOs, setAllDOs] = React.useState<DeliveryOrder[]>([])
  const [refillData, setRefillData] = React.useState<RefillDataMap>({})
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [viewingDO, setViewingDO] = React.useState<DeliveryOrder | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    Promise.all([getAllDOs(), getRefillData()]).then(([dos, refill]) => {
      setAllDOs(dos)
      setRefillData(refill)
      setLoading(false)
    })
    inputRef.current?.focus()
  }, [])

  const selectedRefillItems = React.useMemo(
    () => (viewingDO ? refillData[viewingDO.machineId] ?? [] : []),
    [refillData, viewingDO]
  )

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allDOs
    return allDOs.filter(
      (d) =>
        d.machineId.toLowerCase().includes(q) ||
        d.machineLabel.toLowerCase().includes(q)
    )
  }, [allDOs, search])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:pl-2">
      {/* Search */}
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
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setViewingDO(null)
              }}
              placeholder="Search by Machine ID or Location — e.g. M0013 or Rawang"
              className="w-full rounded-lg border bg-background pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("")
                  setViewingDO(null)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail view (shown when View is clicked) */}
      {viewingDO && (
        <DODetailSheet
          order={viewingDO}
          refillItems={selectedRefillItems}
          onClose={() => setViewingDO(null)}
        />
      )}

      {/* Results table */}
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <SearchIcon className="size-10 opacity-30" />
          <p className="text-sm">
            {search
              ? `No results for "${search}"`
              : "No delivery orders found."}
          </p>
        </div>
      ) : (
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
              {filtered.map((order) => (
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
                    <ActionMenu do={order} onView={setViewingDO} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground md:px-5">
            {filtered.length} order{filtered.length !== 1 && "s"} found
          </div>
        </div>
      )}
    </div>
  )
}
