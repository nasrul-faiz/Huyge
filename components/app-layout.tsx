"use client"

import {
  HomeIcon,
  SettingsIcon,
  ChevronsUpDownIcon,
  CheckIcon,
  HistoryIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  PencilIcon,
  ServerIcon,
  LayoutGridIcon,
  PackageIcon,
  SearchIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const workspaces = [
  {
    id: "refill",
    name: "Refill",
    description: "Key-in refill data",
    icon: RefreshCwIcon,
    initial: "R",
    color: "bg-blue-600",
    url: "/home",
  },
  {
    id: "ordering",
    name: "Ordering",
    description: "Place product orders",
    icon: ShoppingCartIcon,
    initial: "O",
    color: "bg-emerald-600",
    url: "/ordering",
  },
  {
    id: "edit",
    name: "Edit Mode",
    description: "Manage products & slots",
    icon: PencilIcon,
    initial: "E",
    color: "bg-violet-600",
    url: "/edit",
  },
]

const refillNavItems = [
  { title: "Refill Service", icon: HomeIcon, url: "/home" },
  { title: "History", icon: HistoryIcon, url: "/history" },
  { title: "View DO", icon: SearchIcon, url: "/view-do" },
]

const orderingNavItems = [
  { title: "Ordering", icon: HomeIcon, url: "/ordering" },
  { title: "View DO", icon: SearchIcon, url: "/view-do" },
]

const editNavItems = [
  { title: "Overview", icon: PencilIcon, url: "/edit" },
]

const settingsItems = [
  { title: "Settings", icon: SettingsIcon, url: "/settings" },
]

interface AppLayoutProps {
  title: string
  children: React.ReactNode
}

export function AppLayout({ title, children }: AppLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  const activeWorkspace =
    workspaces.find((ws) => pathname.startsWith(ws.url)) ?? workspaces[0]
  const navItems =
    activeWorkspace.id === "edit"
      ? editNavItems
      : activeWorkspace.id === "ordering"
        ? orderingNavItems
        : refillNavItems
  const sidebarDefaultOpen = activeWorkspace.id !== "edit"

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-md ${activeWorkspace.color} text-white text-sm font-bold shrink-0`}
                    >
                      {activeWorkspace.initial}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-sm">
                        {activeWorkspace.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {activeWorkspace.description}
                      </span>
                    </div>
                    <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width)"
                  align="start"
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Apps
                  </DropdownMenuLabel>
                  {workspaces.map((ws) => {
                    const isActive = ws.id === activeWorkspace.id
                    return (
                      <DropdownMenuItem
                        key={ws.id}
                        className="gap-2"
                        onSelect={() => router.push(ws.url)}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded ${ws.color} text-white text-xs font-bold shrink-0`}
                        >
                          {ws.initial}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm">{ws.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {ws.description}
                          </span>
                        </div>
                        {isActive && (
                          <CheckIcon className="ml-auto size-4 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      Switch between apps to manage refills, orders, and products.
                    </p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild closeOnClick>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {settingsItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild closeOnClick>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <ThemeToggle />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <SidebarTrigger />
          <div className="w-px h-4 bg-border shrink-0" />
          <nav className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-muted-foreground shrink-0">{activeWorkspace.name}</span>
            {title !== activeWorkspace.name && (
              <>
                <ChevronRightIcon className="size-3.5 text-muted-foreground/50 shrink-0" />
                <span className="font-semibold truncate">{title}</span>
              </>
            )}
          </nav>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
