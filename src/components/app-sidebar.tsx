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
      className="border-r border-white/10 bg-[#111111] text-white"
    >
      {/* Brand */}
      <SidebarHeader className="px-3 pt-4 pb-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/faces" />}
              className="h-12 gap-3 rounded-xl px-2 hover:bg-white/[0.06] hover:text-white"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-black">
                <ScanFace className="size-5" />
              </span>

              <span className="grid flex-1 text-left leading-tight">
                <span className="text-[15px] font-semibold tracking-tight">
                  Uniface
                </span>
                <span className="mt-0.5 text-xs text-white/45">
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
          <SidebarGroupLabel className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
            Workspace
          </SidebarGroupLabel>

          <SidebarMenu className="gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
           
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={item.url.includes(pathname)}
                    render={<Link href={item.url} />}
                    className={[
                      "h-10 gap-3 rounded-lg px-3 text-[14px]",
                      "text-white/65 transition-colors",
                      "hover:bg-white/[0.06] hover:text-white",
                      "data-[active=true]:bg-white/[0.09]",
                      "data-[active=true]:font-medium",
                      "data-[active=true]:text-white",
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
      <SidebarFooter className="mt-auto border-t border-white/[0.08] px-2 py-3">
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