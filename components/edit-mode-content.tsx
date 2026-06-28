"use client"

import * as React from "react"
import { PlusIcon, PencilIcon, Trash2Icon, CheckIcon, XIcon, ServerIcon, PackageIcon, UploadIcon, LinkIcon } from "lucide-react"
import { getRefillData, saveRefillData, type RefillDataMap } from "@/lib/refill-store"
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
import { getMachines, type Machine } from "@/lib/machine-store"
import { ImageLightbox } from "@/components/image-lightbox"

type Tab = "products" | "machines"
type Product = Pick<RefillItem, "productCode" | "productName" | "image">
type MachinePlacement = Omit<RefillItem, "productName" | "image"> & { machineId: string }

function buildInitialProducts(data: RefillDataMap): Product[] {
  const map = new Map<string, Product>()
  Object.values(data).forEach((items) => {
    items.forEach((item) => {
      if (!map.has(item.productCode)) {
        map.set(item.productCode, {
          productCode: item.productCode,
          productName: item.productName,
          image: item.image,
        })
      }
    })
  })
  return Array.from(map.values())
}

function buildInitialPlacements(data: RefillDataMap): MachinePlacement[] {
  return Object.entries(data).flatMap(([machineId, items]) =>
    items.map((item) => ({
      slot: item.slot,
      productCode: item.productCode,
      stockIn: item.stockIn,
      overflow: item.overflow,
      stockOut: item.stockOut,
      currentInventory: item.currentInventory,
      maxCapacity: item.maxCapacity,
      machineId,
    }))
  )
}

function buildRefillDataMap(placements: MachinePlacement[], products: Product[]): RefillDataMap {
  const productMap = new Map(products.map((product) => [product.productCode, product]))

  return placements.reduce<RefillDataMap>((acc, placement) => {
    const product = productMap.get(placement.productCode)
    if (!product) return acc

    const item: RefillItem = {
      slot: placement.slot,
      productCode: placement.productCode,
      productName: product.productName,
      image: product.image,
      stockIn: placement.stockIn,
      overflow: placement.overflow,
      stockOut: placement.stockOut,
      currentInventory: placement.currentInventory,
      maxCapacity: placement.maxCapacity,
    }

    if (!acc[placement.machineId]) {
      acc[placement.machineId] = []
    }
    acc[placement.machineId].push(item)
    return acc
  }, {})
}

const inputCls =
  "w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"

// ─── Product edit row ───────────────────────────────────────────────────────

interface EditRowProps {
  item: Product
  onSave: (updated: Product) => void
  onCancel: () => void
}

