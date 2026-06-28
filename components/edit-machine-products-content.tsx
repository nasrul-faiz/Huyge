"use client"

import * as React from "react"
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CheckIcon,
  XIcon,
} from "lucide-react"
import { getMachines, type Machine } from "@/lib/machine-store"
import { getProducts } from "@/lib/product-store"
import {
  getRefillData,
  upsertRefillItems,
  deleteRefillItem,
} from "@/lib/refill-store"
import type { RefillItem } from "@/components/refill-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ImageLightbox } from "@/components/image-lightbox"
import { ConfirmDialog } from "@/components/confirm-dialog"

type Product = Pick<RefillItem, "productCode" | "productName" | "image"> & {
  maxQuantity: number
}

interface Placement {
  machineId: string
  slot: string
  productCode: string
  maxCapacity: number
  stockIn: number
  overflow: number
  stockOut: number
  currentInventory: number
}

const inputCls =
  "w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"

function compareSlots(a: string, b: string) {
  const aTrim = a.trim().toUpperCase()
  const bTrim = b.trim().toUpperCase()
  return aTrim.localeCompare(bTrim, undefined, { numeric: true, sensitivity: "base" })
}

interface PlacementEditRowProps {
  draft: Placement
  products: Product[]
  onDraftChange: (placement: Placement) => void
  onConfirm: () => void
  onCancel: () => void
  confirmLoading?: boolean
}

