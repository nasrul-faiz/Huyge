"use client"

import * as React from "react"
import { TruckIcon, AlertCircleIcon, CheckCircleIcon, XIcon } from "lucide-react"
import { FieldSelect } from "@/components/field-select"
import { RefillTable } from "@/components/refill-table"
import { getDOByCode, markDOComplete, type DeliveryOrder } from "@/lib/do-store"
import { getRefillData, REFILL_DATA_STORAGE_KEY, saveRefillData, type RefillDataMap } from "@/lib/refill-store"
import { saveRefillHistory, type RefillHistoryItem } from "@/lib/refill-history-store"
import { Button } from "@/components/ui/button"
import { applyRteRefillCycleWithManualStockOut, getRteSuggestedStockOutQuantity, isRteProduct } from "@/lib/color-expired"

type RefillRowValues = {
  stockIn: number
  overflow: number
  stockOut: number
}

export function HomeContent() {
  const [selectedMachine, setSelectedMachine] = React.useState("")
  const [refillData, setRefillData] = React.useState<RefillDataMap>({})
  const [refillStarted, setRefillStarted] = React.useState(false)
  const [doCode, setDoCode] = React.useState("")
  const [doError, setDoError] = React.useState("")
  const [activeDO, setActiveDO] = React.useState<DeliveryOrder | null>(null)
  const [refillComplete, setRefillComplete] = React.useState(false)
  const [tableValues, setTableValues] = React.useState<Record<string, RefillRowValues>>({})
  const [isCompleting, setIsCompleting] = React.useState(false)

  React.useEffect(() => {
    getRefillData().then(setRefillData)

    function handleStorage(event: StorageEvent) {
      if (event.key === REFILL_DATA_STORAGE_KEY) {
        getRefillData().then(setRefillData)
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const items = selectedMachine ? refillData[selectedMachine] ?? [] : []

  const doPrefilledQty = React.useMemo<Record<string, number>>(() => {
    if (!activeDO) return {}
    return Object.fromEntries(activeDO.items.map((i) => [i.slot, i.qty]))
  }, [activeDO])

  function resetMachineRefillInputs() {
    if (!selectedMachine) return

    const resetMap: RefillDataMap = Object.fromEntries(
      Object.entries(refillData).map(([machineId, machineItems]) => {
        if (machineId !== selectedMachine) return [machineId, machineItems]
        const resetItems = machineItems.map((item) => ({
          ...item,
          stockIn: 0,
          overflow: 0,
          stockOut: 0,
        }))
        return [machineId, resetItems]
      })
    )

    saveRefillData(resetMap).then(() => {
      setRefillData(resetMap)
    })
  }

  function handleStartRefill() {
    setRefillStarted(true)
    setDoCode("")
    setDoError("")
    setActiveDO(null)
    setRefillComplete(false)
    setIsCompleting(false)
    setTableValues({})
    resetMachineRefillInputs()
  }

  function handleCancelRefill() {
    setRefillStarted(false)
    setDoCode("")
    setDoError("")
    setActiveDO(null)
    setRefillComplete(false)
    setIsCompleting(false)
    setTableValues({})
    resetMachineRefillInputs()
  }

  function handleMachineChange(val: string) {
    setSelectedMachine(val)
    setDoCode("")
    setDoError("")
    setActiveDO(null)
    setTableValues({})
  }

  function handleLoadDO(e: React.FormEvent) {
    e.preventDefault()
    if (!doCode.trim()) {
      setDoError("Please enter a DO code.")
      return
    }
    getDOByCode(doCode.trim()).then((found) => {
      if (!found) {
        setDoError(`"${doCode.toUpperCase()}" not found.`)
        return
      }
      if (found.status === "completed") {
        setDoError("This DO has already been completed.")
        return
      }
      if (found.machineId !== selectedMachine) {
        setDoError(`This DO is for ${found.machineId}, not ${selectedMachine}.`)
        return
      }
      setActiveDO(found)
      setDoError("")
    })
  }

  function handleClearDO() {
    setActiveDO(null)
    setDoCode("")
    setDoError("")
  }

  async function handleCompleteRefill() {
    if (!selectedMachine || items.length === 0 || isCompleting) return

    setIsCompleting(true)

    let historyItems: RefillHistoryItem[] = []
    const completionDate = new Date().toISOString()

    const updatedMap: RefillDataMap = Object.fromEntries(
      Object.entries(refillData).map(([machineId, machineItems]) => {
        if (machineId !== selectedMachine) return [machineId, machineItems]

        historyItems = machineItems.map((item) => {
          const suggestedStockOut = isRteProduct(item.productType)
            ? getRteSuggestedStockOutQuantity(item)
            : item.stockOut
          const row = tableValues[item.slot] ?? {
            stockIn: item.stockIn,
            overflow: item.overflow,
            stockOut: suggestedStockOut,
          }

          return {
            slot: item.slot,
            productCode: item.productCode,
            productName: item.productName,
            image: item.image,
            stockIn: row.stockIn,
            overflow: row.overflow,
            stockOut: row.stockOut,
            currentInventory: item.currentInventory,
            maxCapacity: item.maxCapacity,
          }
        })

        const updatedItems = machineItems.map((item) => {
          const suggestedStockOut = isRteProduct(item.productType)
            ? getRteSuggestedStockOutQuantity(item)
            : item.stockOut
          const row = tableValues[item.slot] ?? {
            stockIn: item.stockIn,
            overflow: item.overflow,
            stockOut: suggestedStockOut,
          }

          if (isRteProduct(item.productType)) {
            const rteResult = applyRteRefillCycleWithManualStockOut(item, row)
            return {
              ...item,
              stockIn: 0,
              overflow: 0,
              stockOut: 0,
              currentInventory: rteResult.nextInventory,
              rteBatches: rteResult.rteBatches,
            }
          }

          const netIn = Math.max(0, row.stockIn - row.overflow)
          const nextInventory = Math.max(
            0,
            Math.min(item.maxCapacity, item.currentInventory + netIn - row.stockOut)
          )

          return {
            ...item,
            stockIn: 0,
            overflow: 0,
            stockOut: 0,
            currentInventory: nextInventory,
          }
        })

        return [machineId, updatedItems]
      })
    )

    try {
      await saveRefillData(updatedMap)
      setRefillData(updatedMap)

      await saveRefillHistory({
        machineId: selectedMachine,
        machineLabel: selectedMachine,
        date: completionDate,
        doCode: activeDO?.code ?? null,
        items: historyItems,
      })

      if (activeDO) markDOComplete(activeDO.code)
      setRefillComplete(true)
    } finally {
      setIsCompleting(false)
    }
  }

  if (refillComplete) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircleIcon className="size-7 text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-lg">Refill Completed</p>
          {activeDO && (
            <p className="text-sm text-muted-foreground mt-1">
              DO <span className="font-mono font-semibold">{activeDO.code}</span> marked as done.
            </p>
          )}
        </div>
        <Button size="sm" onClick={handleCancelRefill}>
          Back to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Top bar: machine select + Start Refill button */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <FieldSelect value={selectedMachine} onChange={handleMachineChange} />
        </div>
        {selectedMachine && (
          !refillStarted ? (
            <Button size="sm" className="gap-1.5 shrink-0 mb-0.5" onClick={handleStartRefill}>
              <TruckIcon className="size-3.5" />
              Start Refill
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0 mb-0.5" onClick={handleCancelRefill}>
              <XIcon className="size-3.5" />
              Cancel
            </Button>
          )
        )}
      </div>

      {/* DO code input — only shown in refill mode after machine is selected */}
      {refillStarted && selectedMachine && (
        <div className="rounded-xl border bg-muted/30 px-4 py-3 flex flex-col gap-2">
          {activeDO ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircleIcon className="size-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-700 dark:text-emerald-400">
                  DO <span className="font-mono font-bold">{activeDO.code}</span> loaded —{" "}
                  Stock In quantities pre-filled
                </span>
              </div>
              <button
                onClick={handleClearDO}
                className="rounded p-1 hover:bg-muted text-muted-foreground ml-2"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoadDO} className="flex items-start gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <input
                  autoFocus
                  type="text"
                  value={doCode}
                  onChange={(e) => { setDoCode(e.target.value.toUpperCase()); setDoError("") }}
                  placeholder="Enter DO code — e.g. DO-260622-001"
                  className="rounded-lg border bg-background px-3 py-1.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ring w-full"
                />
                {doError && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircleIcon className="size-3 shrink-0" />
                    {doError}
                  </div>
                )}
              </div>
              <Button type="submit" size="sm" className="gap-1.5 shrink-0">
                <TruckIcon className="size-3.5" />
                Load DO
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Refill table */}
      {selectedMachine && items.length > 0 && (
        <RefillTable
          key={`${selectedMachine}:${activeDO?.code ?? "manual"}`}
          machineId={selectedMachine}
          items={items}
          prefilledStockIn={activeDO ? doPrefilledQty : undefined}
          isEditable={refillStarted}
          onValuesChange={setTableValues}
        />
      )}

      {/* Complete Refill button — shown whenever a refill is in progress */}
      {refillStarted && selectedMachine && items.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            disabled={isCompleting}
            onClick={handleCompleteRefill}
          >
            <CheckCircleIcon className="size-3.5" />
            {isCompleting ? "Saving..." : "Complete Refill"}
          </Button>
        </div>
      )}
    </div>
  )
}
