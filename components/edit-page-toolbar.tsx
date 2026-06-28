"use client"

import * as React from "react"
import { ArrowLeftIcon, SaveIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface EditPageToolbarProps {
  title: string
  onSave: () => Promise<void>
  isDirty?: boolean
}

export function EditPageToolbar({ title, onSave, isDirty = false }: EditPageToolbarProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "success" | "error">("idle")

  async function handleSave() {
    setIsSaving(true)
    setSaveStatus("idle")
    try {
      await onSave()
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      setSaveStatus("error")
      console.error("Save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between border-b bg-background px-4 py-3 gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Go back"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <h1 className="text-sm font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {saveStatus === "success" && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30">
            <CheckCircleIcon className="size-3.5" />
            Saved to database
          </div>
        )}
        {saveStatus === "error" && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30">
            <AlertCircleIcon className="size-3.5" />
            Save failed
          </div>
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className={`gap-1.5 transition-colors ${
            isDirty && !isSaving
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              : ""
          }`}
        >
          <SaveIcon className="size-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}
