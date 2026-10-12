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
import { Button } from "@/components/ui/button"
import { useDeleteFace } from "../hooks/use-upload-face"
import type { FaceDTO } from "../hooks/use-faces"

export const FaceCard = ({ face }: { face: FaceDTO }) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { mutate, isPending } = useDeleteFace()
  const isVideo = face.mimeType?.startsWith("video/") ?? false

  return (
    <figure
      className="group min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/25 data-[pending=true]:opacity-60"
      data-pending={isPending}
    >
      {/* Media: cropped square so faces fill the tile and the grid stays even */}
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {isVideo ? (
          <video
            src={face.url}
            preload="metadata"
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={face.url}
            alt={face.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Name + delete share one row */}
      <figcaption className="flex items-center justify-between gap-2 py-1.5 pr-1.5 pl-3">
        <span className="truncate text-sm font-medium" title={face.name}>
          {face.name}
        </span>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${face.name}`}
                className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              />
            }
            disabled={isPending}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this face?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{face.name}&rdquo; and its file will be permanently deleted. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  mutate({ faceId: face.id })
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