function EditRow({ item, onSave, onCancel }: EditRowProps) {
  const [draft, setDraft] = React.useState(item)
  const [imageMode, setImageMode] = React.useState<"url" | "upload">("url")
  const fileRef = React.useRef<HTMLInputElement>(null)

  function set<K extends keyof Product>(key: K, val: Product[K]) {
    setDraft((prev) => ({ ...prev, [key]: val }))
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set("image", reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <TableRow className="bg-accent/20">
      <TableCell className="py-1.5 text-center">
        <input className={inputCls} value={draft.productCode} onChange={(e) => set("productCode", e.target.value)} />
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex flex-col gap-1.5">
          <input className={inputCls} value={draft.productName} onChange={(e) => set("productName", e.target.value)} placeholder="Product name" />
          <div className="flex items-center gap-1">
            {draft.image && (
              <div className="relative h-7 w-7 rounded overflow-hidden border bg-muted shrink-0">
                <img src={draft.image} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex gap-1 flex-1">
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] border transition-colors ${imageMode === "url" ? "bg-foreground text-background border-foreground" : "text-muted-foreground border-border hover:text-foreground"}`}
              >
                <LinkIcon className="size-3" /> URL
              </button>
              <button
                type="button"
                onClick={() => { setImageMode("upload"); fileRef.current?.click() }}
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] border transition-colors ${imageMode === "upload" ? "bg-foreground text-background border-foreground" : "text-muted-foreground border-border hover:text-foreground"}`}
              >
                <UploadIcon className="size-3" /> Upload
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </div>
          {imageMode === "url" && (
            <input
              className={inputCls}
              value={draft.image}
              onChange={(e) => set("image", e.target.value)}
              placeholder="https://..."
            />
          )}
        </div>
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex justify-center gap-1">
          <button onClick={() => onSave(draft)} className="rounded p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600">
            <CheckIcon className="size-3.5" />
          </button>
          <button onClick={onCancel} className="rounded p-1 hover:bg-muted text-muted-foreground">
            <XIcon className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Machine product placement edit row ────────────────────────────────────

interface PlacementEditRowProps {
  item: MachinePlacement
  products: Product[]
  onSave: (updated: MachinePlacement) => void
  onCancel: () => void
}

function PlacementEditRow({ item, products, onSave, onCancel }: PlacementEditRowProps) {
  const [draft, setDraft] = React.useState(item)

  function set<K extends keyof MachinePlacement>(key: K, val: MachinePlacement[K]) {
    setDraft((prev) => ({ ...prev, [key]: val }))
  }

  return (
    <TableRow className="bg-accent/20">
      <TableCell className="py-1.5 text-center">
        <input className={inputCls} value={draft.slot} onChange={(e) => set("slot", e.target.value)} />
      </TableCell>
      <TableCell className="py-1.5">
        <select className={inputCls} value={draft.productCode} onChange={(e) => set("productCode", e.target.value)}>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.productCode} value={product.productCode}>
              {product.productCode} — {product.productName}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="py-1.5 text-center">
        <input
          type="number"
          min={0}
          className={inputCls}
          value={draft.maxCapacity}
          onChange={(e) => set("maxCapacity", Math.max(0, parseInt(e.target.value) || 0))}
        />
      </TableCell>
      <TableCell className="py-1.5 text-center">
        <span className="font-mono text-[11px] text-muted-foreground">{draft.machineId}</span>
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex justify-center gap-1">
          <button onClick={() => onSave(draft)} className="rounded p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600">
            <CheckIcon className="size-3.5" />
          </button>
          <button onClick={onCancel} className="rounded p-1 hover:bg-muted text-muted-foreground">
            <XIcon className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Machine edit row ───────────────────────────────────────────────────────

interface MachineEditRowProps {
  machine: Machine
  onSave: (updated: Machine) => void
  onCancel: () => void
}

function MachineEditRow({ machine, onSave, onCancel }: MachineEditRowProps) {
  const [draft, setDraft] = React.useState(machine)
  return (
    <TableRow className="bg-accent/20">
      <TableCell className="py-1.5">
        <input
          className={inputCls} value={draft.value}
          onChange={(e) => setDraft((p) => ({ ...p, value: e.target.value.toUpperCase() }))}
          placeholder="M0001"
        />
      </TableCell>
      <TableCell className="py-1.5">
        <input
          className={inputCls} value={draft.label}
          onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
          placeholder="M0001 — Location name"
        />
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex justify-center gap-1">
          <button onClick={() => onSave(draft)} className="rounded p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600">
            <CheckIcon className="size-3.5" />
          </button>
          <button onClick={onCancel} className="rounded p-1 hover:bg-muted text-muted-foreground">
            <XIcon className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function EditModeContent() {
  const [tab, setTab] = React.useState<Tab>("products")
  const [machines, setMachines] = React.useState<Machine[]>([])
  const [initialRefillData, setInitialRefillData] = React.useState<RefillDataMap>({})

  React.useEffect(() => {
    Promise.all([getMachines(), getRefillData()]).then(([m, r]) => {
      setMachines(m)
      setInitialRefillData(r)
    })
  }, [])

  // machines state
  const persistMachines = (updated: Machine[]) => {
    setMachines(updated)
  }

  // product master state
  const [products, setProducts] = React.useState<Product[]>(() => buildInitialProducts(initialRefillData))
  const [editingProductCode, setEditingProductCode] = React.useState<string | null>(null)
  const [addingNew, setAddingNew] = React.useState(false)
  const [newProduct, setNewProduct] = React.useState<Product>({
    productCode: "",
    productName: "",
    image: "",
  })

  // placement state (product x machine)
  const [placements, setPlacements] = React.useState<MachinePlacement[]>(() => buildInitialPlacements(initialRefillData))
  const [selectedPlacementMachine, setSelectedPlacementMachine] = React.useState<string>(() => machines[0]?.value ?? "")
  const [placementEditingKey, setPlacementEditingKey] = React.useState<string | null>(null)
  const [addingPlacement, setAddingPlacement] = React.useState(false)
  const [newPlacement, setNewPlacement] = React.useState<MachinePlacement>({
    slot: "",
    productCode: "",
    stockIn: 0,
    overflow: 0,
    stockOut: 0,
    currentInventory: 0,
    maxCapacity: 10,
    machineId: "",
  })

  const productMap = React.useMemo(
    () => Object.fromEntries(products.map((product) => [product.productCode, product])),
    [products]
  )
  const placementsForMachine = placements
    .filter((placement) => placement.machineId === selectedPlacementMachine)
    .sort((a, b) => a.slot.localeCompare(b.slot))

  React.useEffect(() => {
    saveRefillData(buildRefillDataMap(placements, products))
  }, [placements, products])

  // machine state
  const [editingMachineId, setEditingMachineId] = React.useState<string | null>(null)
  const [addingMachine, setAddingMachine] = React.useState(false)
  const [newMachine, setNewMachine] = React.useState<Machine>({ value: "", label: "" })

  function placementKey(item: MachinePlacement) { return `${item.machineId}-${item.slot}` }

  function handleSaveProduct(updated: Product) {
    const normalizedCode = updated.productCode.trim().toUpperCase()
    if (!normalizedCode || !updated.productName.trim()) return
    if (
      products.some(
        (product) =>
          product.productCode === normalizedCode &&
          product.productCode !== editingProductCode
      )
    ) {
      return
    }

    const finalProduct: Product = {
      ...updated,
      productCode: normalizedCode,
      productName: updated.productName.trim(),
      image: updated.image.trim(),
    }

    setProducts((prev) =>
      prev.map((product) =>
        product.productCode === editingProductCode ? finalProduct : product
      )
    )
    if (editingProductCode && editingProductCode !== finalProduct.productCode) {
      setPlacements((prev) =>
        prev.map((placement) =>
          placement.productCode === editingProductCode
            ? { ...placement, productCode: finalProduct.productCode }
            : placement
        )
      )
    }
    setEditingProductCode(null)
  }

  function handleDeleteProduct(productCode: string) {
    setProducts((prev) => prev.filter((product) => product.productCode !== productCode))
    setPlacements((prev) => prev.filter((placement) => placement.productCode !== productCode))
  }

  function handleAddProduct(draft: Product) {
    const normalizedCode = draft.productCode.trim().toUpperCase()
    if (!normalizedCode || !draft.productName.trim()) return
    if (products.some((product) => product.productCode === normalizedCode)) return

    setProducts((prev) => [
      ...prev,
      {
        productCode: normalizedCode,
        productName: draft.productName.trim(),
        image: draft.image.trim(),
      },
    ])
    setAddingNew(false)
    setNewProduct({ productCode: "", productName: "", image: "" })
  }

  function handleSavePlacement(updated: MachinePlacement) {
    if (!updated.slot.trim() || !updated.productCode.trim()) return
    const normalizedSlot = updated.slot.trim().toUpperCase()
    const normalizedCode = updated.productCode.trim().toUpperCase()

    const duplicateKey = `${updated.machineId}-${normalizedSlot}`
    const hasDuplicate = placements.some((placement) => {
      const key = placementKey(placement)
      return key === duplicateKey && key !== placementEditingKey
    })
    if (hasDuplicate) return

    const finalPlacement: MachinePlacement = {
      ...updated,
      slot: normalizedSlot,
      productCode: normalizedCode,
      maxCapacity: Math.max(0, updated.maxCapacity),
    }

    setPlacements((prev) =>
      prev.map((placement) =>
        placementKey(placement) === placementEditingKey ? finalPlacement : placement
      )
    )
    setPlacementEditingKey(null)
  }

  function handleDeletePlacement(key: string) {
    setPlacements((prev) => prev.filter((placement) => placementKey(placement) !== key))
  }

  function handleAddPlacement(draft: MachinePlacement) {
    if (!draft.machineId || !draft.slot.trim() || !draft.productCode.trim()) return
    const normalizedSlot = draft.slot.trim().toUpperCase()
    const normalizedCode = draft.productCode.trim().toUpperCase()

    if (placements.some((placement) => placement.machineId === draft.machineId && placement.slot === normalizedSlot)) {
      return
    }

    setPlacements((prev) => [
      ...prev,
      {
        ...draft,
        slot: normalizedSlot,
        productCode: normalizedCode,
        maxCapacity: Math.max(0, draft.maxCapacity),
      },
    ])
    setAddingPlacement(false)
    setNewPlacement((prev) => ({
      ...prev,
      slot: "",
      productCode: "",
      maxCapacity: 10,
      machineId: selectedPlacementMachine,
      stockIn: 0,
      overflow: 0,
      stockOut: 0,
      currentInventory: 0,
    }))
  }

  function handleSaveMachine(updated: Machine) {
    const prevMachineId = editingMachineId
    if (!prevMachineId) return
    const normalizedValue = updated.value.trim().toUpperCase()
    if (!normalizedValue) return
    if (machines.some((machine) => machine.value === normalizedValue && machine.value !== prevMachineId)) {
      return
    }

    const normalizedMachine: Machine = {
      value: normalizedValue,
      label: updated.label.trim() || normalizedValue,
    }

    persistMachines(
      machines.map((machine) =>
        machine.value === prevMachineId ? normalizedMachine : machine
      )
    )
    setPlacements((prev) =>
      prev.map((placement) =>
        placement.machineId === prevMachineId
          ? { ...placement, machineId: normalizedMachine.value }
          : placement
      )
    )
    if (selectedPlacementMachine === prevMachineId) {
      setSelectedPlacementMachine(normalizedMachine.value)
    }
    setEditingMachineId(null)
  }

  function handleDeleteMachine(value: string) {
    const updatedMachines = machines.filter((machine) => machine.value !== value)
    persistMachines(updatedMachines)
    setPlacements((prev) => prev.filter((placement) => placement.machineId !== value))
    if (selectedPlacementMachine === value) {
      const fallbackMachine = updatedMachines[0]?.value ?? ""
      setSelectedPlacementMachine(fallbackMachine)
      setNewPlacement((prev) => ({ ...prev, machineId: fallbackMachine }))
    }
  }

  function handleAddMachine(draft: Machine) {
    const normalizedValue = draft.value.trim().toUpperCase()
    if (!normalizedValue) return
    if (machines.some((machine) => machine.value === normalizedValue)) return

    persistMachines([
      ...machines,
      {
        value: normalizedValue,
        label: draft.label.trim() || normalizedValue,
      },
    ])
    if (!selectedPlacementMachine) {
      setSelectedPlacementMachine(normalizedValue)
      setNewPlacement((prev) => ({ ...prev, machineId: normalizedValue }))
    }
    setAddingMachine(false)
    setNewMachine({ value: "", label: "" })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tab toggle */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        <button
          onClick={() => setTab("products")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "products" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PackageIcon className="size-3.5" />
          Products
        </button>
        <button
          onClick={() => setTab("machines")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "machines" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ServerIcon className="size-3.5" />
          Machines
        </button>
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{products.length} products in master list</p>
            <Button size="sm" className="gap-1.5" onClick={() => { setAddingNew(true); setEditingProductCode(null) }}>
              <PlusIcon className="size-3.5" />
              Add Product
            </Button>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden text-xs">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Code", "Product Name", "Image", "Actions"].map((h, i) => (
                    <TableHead key={i} className="text-center text-[11px] font-semibold tracking-wide py-2">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {addingNew && (
                  <EditRow
                    item={newProduct}
                    onSave={handleAddProduct}
                    onCancel={() => setAddingNew(false)}
                  />
                )}
                {products.map((item) => {
                  if (editingProductCode === item.productCode) {
                    return (
                      <EditRow key={item.productCode} item={item}
                        onSave={handleSaveProduct} onCancel={() => setEditingProductCode(null)} />
                    )
                  }
                  return (
                    <TableRow key={item.productCode} className="h-10">
                      <TableCell className="text-center py-1.5 text-muted-foreground">{item.productCode}</TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-2">
                          {item.image && (
                            <ImageLightbox src={item.image} alt={item.productName}>
                              <div className="h-7 w-7 rounded-md overflow-hidden border bg-muted shrink-0">
                                <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                              </div>
                            </ImageLightbox>
                          )}
                          <span className="font-medium truncate max-w-[160px]">{item.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 text-center">
                        {item.image ? (
                          <span className="text-muted-foreground">Ready</span>
                        ) : (
                          <span className="text-muted-foreground">No image</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => setEditingProductCode(item.productCode)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                            <PencilIcon className="size-3.5" />
                          </button>
                          <button onClick={() => handleDeleteProduct(item.productCode)} className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500">
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ── MACHINES TAB ── */}
      {tab === "machines" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{machines.length} machines</p>
            <Button size="sm" className="gap-1.5" onClick={() => { setAddingMachine(true); setEditingMachineId(null); setAddingPlacement(false) }}>
              <PlusIcon className="size-3.5" />
              Add Machine
            </Button>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden text-xs">
            <div className="overflow-x-auto">
            <Table className="text-xs min-w-[640px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Machine ID", "Label / Location", "Actions"].map((h, i) => (
                    <TableHead key={i} className="text-[11px] font-semibold tracking-wide py-2 px-4">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {addingMachine && (
                  <MachineEditRow
                    machine={newMachine}
                    onSave={handleAddMachine}
                    onCancel={() => setAddingMachine(false)}
                  />
                )}
                {machines.map((machine) => {
                  if (editingMachineId === machine.value) {
                    return (
                      <MachineEditRow key={machine.value} machine={machine}
                        onSave={handleSaveMachine} onCancel={() => setEditingMachineId(null)} />
                    )
                  }
                  return (
                    <TableRow key={machine.value} className="h-10">
                      <TableCell className="py-1.5 px-4">
                        <span className="font-mono font-bold tracking-wider">{machine.value}</span>
                      </TableCell>
                      <TableCell className="py-1.5 px-4 text-muted-foreground">{machine.label}</TableCell>
                      <TableCell className="py-1.5 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => setEditingMachineId(machine.value)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                            <PencilIcon className="size-3.5" />
                          </button>
                          <button onClick={() => handleDeleteMachine(machine.value)} className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500">
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden text-xs">
            <div className="px-4 py-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                  Machine Products
                </span>
                <select
                  value={selectedPlacementMachine}
                  onChange={(e) => {
                    setSelectedPlacementMachine(e.target.value)
                    setAddingPlacement(false)
                    setPlacementEditingKey(null)
                  }}
                  className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                >
                  {machines.map((machine) => (
                    <option key={machine.value} value={machine.value}>
                      {machine.value} — {machine.label.replace(`${machine.value} — `, "")}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!selectedPlacementMachine || products.length === 0}
                onClick={() => {
                  setAddingPlacement(true)
                  setPlacementEditingKey(null)
                  setNewPlacement((prev) => ({ ...prev, machineId: selectedPlacementMachine }))
                }}
              >
                <PlusIcon className="size-3.5" />
                Add from Product
              </Button>
            </div>

            <div className="overflow-x-auto">
            <Table className="text-xs min-w-[760px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Slot", "Product", "Max", "Machine", "Actions"].map((h, i) => (
                    <TableHead key={i} className="text-center text-[11px] font-semibold tracking-wide py-2">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {addingPlacement && (
                  <PlacementEditRow
                    item={newPlacement}
                    products={products}
                    onSave={handleAddPlacement}
                    onCancel={() => setAddingPlacement(false)}
                  />
                )}

                {placementsForMachine.map((placement) => {
                  const key = placementKey(placement)
                  const product = productMap[placement.productCode]

                  if (placementEditingKey === key) {
                    return (
                      <PlacementEditRow
                        key={key}
                        item={placement}
                        products={products}
                        onSave={handleSavePlacement}
                        onCancel={() => setPlacementEditingKey(null)}
                      />
                    )
                  }

                  return (
                    <TableRow key={key} className="h-10">
                      <TableCell className="text-center py-1.5">
                        <span className="font-mono font-bold tracking-wider">{placement.slot}</span>
                      </TableCell>
                      <TableCell className="py-1.5 text-center">
                        <div className="mx-auto flex max-w-[220px] items-center justify-center gap-2">
                          {product?.image && (
                            <ImageLightbox src={product.image} alt={product.productName}>
                              <div className="h-7 w-7 rounded-md overflow-hidden border bg-muted shrink-0">
                                <img src={product.image} alt={product.productName} className="h-full w-full object-cover" />
                              </div>
                            </ImageLightbox>
                          )}
                          <span className="truncate font-medium">
                            {product?.productName ?? "Unknown product"}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {placement.productCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1.5 text-muted-foreground tabular-nums">
                        {placement.maxCapacity}
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        <span className="font-mono text-[11px] text-muted-foreground">{placement.machineId}</span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setPlacementEditingKey(key)
                              setAddingPlacement(false)
                            }}
                            className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <PencilIcon className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePlacement(key)}
                            className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {selectedPlacementMachine && placementsForMachine.length === 0 && !addingPlacement && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No products assigned to this machine yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
