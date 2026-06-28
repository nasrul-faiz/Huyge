import { AppLayout } from "@/components/app-layout"
import { UsersIcon } from "lucide-react"

export default function TeamPage() {
  return (
    <AppLayout title="Team">
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <UsersIcon className="size-10 opacity-30" />
        <p className="text-sm">No team members yet.</p>
      </div>
    </AppLayout>
  )
}
