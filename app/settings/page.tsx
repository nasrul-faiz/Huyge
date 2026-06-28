import { AppLayout } from "@/components/app-layout"
import { LayersIcon } from "lucide-react"
import {
  COLOR_LABELS,
  DAYS,
  EXPIRED_COLORS,
  MOVE_FRONT_COLORS,
  STOCK_IN_COLORS,
} from "@/lib/color-expired"

function ColorPill({ color }: { color: string }) {
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 rounded-full border border-black/10 dark:border-white/10"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  )
}

export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-3.5 py-3">
            <LayersIcon className="size-4 text-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground tracking-tight leading-snug">Colour Expired</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Colour codes for stock activities</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-border p-3 sm:grid-cols-3">
            {COLOR_LABELS.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5">
                <ColorPill color={color} />
                <span className="text-xs text-foreground font-medium leading-tight">{label}</span>
            </div>
            ))}
          </div>

          <div
            className="grid items-end bg-muted/30 px-4 py-2.5 gap-2"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
          >
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground text-center">Day</span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground text-center">Out</span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground text-center">Front</span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground text-center">In</span>
          </div>

          <div className="flex flex-col">
            {DAYS.map((day, i) => (
              <div
                key={day}
                className="grid items-center px-4 py-3 gap-2 border-t border-border/60"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
              >
                <div className="min-w-0 text-center">
                  <p className="text-[11px] font-semibold truncate text-foreground">{day}</p>
                </div>
                <div className="flex justify-center"><ColorPill color={EXPIRED_COLORS[i]} /></div>
                <div className="flex justify-center"><ColorPill color={MOVE_FRONT_COLORS[i]} /></div>
                <div className="flex justify-center"><ColorPill color={STOCK_IN_COLORS[i]} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
