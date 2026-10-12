"use client"

import { useMemo, useState } from "react"
import { ImageOff, Search, SearchX, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { UploadFaceDialog } from "./upload-face-dailog"
import { FaceCard } from "./face-card"
import { useFaces } from "../hooks/use-faces"

const SKELETON_COUNT = 8
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"

export const FacesList = () => {
  const [query, setQuery] = useState("")
  const { data: faces, isPending, isError, refetch } = useFaces()

  // Client-side filter over the fetched data (no extra requests while typing).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return faces ?? []
    return (faces ?? []).filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.fileName ?? "").toLowerCase().includes(q),
    )
  }, [faces, query])

  if (isPending) {
    return (
      <div>
        <Skeleton className="mb-5 h-9 w-full max-w-sm" />
        <div className={GRID}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="flex items-center justify-between gap-2 py-2.5 pr-3 pl-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="size-5 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-8 text-center"
      >
        <p className="text-sm font-medium text-destructive">Couldn&apos;t load faces.</p>
        <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const total = faces?.length ?? 0

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ImageOff className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">No faces yet</p>
          <p className="text-xs text-muted-foreground">Upload a photo or video to add your first face.</p>
        </div>
        <UploadFaceDialog>
          <Button size="sm">Upload a face</Button>
        </UploadFaceDialog>
      </div>
    )
  }

  const hasQuery = query.trim().length > 0

  return (
    <div>
      {/* Toolbar: search on the left, count on the right */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search faces"
            aria-label="Search faces"
            className="pr-8 pl-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <p className="shrink-0 text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {hasQuery ? `${filtered.length} of ${total}` : `${total} ${total === 1 ? "face" : "faces"}`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-5" />
          </span>
          <p className="text-sm font-medium">No faces match &ldquo;{query.trim()}&rdquo;</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className={GRID}>
          {filtered.map((face) => (
            <FaceCard key={face.id} face={face} />
          ))}
        </div>
      )}
    </div>
  )
}