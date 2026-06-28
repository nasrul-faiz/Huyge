"use client"

import * as React from "react"
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CheckIcon,
  XIcon,
} from "lucide-react"
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  type Machine,
} from "@/lib/machine-store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"

const inputCls =
  "w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"

interface MachineEditRowProps {
  draft: Machine
  onDraftChange: (machine: Machine) => void
  onConfirm: () => void
  onCancel: () => void
  confirmLoading?: boolean
}

function MachineEditRow({ draft, onDraftChange, onConfirm, onCancel, confirmLoading }: MachineEditRowProps) {
  return (
    <TableRow className="bg-accent/20">
      <TableCell className="py-1.5 px-4">
        <input
          className={inputCls}
          value={draft.value}
          onChange={(e) => onDraftChange({ ...draft, value: e.target.value.toUpperCase() })}
          placeholder="M0001"
        />
      </TableCell>
      <TableCell className="py-1.5 px-4">
        <input
          className={inputCls}
          value={draft.label}
          onChange={(e) => onDraftChange({ ...draft, label: e.target.value })}
          placeholder="Location name"
        />
      </TableCell>
      <TableCell className="py-1.5 px-4">
        <input
          className={inputCls}
          value={draft.route ?? ""}
          onChange={(e) => onDraftChange({ ...draft, route: e.target.value })}
          placeholder="Route name"
        />
      </TableCell>
      <TableCell className="py-1.5 px-4">
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

interface EditMachinesContentProps {
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>
  onDirtyChange?: (dirty: boolean) => void
}

export function EditMachinesContent({ onSaveRef, onDirtyChange }: EditMachinesContentProps) {
  const [machines, setMachines] = React.useState<Machine[]>([])
  // drafts: confirmed edits pending Save (keyed by machine id string). Excludes "new" (in-progress add).
  const [drafts, setDrafts] = React.useState<Record<string, Machine>>({})
  const [pendingAdds, setPendingAdds] = React.useState<Machine[]>([])
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [addDraft, setAddDraft] = React.useState<Machine>({ value: "", label: "", route: "" })
  const [deleteTarget, setDeleteTarget] = React.useState<Machine | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const dirty = Object.keys(drafts).length > 0 || pendingAdds.length > 0
    onDirtyChange?.(dirty)
  }, [drafts, pendingAdds, onDirtyChange])

  React.useEffect(() => {
    getMachines().then((m) => { setMachines(m); setLoading(false) })
  }, [])

  const handleSaveAll = React.useCallback(async () => {
    let hadError = false
    const remainingPendingAdds: Machine[] = []
    const currentCodes = new Set(machines.map((m) => m.value))
    const remainingDrafts: Record<string, Machine> = { ...drafts }

    for (const [key, draft] of Object.entries(drafts)) {
      const value = draft.value.trim().toUpperCase()
      if (!value) {
        hadError = true
        continue
      }
      const machineId = parseInt(key)
      if (isNaN(machineId)) {
        hadError = true
        continue
      }
      if (machines.some((m) => m.value === value && m.id !== machineId)) {
        hadError = true
        continue
      }
      const updated = await updateMachine({
        ...draft,
        id: machineId,
        value,
        label: draft.label.trim() || value,
        route: draft.route?.trim() ?? "",
      })
      if (updated) {
        setMachines((prev) => prev.map((m) => m.id === machineId ? updated : m))
        currentCodes.delete(draft.value)
        currentCodes.add(updated.value)
        delete remainingDrafts[key]
      } else {
        hadError = true
      }
    }

    for (const pending of pendingAdds) {
      const value = pending.value.trim().toUpperCase()
      if (!value || currentCodes.has(value)) {
        hadError = true
        remainingPendingAdds.push(pending)
        continue
      }

      const created = await createMachine({
        value,
        label: pending.label.trim() || value,
        route: pending.route?.trim() ?? "",
      })

      if (created) {
        currentCodes.add(created.value)
      } else {
        hadError = true
        remainingPendingAdds.push(pending)
      }
    }

    if (pendingAdds.length > 0) {
      const latest = await getMachines()
      setMachines(latest)
    }

    setDrafts(remainingDrafts)
    setPendingAdds(remainingPendingAdds)
    setEditingKey(null)

    if (hadError) {
      throw new Error("Some machine changes could not be saved.")
    }
  }, [drafts, pendingAdds, machines])

  React.useEffect(() => {
    if (onSaveRef) onSaveRef.current = handleSaveAll
  }, [handleSaveAll, onSaveRef])

  function startAdd() {
    setAdding(true)
    setEditingKey(null)
    setAddDraft({ value: "", label: "", route: "" })
  }

  function confirmNew() {
    const value = addDraft.value.trim().toUpperCase()
    if (!value) return
    const duplicateInMachines = machines.some((m) => m.value === value)
    const duplicateInDrafts = Object.values(drafts).some((d) => d.value === value)
    const duplicateInPending = pendingAdds.some((m) => m.value === value)
    if (duplicateInMachines || duplicateInDrafts || duplicateInPending) return

    setPendingAdds((prev) => [
      ...prev,
      {
        ...addDraft,
        value,
        label: addDraft.label.trim() || value,
        route: addDraft.route?.trim() ?? "",
      },
    ])
    setAdding(false)
    setAddDraft({ value: "", label: "", route: "" })
  }

  function cancelNew() {
    setAdding(false)
    setAddDraft({ value: "", label: "", route: "" })
  }

  function startEdit(machine: Machine) {
    if (!machine.id) return
    const key = machine.id.toString()
    setEditingKey(key)
    setAdding(false)
    setDrafts((prev) => ({ ...prev, [key]: prev[key] ?? { ...machine } }))
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
    if (!deleteTarget?.id) return
    const ok = await deleteMachine(deleteTarget.id)
    if (ok) {
      setMachines((prev) => prev.filter((m) => m.id !== deleteTarget.id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[deleteTarget.id!.toString()]
        return next
      })
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
        title="Delete machine?"
        description={`"${deleteTarget?.label ?? deleteTarget?.value}" will be permanently removed.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {machines.length} machine{machines.length !== 1 && "s"}
          </p>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={startAdd}
            disabled={editingKey !== null || adding}
          >
            <PlusIcon className="size-3.5" />
            Add Machine
          </Button>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden text-xs">
          <div className="max-h-[calc(100vh-240px)] overflow-auto">
            <Table className="text-xs min-w-[600px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Machine ID", "Label / Location", "Route", "Actions"].map((h) => (
                    <TableHead key={h} className="text-[11px] font-semibold tracking-wide py-2 px-4">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {adding && (
                  <MachineEditRow
                    draft={addDraft}
                    onDraftChange={setAddDraft}
                    onConfirm={confirmNew}
                    onCancel={cancelNew}
                  />
                )}
                {pendingAdds.map((machine) => (
                  <TableRow
                    key={`pending-${machine.value}`}
                    className="h-10 border-l-2 border-l-amber-400 bg-amber-50/20 dark:bg-amber-950/10"
                  >
                    <TableCell className="py-1.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold tracking-wider">{machine.value}</span>
                        <span className="inline-block size-1.5 rounded-full bg-amber-400 shrink-0" />
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-4 text-muted-foreground">{machine.label}</TableCell>
                    <TableCell className="py-1.5 px-4 text-muted-foreground">
                      {machine.route || <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="py-1.5 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPendingAdds((prev) => prev.filter((m) => m.value !== machine.value))}
                          disabled={adding || editingKey !== null}
                          className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {machines.map((machine) => {
                  const key = machine.id?.toString() ?? machine.value
                  const hasDraft = machine.id !== undefined && drafts[machine.id.toString()] !== undefined
                  const isEditing = editingKey === key

                  if (isEditing && drafts[key]) {
                    return (
                      <MachineEditRow
                        key={machine.id}
                        draft={drafts[key]}
                        onDraftChange={(m) => setDrafts((prev) => ({ ...prev, [key]: m }))}
                        onConfirm={confirmEdit}
                        onCancel={() => cancelEdit(key)}
                      />
                    )
                  }

                  const display = hasDraft ? drafts[machine.id!.toString()] : machine

                  return (
                    <TableRow
                      key={machine.id ?? machine.value}
                      className={`h-10 ${hasDraft ? "border-l-2 border-l-amber-400 bg-amber-50/20 dark:bg-amber-950/10" : ""}`}
                    >
                      <TableCell className="py-1.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold tracking-wider">{display.value}</span>
                          {hasDraft && <span className="inline-block size-1.5 rounded-full bg-amber-400 shrink-0" />}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 px-4 text-muted-foreground">{display.label}</TableCell>
                      <TableCell className="py-1.5 px-4 text-muted-foreground">
                        {display.route || <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="py-1.5 px-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(machine)}
                            disabled={adding || (editingKey !== null && editingKey !== key)}
                            className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <PencilIcon className="size-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(machine)}
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
                {machines.length === 0 && !adding && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No machines yet. Add one to get started.
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