function PlacementEditRow({ draft, products, onDraftChange, onConfirm, onCancel, confirmLoading }: PlacementEditRowProps) {
  const productMap = React.useMemo(
    () => new Map(products.map((p) => [p.productCode, p])),
    [products]
  )

  function handleProductChange(code: string) {
    const product = productMap.get(code)
    const defaultMax = product?.maxQuantity ?? 0
    onDraftChange({
      ...draft,
      productCode: code,
      maxCapacity: defaultMax > 0 ? defaultMax : draft.maxCapacity,
    })
  }

  return (
    <TableRow className="bg-accent/20">
      <TableCell className="py-1.5 text-center">
        <input
          className={inputCls}
          value={draft.slot}
          onChange={(e) => onDraftChange({ ...draft, slot: e.target.value })}
          placeholder="A1"
        />
      </TableCell>
      <TableCell className="py-1.5">
        <select
          className={inputCls}
          value={draft.productCode}
          onChange={(e) => handleProductChange(e.target.value)}
        >
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p.productCode} value={p.productCode}>
              {p.productCode} — {p.productName}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="py-1.5 text-center">
        <input
          type="number"
          min={0}
          className={inputCls}
          value={draft.maxCapacity === 0 ? "" : draft.maxCapacity}
          placeholder="0"
          onChange={(e) =>
            onDraftChange({ ...draft, maxCapacity: Math.max(0, parseInt(e.target.value) || 0) })
          }
        />
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex justify-center gap-1">
          <button
            onClick={onConfirm}
            disabled={confirmLoading}
            className="rounded p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-muted-foreground hover:text-emerald-600 disabled:opacity-40"
            title="Confirm"
          >
            <CheckIcon className="size-3.5" />
          </button>
          <button
            onClick={onCancel}
            className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Cancel"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}

interface EditMachineProductsContentProps {
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>
  onDirtyChange?: (dirty: boolean) => void
}

export function EditMachineProductsContent({ onSaveRef, onDirtyChange }: EditMachineProductsContentProps) {
  const [machines, setMachines] = React.useState<Machine[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [placements, setPlacements] = React.useState<Placement[]>([])
  // drafts: confirmed edits pending Save (keyed by "machineId::slot")
  const [drafts, setDrafts] = React.useState<Record<string, Placement>>({})
  const [pendingAdds, setPendingAdds] = React.useState<Placement[]>([])
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [addDraft, setAddDraft] = React.useState<Placement>({
    machineId: "", slot: "", productCode: "", maxCapacity: 0,
    stockIn: 0, overflow: 0, stockOut: 0, currentInventory: 0,
  })
  const [deleteTarget, setDeleteTarget] = React.useState<Placement | null>(null)
  const [selectedMachine, setSelectedMachine] = React.useState("")
  const [loading, setLoading] = React.useState(true)

  const placementKey = (p: Placement) => `${p.machineId}::${p.slot}`

  React.useEffect(() => {
    onDirtyChange?.(Object.keys(drafts).length > 0 || pendingAdds.length > 0)
  }, [drafts, pendingAdds, onDirtyChange])

  React.useEffect(() => {
    Promise.all([getMachines(), getRefillData(), getProducts()]).then(([ms, data, prods]) => {
      setMachines(ms)
      const flat: Placement[] = []
      for (const [machineId, items] of Object.entries(data)) {
        for (const item of items) {
          flat.push({
            machineId, slot: item.slot, productCode: item.productCode,
            maxCapacity: item.maxCapacity, stockIn: item.stockIn,
            overflow: item.overflow, stockOut: item.stockOut,
            currentInventory: item.currentInventory,
          })
        }
      }
      setPlacements(flat)
      setProducts(prods.map((p) => ({
        productCode: p.productCode, productName: p.productName,
        image: p.image, maxQuantity: p.maxQuantity ?? 0,
      })))
      const first = ms[0]?.value ?? ""
      setSelectedMachine(first)
      setAddDraft((prev) => ({ ...prev, machineId: first }))
      setLoading(false)
    })
  }, [])

  const productMap = React.useMemo(
    () => new Map(products.map((p) => [p.productCode, p])),
    [products]
  )

  const visiblePlacements = placements
    .filter((p) => p.machineId === selectedMachine)
    .sort((a, b) => compareSlots(a.slot, b.slot))

  const visiblePendingAdds = pendingAdds
    .filter((p) => p.machineId === selectedMachine)
    .sort((a, b) => compareSlots(a.slot, b.slot))

  const handleSaveAll = React.useCallback(async () => {
    const itemsToSave: Array<RefillItem & { machine_id: string }> = []
    const keysToSave: string[] = []
    const remainingDrafts: Record<string, Placement> = { ...drafts }
    const remainingPendingAdds: Placement[] = []
    let hadError = false
    let saveSucceeded = false
    const existingPlacementKeys = new Set(placements.map((p) => placementKey(p)))

    for (const [key, draft] of Object.entries(drafts)) {
      const slot = draft.slot.trim().toUpperCase()
      const code = draft.productCode.trim().toUpperCase()
      if (!draft.machineId || !slot || !code) {
        hadError = true
        continue
      }
      const product = productMap.get(code)
      if (!product) {
        hadError = true
        continue
      }
      itemsToSave.push({
        machine_id: draft.machineId, slot, productCode: code,
        productName: product.productName, image: product.image,
        maxCapacity: Math.max(0, draft.maxCapacity),
        stockIn: draft.stockIn, overflow: draft.overflow,
        stockOut: draft.stockOut, currentInventory: draft.currentInventory,
      })
      keysToSave.push(key)
      existingPlacementKeys.delete(key)
      existingPlacementKeys.add(`${draft.machineId}::${slot}`)
    }

    for (const pending of pendingAdds) {
      const slot = pending.slot.trim().toUpperCase()
      const code = pending.productCode.trim().toUpperCase()
      const key = `${pending.machineId}::${slot}`
      if (!pending.machineId || !slot || !code) {
        hadError = true
        remainingPendingAdds.push(pending)
        continue
      }
      if (existingPlacementKeys.has(key)) {
        hadError = true
        remainingPendingAdds.push(pending)
        continue
      }
      const product = productMap.get(code)
      if (!product) {
        hadError = true
        remainingPendingAdds.push(pending)
        continue
      }

      itemsToSave.push({
        machine_id: pending.machineId,
        slot,
        productCode: code,
        productName: product.productName,
        image: product.image,
        maxCapacity: Math.max(0, pending.maxCapacity),
        stockIn: 0,
        overflow: 0,
        stockOut: 0,
        currentInventory: 0,
      })
      existingPlacementKeys.add(key)
    }

    if (itemsToSave.length > 0) {
      const saved = await upsertRefillItems(itemsToSave)
      if (saved) {
        saveSucceeded = true
        for (const key of keysToSave) {
          delete remainingDrafts[key]
        }
      } else {
        hadError = true
      }
    }

    if (itemsToSave.length > 0) {
      const [data, prods] = await Promise.all([getRefillData(), getProducts()])
      const flat: Placement[] = []
      for (const [machineId, items] of Object.entries(data)) {
        for (const item of items) {
          flat.push({
            machineId, slot: item.slot, productCode: item.productCode,
            maxCapacity: item.maxCapacity, stockIn: item.stockIn,
            overflow: item.overflow, stockOut: item.stockOut,
            currentInventory: item.currentInventory,
          })
        }
      }
      setPlacements(flat)
      setProducts(prods.map((p) => ({
        productCode: p.productCode, productName: p.productName,
        image: p.image, maxQuantity: p.maxQuantity ?? 0,
      })))
    }

    setDrafts(remainingDrafts)
    if (itemsToSave.length === 0) {
      setPendingAdds(remainingPendingAdds)
    } else if (saveSucceeded) {
      setPendingAdds(remainingPendingAdds)
    }
    setEditingKey(null)

    if (hadError) {
      throw new Error("Some machine product changes could not be saved.")
    }
  }, [drafts, pendingAdds, placements, productMap])

  React.useEffect(() => {
    if (onSaveRef) onSaveRef.current = handleSaveAll
  }, [handleSaveAll, onSaveRef])

  function startAdd() {
    setAdding(true)
    setEditingKey(null)
    setAddDraft({
      machineId: selectedMachine, slot: "", productCode: "", maxCapacity: 0,
      stockIn: 0, overflow: 0, stockOut: 0, currentInventory: 0,
    })
  }

  function confirmNew() {
    const slot = addDraft.slot.trim().toUpperCase()
    const code = addDraft.productCode.trim().toUpperCase()
    if (!addDraft.machineId || !slot || !code) return
    const product = productMap.get(code)
    if (!product) return
    const key = `${addDraft.machineId}::${slot}`
    const existsInPlacements = placements.some((p) => placementKey(p) === key)
    const existsInDrafts = Object.entries(drafts).some(([draftKey, p]) => {
      const draftSlot = p.slot.trim().toUpperCase()
      return draftKey === key || `${p.machineId}::${draftSlot}` === key
    })
    const existsInPending = pendingAdds.some((p) => `${p.machineId}::${p.slot}` === key)
    if (existsInPlacements || existsInDrafts || existsInPending) return

    setPendingAdds((prev) => [
      ...prev,
      {
        machineId: addDraft.machineId,
        slot,
        productCode: code,
        maxCapacity: Math.max(0, addDraft.maxCapacity),
        stockIn: 0,
        overflow: 0,
        stockOut: 0,
        currentInventory: 0,
      },
    ])
    setAdding(false)
  }

  function cancelNew() {
    setAdding(false)
  }

  function startEdit(key: string) {
    const placement = placements.find((p) => placementKey(p) === key)
    if (!placement) return
    setEditingKey(key)
    setAdding(false)
    setDrafts((prev) => ({ ...prev, [key]: prev[key] ?? { ...placement } }))
  }

  function confirmEdit() {
    setEditingKey(null)
  }

  function cancelEdit(key: string) {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setEditingKey(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await deleteRefillItem(deleteTarget.machineId, deleteTarget.slot)
    const key = placementKey(deleteTarget)
    setPlacements((prev) => prev.filter((p) => placementKey(p) !== key))
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setDeleteTarget(null)
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
  }

  const deleteProduct = deleteTarget ? productMap.get(deleteTarget.productCode) : null

  return (
    <>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove slot?"
        description={`Slot ${deleteTarget?.slot}${deleteProduct ? ` (${deleteProduct.productName})` : ""} will be permanently removed from this machine.`}
        confirmText="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card overflow-hidden text-xs">
          <div className="px-4 py-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                Machine
              </span>
              <select
                value={selectedMachine}
                onChange={(e) => {
                  setSelectedMachine(e.target.value)
                  setAdding(false)
                  setEditingKey(null)
                  setAddDraft((prev) => ({ ...prev, machineId: e.target.value }))
                }}
                className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              >
                {machines.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.value} — {m.label.replace(`${m.value} — `, "")}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!selectedMachine || products.length === 0 || editingKey !== null || adding}
              onClick={startAdd}
            >
              <PlusIcon className="size-3.5" />
              Add Slot
            </Button>
          </div>

          <div className="max-h-[calc(100vh-240px)] overflow-auto">
            <Table className="text-xs min-w-[600px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Slot", "Product", "Max Capacity", "Actions"].map((h) => (
                    <TableHead key={h} className="text-center text-[11px] font-semibold tracking-wide py-2">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {adding && (
                  <PlacementEditRow
                    draft={addDraft}
                    products={products}
                    onDraftChange={setAddDraft}
                    onConfirm={confirmNew}
                    onCancel={cancelNew}
                  />
                )}
                {visiblePendingAdds.map((placement) => {
                  const key = `${placement.machineId}::${placement.slot}`
                  const product = productMap.get(placement.productCode)

                  return (
                    <TableRow
                      key={`pending-${key}`}
                      className="h-10 border-l-2 border-l-amber-400 bg-amber-50/20 dark:bg-amber-950/10"
                    >
                      <TableCell className="text-center py-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono font-bold tracking-wider">{placement.slot}</span>
                          <span className="inline-block size-1.5 rounded-full bg-amber-400 shrink-0" />
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="mx-auto flex max-w-[240px] items-center gap-2">
                          {product?.image ? (
                            <ImageLightbox src={product.image} alt={product.productName}>
                              <div className="h-7 w-7 rounded-md overflow-hidden border bg-muted shrink-0">
                                <img src={product.image} alt={product.productName} className="h-full w-full object-cover" />
                              </div>
                            </ImageLightbox>
                          ) : (
                            <div className="h-7 w-7 rounded-md border bg-muted shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{product?.productName ?? "Unknown"}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{placement.productCode}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1.5 text-muted-foreground tabular-nums">
                        {placement.maxCapacity}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => setPendingAdds((prev) => prev.filter((p) => `${p.machineId}::${p.slot}` !== key))}
                            disabled={adding || editingKey !== null}
                            className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {visiblePlacements.map((placement) => {
                  const key = placementKey(placement)
                  const hasDraft = drafts[key] !== undefined
                  const isEditing = editingKey === key
                  const display = hasDraft ? drafts[key] : placement
                  const product = productMap.get(display.productCode)

                  if (isEditing && drafts[key]) {
                    return (
                      <PlacementEditRow
                        key={key}
                        draft={drafts[key]}
                        products={products}
                        onDraftChange={(p) => setDrafts((prev) => ({ ...prev, [key]: p }))}
                        onConfirm={confirmEdit}
                        onCancel={() => cancelEdit(key)}
                      />
                    )
                  }

                  return (
                    <TableRow
                      key={key}
                      className={`h-10 ${hasDraft ? "border-l-2 border-l-amber-400 bg-amber-50/20 dark:bg-amber-950/10" : ""}`}
                    >
                      <TableCell className="text-center py-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono font-bold tracking-wider">{display.slot}</span>
                          {hasDraft && <span className="inline-block size-1.5 rounded-full bg-amber-400 shrink-0" />}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="mx-auto flex max-w-[240px] items-center gap-2">
                          {product?.image ? (
                            <ImageLightbox src={product.image} alt={product.productName}>
                              <div className="h-7 w-7 rounded-md overflow-hidden border bg-muted shrink-0">
                                <img src={product.image} alt={product.productName} className="h-full w-full object-cover" />
                              </div>
                            </ImageLightbox>
                          ) : (
                            <div className="h-7 w-7 rounded-md border bg-muted shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{product?.productName ?? "Unknown"}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{display.productCode}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1.5 text-muted-foreground tabular-nums">
                        {display.maxCapacity}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => startEdit(key)}
                            disabled={adding || (editingKey !== null && editingKey !== key)}
                            className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <PencilIcon className="size-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(placement)}
                            disabled={adding || editingKey !== null}
                            className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {selectedMachine && visiblePlacements.length === 0 && visiblePendingAdds.length === 0 && !adding && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No products assigned to this machine yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  )
}
