import { AppLayout } from "@/components/app-layout"
import { CalendarIcon } from "lucide-react"

export default function CalendarPage() {
  return (
    <AppLayout title="Calendar">
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <CalendarIcon className="size-10 opacity-30" />
        <p className="text-sm">No events scheduled.</p>
      </div>
    </AppLayout>
  )
}
