"use client"

import * as React from "react"
import { AppLayout } from "@/components/app-layout"
import { EditMachinesContent } from "@/components/edit-machines-content"
import { EditPageToolbar } from "@/components/edit-page-toolbar"

export default function EditMachinesPage() {
  const saveRef = React.useRef<(() => Promise<void>) | null>(null)
  const [isDirty, setIsDirty] = React.useState(false)

  return (
    <AppLayout title="Manage Machines">
      <div className="flex flex-col h-screen">
        <EditPageToolbar
          title="Manage Machines"
          onSave={async () => {
            await (saveRef.current?.() ?? Promise.resolve())
            setIsDirty(false)
          }}
          isDirty={isDirty}
        />
        <div className="flex-1 overflow-hidden p-4">
          <EditMachinesContent onSaveRef={saveRef} onDirtyChange={setIsDirty} />
        </div>
      </div>
    </AppLayout>
  )
}
