"use client"

import * as React from "react"
import { AppLayout } from "@/components/app-layout"
import { EditProductsContent } from "@/components/edit-products-content"
import { EditPageToolbar } from "@/components/edit-page-toolbar"

export default function EditProductsPage() {
  const saveRef = React.useRef<(() => Promise<void>) | null>(null)
  const [isDirty, setIsDirty] = React.useState(false)

  return (
    <AppLayout title="Manage Products">
      <div className="flex flex-col h-screen">
        <EditPageToolbar
          title="Product Master"
          onSave={async () => {
            await (saveRef.current?.() ?? Promise.resolve())
            setIsDirty(false)
          }}
          isDirty={isDirty}
        />
        <div className="flex-1 overflow-hidden p-4">
          <EditProductsContent onSaveRef={saveRef} onDirtyChange={setIsDirty} />
        </div>
      </div>
    </AppLayout>
  )
}
