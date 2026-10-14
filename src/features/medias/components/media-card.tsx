"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
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
import { useDeleteMedia, type MediaDTO } from "../hooks"

function formatBytes(bytes: number | null) {
  if (bytes == null) return null
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export const MediaCard = ({ item }: { item: MediaDTO }) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { mutate, isPending } = useDeleteMedia()
  const isVideo = item.type?.startsWith("video/") ?? false
  const size = formatBytes(item.size)

  return (
    <figure
      className="group min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/25 data-[pending=true]:opacity-60"
      data-pending={isPending}
    >
      {/* Media: cropped square so the grid stays even */}
      <div className="aspect-square w-full overflow-hidden bg-muted relative">
        {item.uploaded_type &&
          <Badge variant="secondary" className="max-w-full absolute top-2 left-2 truncate">
            {item.uploaded_type}
          </Badge>
        }
        {isVideo ? (
          <video
            src={item.url}
            preload="metadata"
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <figcaption className="flex items-center justify-between gap-2 py-1.5 pr-1.5 pl-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium" title={item.name}>
            {item.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            {item.type && (
              <Badge variant="secondary" className="max-w-full truncate">
                {item.type.split("/")[1] ?? item.type}
              </Badge>
            )}
           
            {size && <span className="shrink-0 text-xs text-muted-foreground">{size}</span>}
          </span>
        </span>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${item.name}`}
                className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              />
            }
            disabled={isPending}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this file?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{item.name}&rdquo; and any faces using it will be permanently
                deleted. This action cannot be undone.
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
      </figcaption>
    </figure>
  )
}
