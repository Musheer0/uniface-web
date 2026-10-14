"use client"

import { isValidElement, useMemo, useState } from "react"
import { Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useMedias, type MediaDTO } from "../hooks"

type SelectMediaDialogProps = {
  children: React.ReactNode
  /** Currently selected media id (controlled selection highlight). */
  selectedMediaId?: string | null
  /** Called with the picked media id. */
  onSelect: (mediaId: string) => void
  /** Optional controlled open state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const MediaOption = ({
  item,
  selected,
  onPick,
}: {
  item: MediaDTO
  selected: boolean
  onPick: () => void
}) => {
  const isVideo = item.type?.startsWith("video/") ?? false
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-xl border p-2 text-left transition-colors",
        selected
          ? "border-ring bg-muted/60"
          : "border-input hover:border-ring hover:bg-muted/40",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black">
        {isVideo ? (
          <video src={item.url} preload="metadata" muted playsInline className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.name}</span>
        {item.type && (
          <span className="block truncate text-xs text-muted-foreground">{item.type}</span>
        )}
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
    </button>
  )
}

export const SelectMediaDialog = ({
  children,
  selectedMediaId = null,
  onSelect,
  open: controlledOpen,
  onOpenChange,
}: SelectMediaDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [query, setQuery] = useState("")
  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMedias()

  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (controlledOpen === undefined) setInternalOpen(next)
  }

  // Flatten pages, hide FACE + GENERATED rows, then filter by name.
  const filtered = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.items) ?? []
    const q = query.trim().toLowerCase()
    return all.filter(
      (m) =>
        m.uploaded_type === "USER" && (!q || m.name.toLowerCase().includes(q)),
    )
  }, [data, query])

  const handlePick = (item: MediaDTO) => {
    onSelect(item.id)
    setOpen(false)
    setQuery("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isValidElement(children) ? (
        <DialogTrigger render={children} />
      ) : (
        <DialogTrigger>{children}</DialogTrigger>
      )}
      <DialogContent
        className="flex max-w-none flex-col overflow-hidden sm:max-w-none"
        style={{
          width: "min(480px, calc(100vw - 32px))",
          maxWidth: "100%",
          maxHeight: "calc(100dvh - 32px)",
          minWidth: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogHeader
          className="min-w-0 max-w-full shrink-0 pr-8"
          style={{ boxSizing: "border-box" }}
        >
          <DialogTitle>Select media</DialogTitle>
          <DialogDescription>Pick a photo or video from your uploads.</DialogDescription>
        </DialogHeader>

        <div className="relative min-w-0 max-w-full shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search media…"
            aria-label="Search media"
            className="pl-8"
          />
        </div>

        <div
          className="grid min-h-0 w-full min-w-0 max-w-full flex-1 gap-2 overflow-x-hidden overflow-y-auto"
          style={{ boxSizing: "border-box" }}
        >
          {isPending ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border p-2">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))
          ) : isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-6 text-center">
              <p className="text-sm font-medium text-destructive">Couldn&apos;t load media.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => refetch()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {query.trim() ? `No media match "${query.trim()}"` : "No uploads yet."}
                </p>
              ) : (
                filtered.map((item) => (
                  <MediaOption
                    key={item.id}
                    item={item}
                    selected={item.id === selectedMediaId}
                    onPick={() => handlePick(item)}
                  />
                ))
              )}
              {hasNextPage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
