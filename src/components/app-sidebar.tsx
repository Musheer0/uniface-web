"use client"

import * as React from "react"
import Link from "next/link"
import { Clapperboard, CreditCard, Images, Plus, ScanFace } from "lucide-react"

import { NavMain } from "@/components/nav-main"
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
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "New",
    url: "/new",
    icon: <Plus />,
  },
  {
    title: "Faces",
    url: "/faces",
    icon: <ScanFace />,
  },
  {
    title: "Library",
    url: "/library",
    icon: <Images />,
  },
  {
    title: "Generations",
    url: "/generations",
    icon: <Clapperboard />,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: <CreditCard />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/faces" />}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ScanFace className="size-4" />
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Uniface</span>
                <span className="truncate text-xs text-muted-foreground">
                  Face blur studio
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
