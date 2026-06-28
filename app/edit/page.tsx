import { AppLayout } from "@/components/app-layout"
import Link from "next/link"
import { ServerIcon, PackageIcon, LayoutGridIcon } from "lucide-react"

const sections = [
  {
    href: "/edit/machines",
    icon: ServerIcon,
    title: "Machines",
    description: "Add, edit, or remove vending machines and their locations.",
  },
  {
    href: "/edit/machine-products",
    icon: LayoutGridIcon,
    title: "Machine Products",
    description: "Assign products to machine slots and set max capacity.",
  },
  {
    href: "/edit/products",
    icon: PackageIcon,
    title: "Product Master",
    description: "Manage the product catalogue — names and images.",
  },
]

export default function EditPage() {
  return (
    <AppLayout title="Edit Mode">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
              <s.icon className="size-5 text-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  )
}
