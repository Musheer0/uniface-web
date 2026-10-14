"use client"

import * as React from "react"
import Link from "next/link"
import {
  Clapperboard,
  CreditCard,
  Images,
  Plus,
  ScanFace,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

const navItems = [
  {
    title: "New",
    url: "/new",
    icon: Plus,
  },
  {
    title: "Faces",
    url: "/faces",
    icon: ScanFace,
  },
  {
    title: "Library",
    url: "/library",
    icon: Images,
  },
  {
    title: "Generations",
    url: "/generations",
    icon: Clapperboard,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
]

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname =usePathname()

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      {/* Brand */}
      <SidebarHeader className="px-3 pt-4 pb-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/faces" />}
              className="h-12 gap-3 rounded-xl px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                <ScanFace className="size-5" />
              </span>

              <span className="grid flex-1 text-left leading-tight">
                <span className="text-[15px] font-semibold tracking-tight">
                  Uniface
                </span>
                <span className="mt-0.5 text-xs text-sidebar-foreground/45">
                  Face blur studio
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/35">
            Workspace
          </SidebarGroupLabel>

          <SidebarMenu className="gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.url || pathname.startsWith(`${item.url}/`)

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    render={<Link href={item.url} />}
                    className={[
                      "h-10 gap-3 rounded-lg px-3 text-[14px]",
                      "text-sidebar-foreground/65 transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      "data-[active=true]:bg-sidebar-accent",
                      "data-[active=true]:font-medium",
                      "data-[active=true]:text-sidebar-accent-foreground",
                    ].join(" ")}
                  >
                    <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
                    <span>{item.title} </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* User pinned to bottom */}
      <SidebarFooter className="mt-auto border-t border-sidebar-border px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <NavUser />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}