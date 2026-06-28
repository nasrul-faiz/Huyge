"use client"

import * as React from "react"
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CheckIcon,
  XIcon,
  LinkIcon,
  UploadIcon,
} from "lucide-react"
import { getProducts, type Product, type ProductType } from "@/lib/product-store"
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

const inputCls =
  "w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"

const PRODUCT_TYPES: ProductType[] = ["RTE", "GM", "LLSD"]

const emptyProduct = (): Product => ({
  productCode: "",
  productName: "",
  image: "",
  maxQuantity: 0,
  type: "",
})

interface EditRowProps {
  draft: Product
  onDraftChange: (product: Product) => void
  onConfirm: () => void
  onCancel: () => void
  confirmLoading?: boolean
}

function EditRow({ draft, onDraftChange, onConfirm, onCancel, confirmLoading }: EditRowProps) {
  const [imageMode, setImageMode] = React.useState<"url" | "upload">("url")
  const fileRef = React.useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onDraftChange({ ...draft, image: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <TableRow className="bg-accent/20">
      <TableCell className="py-1.5 text-center">
        <input
          className={inputCls}
          value={draft.productCode}
          onChange={(e) => onDraftChange({ ...draft, productCode: e.target.value })}
        />
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex flex-col gap-1.5">
          <input
            className={inputCls}
            value={draft.productName}
            onChange={(e) => onDraftChange({ ...draft, productName: e.target.value })}
            placeholder="Product name"
          />
          <div className="flex items-center gap-1">
            {draft.image && (
              <div className="h-7 w-7 rounded overflow-hidden border bg-muted shrink-0">
                <img src={draft.image} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex gap-1 flex-1">
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] border transition-colors ${
                  imageMode === "url"
                    ? "bg-foreground text-background border-foreground"
                    : "text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <LinkIcon className="size-3" /> URL
              </button>
              <button
                type="button"
                onClick={() => { setImageMode("upload"); fileRef.current?.click() }}
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] border transition-colors ${
                  imageMode === "upload"
                    ? "bg-foreground text-background border-foreground"
                    : "text-muted-foreground border-border hover:text-foreground"
                }`}
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
              onChange={(e) => onDraftChange({ ...draft, image: e.target.value })}
              placeholder="https://..."
            />
          )}
        </div>
      </TableCell>
      <TableCell className="py-1.5 text-center">
        <select
          className={inputCls + " text-center text-[10px]"}
          value={draft.type ?? ""}
          onChange={(e) => onDraftChange({ ...draft, type: e.target.value as ProductType | "" })}
        >
          <option value="">—</option>
          {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </TableCell>
      <TableCell className="py-1.5 text-center">
        <input
          type="number"
          min={0}
          className={inputCls + " text-center"}
          value={draft.maxQuantity === 0 ? "" : draft.maxQuantity}
          onChange={(e) => onDraftChange({ ...draft, maxQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
          placeholder="0"
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

interface EditProductsContentProps {
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>
  onDirtyChange?: (dirty: boolean) => void
}

export function EditProductsContent({ onSaveRef, onDirtyChange }: EditProductsContentProps) {
  const [products, setProducts] = React.useState<Product[]>([])
  // drafts: confirmed edits pending Save, keyed by productCode
  const [drafts, setDrafts] = React.useState<Record<string, Product>>({})
  const [pendingAdds, setPendingAdds] = React.useState<Product[]>([])
  const [editingCode, setEditingCode] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [addDraft, setAddDraft] = React.useState<Product>(emptyProduct())
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    onDirtyChange?.(Object.keys(drafts).length > 0 || pendingAdds.length > 0)
  }, [drafts, pendingAdds, onDirtyChange])

  React.useEffect(() => {
    getProducts().then((prods) => { setProducts(prods); setLoading(false) })
  }, [])

  const handleSaveAll = React.useCallback(async () => {
    let hadError = false
    let hadSuccess = false
    const remainingDrafts: Record<string, Product> = { ...drafts }
    const remainingPendingAdds: Product[] = []
    const currentCodes = new Set(products.map((p) => p.productCode))

    for (const [code, draft] of Object.entries(drafts)) {
      const existing = products.find((p) => p.productCode === code)
      if (!existing?.id) {
        hadError = true
        continue
      }
      const finalCode = draft.productCode.trim().toUpperCase()
      if (!finalCode || !draft.productName.trim()) {
        hadError = true
        continue
      }

      const duplicate = products.some((p) => p.productCode === finalCode && p.id !== existing.id)
      if (duplicate) {
        hadError = true
        continue
      }

      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: existing.id,
          product_code: finalCode,
          product_name: draft.productName.trim(),
          image: draft.image.trim(),
          max_quantity: draft.maxQuantity ?? 0,
          type: draft.type ?? "",
          previous_product_code: code,
        }),
      })
      if (res.ok) {
        hadSuccess = true
        setProducts((prev) =>
          prev.map((p) =>
            p.productCode === code
              ? { ...p, productCode: finalCode, productName: draft.productName.trim(), image: draft.image.trim(), maxQuantity: draft.maxQuantity ?? 0, type: draft.type ?? "" }
              : p
          )
        )
        if (finalCode !== code) {
          currentCodes.delete(code)
          currentCodes.add(finalCode)
        }
        delete remainingDrafts[code]
      } else {
        hadError = true
      }
    }

    for (const pending of pendingAdds) {
      const finalCode = pending.productCode.trim().toUpperCase()
      const finalName = pending.productName.trim()
      if (!finalCode || !finalName) {
        hadError = true
        remainingPendingAdds.push(pending)
        continue
      }
      if (currentCodes.has(finalCode)) {
        hadError = true
        remainingPendingAdds.push(pending)
        continue
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_code: finalCode,
          product_name: finalName,
          image: pending.image.trim(),
          max_quantity: pending.maxQuantity ?? 0,
          type: pending.type ?? "",
        }),
      })

      if (res.ok) {
        hadSuccess = true
        currentCodes.add(finalCode)
      } else {
        hadError = true
        remainingPendingAdds.push(pending)
      }
    }

    if (hadSuccess) {
      const latest = await getProducts()
      setProducts(latest)
    }

    setDrafts(remainingDrafts)
    setPendingAdds(remainingPendingAdds)
    setEditingCode(null)

    if (hadError) {
      throw new Error("Some product changes could not be saved.")
    }
  }, [drafts, pendingAdds, products])

  React.useEffect(() => {
    if (onSaveRef) onSaveRef.current = handleSaveAll
  }, [handleSaveAll, onSaveRef])

  function startAdd() {
    setAdding(true)
    setEditingCode(null)
    setAddDraft(emptyProduct())
  }

  function confirmNew() {
    const finalCode = addDraft.productCode.trim().toUpperCase()
    const finalName = addDraft.productName.trim()
    if (!finalCode || !finalName) return

    const duplicateInProducts = products.some((p) => p.productCode === finalCode)
    const duplicateInDrafts = Object.values(drafts).some(
      (d) => d.productCode.trim().toUpperCase() === finalCode
    )
    const duplicateInPending = pendingAdds.some((p) => p.productCode === finalCode)
    if (duplicateInProducts || duplicateInDrafts || duplicateInPending) return

    setPendingAdds((prev) => [
      ...prev,
      {
        ...addDraft,
        productCode: finalCode,
        productName: finalName,
        image: addDraft.image.trim(),
        maxQuantity: addDraft.maxQuantity ?? 0,
        type: addDraft.type ?? "",
      },
    ])
    setAdding(false)
    setAddDraft(emptyProduct())
  }

  function cancelNew() {
    setAdding(false)
    setAddDraft(emptyProduct())
  }

  function startEdit(code: string) {
    const product = products.find((p) => p.productCode === code)
    if (!product) return
    setEditingCode(code)
    setAdding(false)
    setDrafts((prev) => ({ ...prev, [code]: prev[code] ?? { ...product } }))
  }

  function confirmEdit() {
    setEditingCode(null)
  }

  function cancelEdit(code: string) {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[code]
      return next
    })
    setEditingCode(null)
  }

  async function confirmDelete() {
    if (!deleteTarget?.id) return
    const res = await fetch(`/api/products?id=${deleteTarget.id}`, { method: "DELETE" })
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      if (deleteTarget.productCode) {
        setDrafts((prev) => {
          const next = { ...prev }
          delete next[deleteTarget.productCode]
          return next
        })
      }
    }
    setDeleteTarget(null)
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete product?"
        description={`"${deleteTarget?.productName}" (${deleteTarget?.productCode}) will be permanently removed.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 && "s"} in master list
          </p>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={startAdd}
            disabled={editingCode !== null || adding}
          >
            <PlusIcon className="size-3.5" />
            Add Product
          </Button>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden text-xs">
          <div className="max-h-[calc(100vh-240px)] overflow-auto">
            <Table className="text-xs min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Code", "Product Name / Image", "Type", "Max Qty", "Actions"].map((h) => (
                  <TableHead key={h} className="text-center text-[11px] font-semibold tracking-wide py-2">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && (
                <EditRow
                  draft={addDraft}
                  onDraftChange={setAddDraft}
                  onConfirm={confirmNew}
                  onCancel={cancelNew}
                />
              )}
              {pendingAdds.map((pending) => (
                <TableRow
                  key={`pending-${pending.productCode}`}
                  className="h-10 border-l-2 border-l-amber-400 bg-amber-50/20 dark:bg-amber-950/10"
                >
                  <TableCell className="text-center py-1.5 text-muted-foreground font-mono">
                    <div className="flex items-center justify-center gap-1">
                      {pending.productCode}
                      <span className="inline-block size-1.5 rounded-full bg-amber-400 shrink-0" />
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex items-center gap-2">
                      {pending.image ? (
                        <ImageLightbox src={pending.image} alt={pending.productName}>
                          <div className="h-7 w-7 rounded-md overflow-hidden border bg-muted shrink-0">
                            <img src={pending.image} alt={pending.productName} className="h-full w-full object-cover" />
                          </div>
                        </ImageLightbox>
                      ) : (
                        <div className="h-7 w-7 rounded-md border bg-muted shrink-0" />
                      )}
                      <span className="font-medium truncate max-w-[200px]">{pending.productName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-1.5 text-[10px] text-muted-foreground">
                    {pending.type || <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="text-center py-1.5 tabular-nums text-muted-foreground">
                    {(pending.maxQuantity ?? 0) > 0 ? pending.maxQuantity : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => setPendingAdds((prev) => prev.filter((p) => p.productCode !== pending.productCode))}
                        disabled={adding || editingCode !== null}
                        className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.map((item) => {
                const hasDraft = drafts[item.productCode] !== undefined
                const isEditing = editingCode === item.productCode

                if (isEditing && drafts[item.productCode]) {
                  return (
                    <EditRow
                      key={item.productCode}
                      draft={drafts[item.productCode]}
                      onDraftChange={(p) => setDrafts((prev) => ({ ...prev, [item.productCode]: p }))}
                      onConfirm={confirmEdit}
                      onCancel={() => cancelEdit(item.productCode)}
                    />
                  )
                }

                const display = hasDraft ? drafts[item.productCode] : item

                return (
                  <TableRow
                    key={item.productCode}
                    className={`h-10 ${hasDraft ? "border-l-2 border-l-amber-400 bg-amber-50/20 dark:bg-amber-950/10" : ""}`}
                  >
                    <TableCell className="text-center py-1.5 text-muted-foreground font-mono">
                      <div className="flex items-center justify-center gap-1">
                        {display.productCode}
                        {hasDraft && <span className="inline-block size-1.5 rounded-full bg-amber-400 shrink-0" />}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-2">
                        {display.image ? (
                          <ImageLightbox src={display.image} alt={display.productName}>
                            <div className="h-7 w-7 rounded-md overflow-hidden border bg-muted shrink-0">
                              <img src={display.image} alt={display.productName} className="h-full w-full object-cover" />
                            </div>
                          </ImageLightbox>
                        ) : (
                          <div className="h-7 w-7 rounded-md border bg-muted shrink-0" />
                        )}
                        <span className="font-medium truncate max-w-[200px]">{display.productName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-1.5 text-[10px] text-muted-foreground">
                      {display.type || <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="text-center py-1.5 tabular-nums text-muted-foreground">
                      {(display.maxQuantity ?? 0) > 0 ? display.maxQuantity : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => startEdit(item.productCode)}
                          disabled={adding || (editingCode !== null && editingCode !== item.productCode)}
                          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          disabled={adding || editingCode !== null}
                          className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {products.length === 0 && !adding && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No products yet.
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
