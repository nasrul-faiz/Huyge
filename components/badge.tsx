import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "ok" | "low" | "empty" | "default"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "ok" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        variant === "low" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        variant === "empty" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        variant === "default" && "bg-muted text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
