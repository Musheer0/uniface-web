import { AppSidebar } from "@/components/app-sidebar";
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/trpc/client";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
  <NuqsAdapter>
      <TRPCReactProvider>
      <TooltipProvider>
        <SidebarProvider className="min-w-0 overflow-x-clip">
          <AppSidebar />
          <SidebarInset className="min-w-0 overflow-x-clip">
            <main className="flex h-full min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </TRPCReactProvider>
  </NuqsAdapter>
  );
}
