"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, ClipboardListIcon, HistoryIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { FieldSelect } from "@/components/field-select"
import { RefillTable, type RefillItem } from "@/components/refill-table"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDOByCode, type DeliveryOrder } from "@/lib/do-store"
import {
  getRefillHistory,
  type RefillHistoryEntry,
} from "@/lib/refill-history-store"

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function sortSlots(items: RefillItem[]) {
  return [...items].sort((a, b) =>
    a.slot.localeCompare(b.slot, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  )
}

export function HistoryContent() {
  const [selectedMachine, setSelectedMachine] = React.useState("")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)
  const [historyEntries, setHistoryEntries] = React.useState<RefillHistoryEntry[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [loadingDO, setLoadingDO] = React.useState(false)
  const [isDoDialogOpen, setIsDoDialogOpen] = React.useState(false)
  const [selectedDO, setSelectedDO] = React.useState<DeliveryOrder | null>(null)

  React.useEffect(() => {
    if (!selectedMachine) {
      return
    }

    setLoading(true)
    getRefillHistory({
      machineId: selectedMachine,
      fromDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
      toDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    }).then((entries) => {
      setHistoryEntries(entries)
      setLoading(false)
    })
  }, [selectedMachine, dateRange])

  const machineEntries = historyEntries

  const effectiveSelectedHistoryId = React.useMemo(() => {
    if (machineEntries.length === 0) return null
    const exists = machineEntries.some((entry) => entry.id === selectedHistoryId)
    return exists ? selectedHistoryId : machineEntries[0].id
  }, [machineEntries, selectedHistoryId])

  const selectedHistory = React.useMemo(
    () => machineEntries.find((entry) => entry.id === effectiveSelectedHistoryId) ?? null,
    [machineEntries, effectiveSelectedHistoryId]
  )

  const selectedItems = React.useMemo(
    () => sortSlots(selectedHistory?.items ?? []),
    [selectedHistory]
  )

  // Group entries by calendar day for the dropdown
  const entriesByDay = React.useMemo(() => {
    const groups: { day: string; entries: RefillHistoryEntry[] }[] = []
    for (const entry of machineEntries) {
      const day = format(new Date(entry.date), "dd MMM yyyy")
      const existing = groups.find((g) => g.day === day)
      if (existing) {
        existing.entries.push(entry)
      } else {
        groups.push({ day, entries: [entry] })
      }
    }
    return groups
  }, [machineEntries])

  async function handleViewDO() {
    if (!selectedHistory?.doCode) return

    setLoadingDO(true)
    const order = await getDOByCode(selectedHistory.doCode)
    setSelectedDO(order)
    setIsDoDialogOpen(true)
    setLoadingDO(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <FieldSelect value={selectedMachine} onChange={setSelectedMachine} />

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-start gap-2 font-normal"
              >
                <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <span>
                      {format(dateRange.from, "dd MMM yyyy")} –{" "}
                      {format(dateRange.to, "dd MMM yyyy")}
                    </span>
                  ) : (
                    format(dateRange.from, "dd MMM yyyy")
                  )
                ) : (
                  <span className="text-muted-foreground">Filter by date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>

          {dateRange && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 shrink-0 text-xs"
              onClick={() => setDateRange(undefined)}
            >
              Clear
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            className={`h-9 shrink-0 gap-1.5 transition-all ${
              selectedHistory?.doCode
                ? "shadow-sm shadow-primary/30"
                : ""
            }`}
            variant={selectedHistory?.doCode ? "default" : "outline"}
            disabled={!selectedHistory?.doCode || loadingDO}
            onClick={handleViewDO}
          >
            <ClipboardListIcon className="size-3.5" />
            {loadingDO ? "Loading…" : "View DO"}
          </Button>
        </div>
      </div>

      {/* History Records */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            History Records
          </span>
          {selectedMachine && !loading && (
            <span className="text-[11px] text-muted-foreground">
              {machineEntries.length} record{machineEntries.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!selectedMachine ? (
          <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            <HistoryIcon className="size-4 opacity-40" />
            Choose a machine to view history.
          </div>
        ) : loading ? (
          <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : machineEntries.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            <HistoryIcon className="size-4 opacity-40" />
            No history found for this machine.
          </div>
        ) : (
          <select
            value={effectiveSelectedHistoryId ?? ""}
            onChange={(e) => setSelectedHistoryId(Number(e.target.value))}
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {entriesByDay.map(({ day, entries }) => (
              <optgroup
                key={day}
                label={`${day}  ·  ${entries.length} refill${entries.length !== 1 ? "s" : ""}`}
              >
                {entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {format(new Date(entry.date), "hh:mm a")}
                    {entry.doCode ? `  ·  DO ${entry.doCode}` : "  ·  Manual refill"}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </div>

      {/* Selected refill detail */}
      {selectedMachine && selectedHistory && selectedItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-muted-foreground">
              Refill detail — {formatDateTime(selectedHistory.date)}
            </p>
            {selectedHistory.doCode && (
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                DO {selectedHistory.doCode}
              </span>
            )}
          </div>
          <RefillTable
            machineId={selectedMachine}
            items={selectedItems}
            isEditable={false}
            showDoButton={false}
          />
        </div>
      )}

      <Dialog open={isDoDialogOpen} onOpenChange={setIsDoDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>DO Detail</DialogTitle>
            <DialogDescription>
              {selectedDO
                ? `${selectedDO.code} - ${selectedDO.machineId} (${selectedDO.machineLabel})`
                : "DO not found for this history record."}
            </DialogDescription>
          </DialogHeader>

          {selectedDO ? (
            <div className="max-h-[60vh] overflow-auto rounded-lg border">
              <Table className="text-xs min-w-[700px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Slot</TableHead>
                    <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Product</TableHead>
                    <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Code</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold tracking-wide py-2">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDO.items.map((item) => (
                    <TableRow key={`${item.slot}-${item.productCode}`} className="h-9">
                      <TableCell className="py-1.5 font-mono font-bold tracking-wider">
                        {item.slot}
                      </TableCell>
                      <TableCell className="py-1.5 font-medium">{item.productName}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground">{item.productCode}</TableCell>
                      <TableCell className="py-1.5 text-right font-semibold tabular-nums">{item.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              This history record does not have a linked DO.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
