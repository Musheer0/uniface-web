"use client"

import { useMemo, useState } from "react"
import { ImageOff, Search, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { UploadFaceDialog } from "./upload-face-dailog"
import { FaceCard } from "./face-card"
import { useFaces } from "../hooks/use-faces"

const SKELETON_COUNT = 6

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
        <Skeleton className="mb-4 h-8 w-full max-w-sm" />
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
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-6 text-center">
        <p className="text-sm font-medium text-destructive">Couldn&apos;t load faces.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if ((faces ?? []).length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ImageOff />
        </span>
        <p className="text-sm font-medium">No faces yet</p>
        <p className="text-xs text-muted-foreground">Upload a photo or video to get started.</p>
        <UploadFaceDialog>
          <Button size="sm">Upload a face</Button>
        </UploadFaceDialog>
      </div>
    )
  }

  return (
    <div>
      <div className="relative mb-4 w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search faces"
          className="pl-8"
        />
      </div>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        {query.trim()
          ? `${filtered.length} of ${faces?.length} faces`
          : `${faces?.length} face${faces?.length === 1 ? "" : "s"}`}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX />
          </span>
          <p className="text-sm font-medium">No faces match &ldquo;{query.trim()}&rdquo;</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((face) => (
            <FaceCard key={face.id} face={face} />
          ))}
        </div>
      )}
    </div>
  )
}
