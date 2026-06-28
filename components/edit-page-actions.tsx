"use client"

import Link from "next/link"
import { ArrowLeftIcon, SaveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EditPageActionsProps {
  backHref?: string
  saveLabel?: string
  statusMessage?: string
  saveDisabled?: boolean
  isSaving?: boolean
  onSave: () => void
}

export function EditPageActions({
  backHref = "/edit",
  saveLabel = "Save",
  statusMessage,
  saveDisabled,
  isSaving,
  onSave,
}: EditPageActionsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href={backHref}>
            <ArrowLeftIcon className="size-3.5" />
            Back
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          {statusMessage ?? "Changes stay local until you save them to Neon."}
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        className="gap-1.5"
        disabled={saveDisabled || isSaving}
        onClick={onSave}
      >
        <SaveIcon className="size-3.5" />
        {isSaving ? "Saving..." : saveLabel}
      </Button>
    </div>
  )
}