"use client"

import { useState } from "react"
import { useQueryState } from "nuqs"
import {
  AlertCircle,
  Clock3,
  Coins,
  Download,
  Film,
  ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { downloadFile } from "@/lib/download-file"
import {
  useDeleteGeneration,
  useGenerationById,
  type GenerationDTO,
} from "../hooks"
import {
  formatDuration,
  STATUS_LABELS,
  STATUS_VARIANTS,
} from "../lib/generation-format"

/**
 * Reads the `active` query param (the generation id) and shows that
 * generation's details. Closing the dialog — via the close button, Escape or
 * browser back — clears the param again.
 */
export const GenerationDetailsDialog = ({
  items,
}: {
  items: GenerationDTO[]
}) => {
  const [activeId, setActiveId] = useQueryState("active")

  const close = () => {
    void setActiveId(null)
  }

  return (
    <AlertDialog
      open={activeId !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {activeId !== null && (
          // Remount on id change so the delete-confirmation state starts fresh.
          <GenerationDetails
            key={activeId}
            activeId={activeId}
            items={items}
            onClose={close}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}

function GenerationDetails({
  activeId,
  items,
  onClose,
}: {
  activeId: string
  items: GenerationDTO[]
  onClose: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const { mutate: deleteGeneration, isPending: isDeleting } =
    useDeleteGeneration()

  // The list already holds the full DTO, so reuse it. Only fetch by id when
  // the link was opened directly and the item isn't in the loaded pages.
  const cached = items.find((item) => item.id === activeId)
  const { data: fetched, isPending, isError } = useGenerationById(
    activeId,
    !cached,
  )
  const data = cached ?? fetched

  const handleDownload = async () => {
    if (!data?.output?.url) return
    setIsDownloading(true)
    try {
      await downloadFile(data.output.url, data.output.name || "generation")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = () => {
    if (!data) return
    deleteGeneration({ id: data.id }, { onSuccess: onClose })
  }

  const isVideo = data
    ? (data.output?.type?.startsWith("video/") ?? data.is_video)
    : false
  const isBusy = data?.status === "PENDING" || data?.status === "STARTED"

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <AlertDialogHeader>
          <AlertDialogTitle>Generation details</AlertDialogTitle>
          <AlertDialogDescription className="break-all">
            {activeId}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {data && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Download generation"
              title="Download"
              disabled={!data.output?.url || isDownloading || confirmDelete}
              onClick={handleDownload}
            >
              {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete generation"
              title="Delete"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              disabled={isDeleting || confirmDelete}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {confirmDelete ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-3 text-sm text-destructive">
          Delete this generation permanently? The generated output will be
          removed, but the original media in your library will be kept.
        </p>
      ) : !data && isPending ? (
        <div className="space-y-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-8 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            Couldn&apos;t load this generation.
          </p>
          <p className="text-xs text-muted-foreground">
            It may have been deleted or is no longer available.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg bg-muted">
            {data.output?.url ? (
              isVideo ? (
                <video
                  src={data.output.url}
                  preload="metadata"
                  playsInline
                  controls
                  className="max-h-80 w-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.output.url}
                  alt={data.output.name}
                  className="max-h-80 w-full object-contain"
                />
              )
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 text-muted-foreground">
                {isBusy ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <AlertCircle className="size-6" />
                )}
                <span className="px-4 text-center text-xs">
                  {data.status === "FAILED"
                    ? (data.failure_reason ?? "Generation failed")
                    : isBusy
                      ? STATUS_LABELS[data.status]
                      : "No output available"}
                </span>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={STATUS_VARIANTS[data.status]}>
                  {STATUS_LABELS[data.status]}
                </Badge>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd className="flex items-center gap-1.5 font-medium capitalize">
                {isVideo ? <Film className="size-4" /> : <ImageIcon className="size-4" />}
                {isVideo ? "Video" : "Image"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Blur method</dt>
              <dd className="font-medium capitalize">{data.blur_type}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Credits used</dt>
              <dd className="inline-flex items-center gap-1 font-medium">
                <Coins className="size-3.5 text-muted-foreground" />
                {data.credits_consumed ?? 0}
              </dd>
            </div>
            {data.time_take != null && (
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Time taken</dt>
                <dd className="inline-flex items-center gap-1 font-medium">
                  <Clock3 className="size-3.5 text-muted-foreground" />
                  {formatDuration(data.time_take)}
                </dd>
              </div>
            )}
            {isVideo && data.timestamps.length > 0 && (
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Blur segments</dt>
                <dd className="font-medium">{data.timestamps.length}</dd>
              </div>
            )}
          </dl>

          {data.status === "FAILED" && data.failure_reason && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {data.failure_reason}
            </p>
          )}
        </div>
      )}

      <AlertDialogFooter>
        {confirmDelete ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? <Loader2 className="animate-spin" /> : "Delete"}
            </Button>
          </>
        ) : (
          <AlertDialogAction onClick={onClose}>Close</AlertDialogAction>
        )}
      </AlertDialogFooter>
    </>
  )
}
