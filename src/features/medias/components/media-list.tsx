"use client"

import { useMemo, useState } from "react"
import { FileStack, Search, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { MediaCard } from "./media-card"
import { useMedias } from "../hooks/use-medias"

const SKELETON_COUNT = 8

const UPLOADED_TYPE_OPTIONS = [
  { value: "ALL", label: "All types" },
  { value: "USER", label: "Uploaded" },
  { value: "GENERATED", label: "Generated" },
  { value: "FACE", label: "Faces" },
] as const

type UploadedTypeFilter = (typeof UPLOADED_TYPE_OPTIONS)[number]["value"]

export const MediaList = () => {
  const [query, setQuery] = useState("")
  const [uploadedType, setUploadedType] = useState<UploadedTypeFilter>("ALL")
  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMedias()

  // Flatten fetched pages, then filter client-side (no requests while typing).
  const all = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  )
  const isFiltering = query.trim().length > 0 || uploadedType !== "ALL"
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (m) =>
        (uploadedType === "ALL" || m.uploaded_type === uploadedType) &&
        (!q || m.name.toLowerCase().includes(q)),
    )
  }, [all, query, uploadedType])

  const clearFilters = () => {
    setQuery("")
    setUploadedType("ALL")
  }

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
        <p className="text-sm font-medium text-destructive">Couldn&apos;t load media.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileStack />
        </span>
        <p className="text-sm font-medium">No media yet</p>
        <p className="text-xs text-muted-foreground">
          Uploaded photos and videos will appear here.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex w-full flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by file name…"
            aria-label="Search media"
            className="pl-8 h-auto! py-2.5 border-none"
          />
        </div>
        <Select
          value={uploadedType}
          
          onValueChange={(value) => setUploadedType(value as UploadedTypeFilter)}
        >
          <SelectTrigger aria-label="Filter by upload type" className="w-36 ml-auto border-none h-auto! py-2.5 ">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {UPLOADED_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        {isFiltering ? `${filtered.length} of ${all.length} files` : `${all.length} files`}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX />
          </span>
          <p className="text-sm font-medium">
            {query.trim()
              ? <>No files match &ldquo;{query.trim()}&rdquo;</>
              : <>No {uploadedType === "ALL" ? "" : `${UPLOADED_TYPE_OPTIONS.find((o) => o.value === uploadedType)?.label.toLowerCase()} `}files found</>}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
          {hasNextPage && !isFiltering && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
