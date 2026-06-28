import { AppLayout } from "@/components/app-layout"
import { InboxIcon } from "lucide-react"

export default function InboxPage() {
  return (
    <AppLayout title="Inbox">
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <InboxIcon className="size-10 opacity-30" />
        <p className="text-sm">No messages yet.</p>
      </div>
    </AppLayout>
  )
}
