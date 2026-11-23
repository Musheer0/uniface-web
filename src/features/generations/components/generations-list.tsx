"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { History, RefreshCw } from "lucide-react"
import { useQueryState } from "nuqs"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useGenerations } from "../hooks"
import { GenerationCard } from "./generation-card"
import { GenerationDetailsDialog } from "./generation-details-dialog"

const SKELETON_COUNT = 8

export const GenerationsList = () => {
  const [, setActiveId] = useQueryState("active")
  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useGenerations()

  const items = data?.pages.flatMap((page) => page.items) ?? []

  let content: ReactNode

  if (isPending) {
    content = (
      <div>
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  } else if (isError) {
    content = (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-8 text-center">
        <p className="text-sm font-medium text-destructive">Couldn&apos;t load generations.</p>
        <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  } else if (items.length === 0) {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <History className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">No generations yet</p>
          <p className="text-xs text-muted-foreground">
            Blurred photos and videos will appear here once processing starts.
          </p>
        </div>
        <Button render={<Link href="/new" />} size="sm">
          Create a generation
        </Button>
      </div>
    )
  } else {
    content = (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {items.length} generation{items.length === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <GenerationCard
              key={item.id}
              item={item}
              onSelect={(id) => {
                // Push a history entry so browser back closes the dialog.
                void setActiveId(id, { history: "push" })
              }}
            />
          ))}
        </div>

        {hasNextPage && (
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="outline"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {content}
      <GenerationDetailsDialog items={items} />
    </>
  )
}
