import type { ReactNode } from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

type SiteHeaderProps = {
  /** Rendered when provided — takes precedence over `children`. */
  title?: string
  /** Rendered only when `title` is not provided. */
  children?: ReactNode
}

export function SiteHeader({ title, children }: SiteHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-auto"
      />
      {title ? (
        <h1 className="text-sm font-medium">{title}</h1>
      ) : (
        children
      )}
    </header>
  )
}
