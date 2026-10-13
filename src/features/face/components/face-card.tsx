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
      className="group relative aspect-square min-w-0 overflow-hidden rounded-2xl bg-muted transition-opacity data-[pending=true]:opacity-60"
      data-pending={isPending}
    >
      {/* Full-bleed media: cropped so faces fill the tile and the grid stays even */}
      {isVideo ? (
        <video
          src={face.url}
          preload="metadata"
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={face.url}
          alt={face.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Name overlaid at the bottom, on a soft gradient for legibility */}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pt-12 pb-3.5">
        <span
          className="block truncate text-lg font-medium text-white drop-shadow-sm"
          title={face.name}
        >
          {face.name}
        </span>
      </figcaption>

      {/* Delete button: top-left, replaces the old icon */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Delete ${face.name}`}
              className="absolute top-3 left-3 size-8 rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-destructive hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            />
          }
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
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
    </figure>
  )
}