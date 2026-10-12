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
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useDeleteFace } from "../hooks/use-upload-face"
import type { FaceDTO } from "../hooks/use-faces"

function formatBytes(bytes: number | null) {
  if (bytes == null) return null
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export const FaceCard = ({ face }: { face: FaceDTO }) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { mutate, isPending } = useDeleteFace()
  const isVideo = face.mimeType?.startsWith("video/") ?? false
  const size = formatBytes(face.size)

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-black">
        {isVideo ? (
          <video
            src={face.url}
            preload="metadata"
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={face.url}
            alt={face.name}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        )}
      </div>
      <CardContent className="min-w-0 pt-3">
        <p className="truncate text-sm font-medium">{face.name}</p>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
          {face.mimeType && (
            <Badge variant="secondary" className="max-w-full truncate">
              {face.mimeType.split("/")[1] ?? face.mimeType}
            </Badge>
          )}
          {size && <span className="text-xs text-muted-foreground">{size}</span>}
        </div>
      </CardContent>
      <CardFooter className="justify-end pt-0">
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Delete ${face.name}`}
                className="text-destructive hover:text-destructive"
              />
            }
            disabled={isPending}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Delete
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
                {isPending && <Loader2 className="animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
