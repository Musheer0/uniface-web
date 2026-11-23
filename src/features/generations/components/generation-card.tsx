"use client"

import { useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Clock3,
  Coins,
  Film,
  ImageIcon,
  Loader2,
  Maximize2,
  Trash2,
} from "lucide-react"
import { cn } from "cn"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDeleteGeneration, type GenerationDTO } from "../hooks"
import {
  formatDuration,
  STATUS_LABELS,
  STATUS_VARIANTS,
} from "../lib/generation-format"

export const GenerationCard = ({
  item,
  onSelect,
}: {
  item: GenerationDTO
  onSelect?: (id: string) => void
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()
  const { mutate, isPending } = useDeleteGeneration()

  const isVideo = item.output?.type?.startsWith("video/") ?? item.is_video
  const isBusy = item.status === "PENDING" || item.status === "STARTED"
  const statusLabel = STATUS_LABELS[item.status]
  // Running generations get their own status page instead of the details dialog.
  const showStatusPage = item.status === "STARTED"

  const openDetails = () => {
    if (showStatusPage) {
      router.push(`/generations/status/${item.id}`)
      return
    }
    onSelect?.(item.id)
  }

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    // Leave the delete action and the video controls interactive.
    if ((event.target as HTMLElement).closest("button, a, video")) return
    openDetails()
  }

  return (
    <figure
      className={cn(
        "group min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/25 data-[pending=true]:opacity-60",
        onSelect && "cursor-pointer",
      )}
      data-pending={isPending}
      onClick={onSelect ? handleCardClick : undefined}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {item.output?.url ? (
          isVideo ? (
            <video
              src={item.output.url}
              preload="metadata"
              playsInline
              muted
              controls
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.output.url}
              alt={item.output.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
            {isBusy ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <AlertCircle className="size-6" />
            )}
            <span className="line-clamp-3 text-xs">
              {item.status === "FAILED"
                ? item.failure_reason ?? "Generation failed"
                : isBusy
                  ? statusLabel
                  : "No output available"}
            </span>
          </div>
        )}

        <Badge
          variant={STATUS_VARIANTS[item.status]}
          className="absolute top-2 left-2 max-w-[calc(100%-4rem)] bg-background/90 backdrop-blur-sm"
        >
          {statusLabel}
        </Badge>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Delete generation"
                className="absolute top-2 right-2 size-8 rounded-full bg-background/90 text-muted-foreground backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
              />
            }
            disabled={isPending}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this generation?</AlertDialogTitle>
              <AlertDialogDescription>
                The generated output will be permanently deleted. The original
                media in your library will be kept. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  mutate({ id: item.id })
                  setConfirmOpen(false)
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <figcaption className="flex items-start justify-between gap-2 py-1.5 pr-1.5 pl-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="block truncate text-sm font-medium capitalize">
              {item.blur_type} blur
            </span>
            <Badge variant="secondary" className="gap-1">
              {isVideo ? <Film /> : <ImageIcon />}
              {isVideo ? "Video" : "Image"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.time_take != null && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" />
                {formatDuration(item.time_take)}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Coins className="size-3" />
              {item.credits_consumed ?? 0} credits
            </span>
          </div>
          {item.status === "FAILED" && item.failure_reason && (
            <p
              className="line-clamp-2 text-xs text-destructive"
              title={item.failure_reason}
            >
              {item.failure_reason}
            </p>
          )}
        </div>
        {onSelect && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              showStatusPage ? "View generation status" : "View generation details"
            }
            className="size-8 shrink-0 text-muted-foreground"
            onClick={openDetails}
          >
            <Maximize2 />
          </Button>
        )}
      </figcaption>
    </figure>
  )
}
