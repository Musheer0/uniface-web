"use client"

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react"
import { isValidElement } from "react"
import { FileUp, Loader2, UploadCloud, XIcon } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MAX_PHOTO_LIMIT, MAX_VIDEO_LIMIT } from "@/lib/constants"
import { useTRPC } from "@/trpc/client"
import { useFileUpload } from "@/features/face/hooks/use-file-upload"

type UploadMediaDialogProps = {
  children: React.ReactNode
  onUploaded?: (media: { id: string; name: string }) => void
}

const ACCEPT = "image/*,video/*"

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function maxSizeFor(file: File) {
  return file.type.startsWith("image") ? MAX_PHOTO_LIMIT : MAX_VIDEO_LIMIT
}

export const UploadMediaDialog = ({ children, onUploaded }: UploadMediaDialogProps) => {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { upload, abort, reset: resetUpload, progress, status, error: uploadError, isBusy } =
    useFileUpload()

  const isVideo = file?.type.startsWith("video/") ?? false
  const error = localError ?? uploadError

  const revokePreview = useCallback((url: string | null) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url)
  }, [])

  useEffect(() => {
    return () => revokePreview(previewUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reset = useCallback(() => {
    abort()
    resetUpload()
    revokePreview(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setLocalError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, revokePreview, abort, resetUpload])

  const handleOpenChange = (next: boolean) => {
    if (!next && isBusy) abort()
    if (!next && status === "success") reset()
    setOpen(next)
  }

  const pickFile = useCallback(
    (next: File | null) => {
      if (!next || isBusy) return
      setLocalError(null)

      if (!next.type.startsWith("image/") && !next.type.startsWith("video/")) {
        setLocalError("Only image or video files are supported.")
        return
      }
      const limit = maxSizeFor(next)
      if (next.size > limit) {
        setLocalError(`File is too large. Max ${formatBytes(limit)}.`)
        return
      }

      revokePreview(previewUrl)
      resetUpload()
      setFile(next)
      setPreviewUrl(URL.createObjectURL(next))
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [previewUrl, revokePreview, resetUpload, isBusy],
  )

  const clearFile = () => {
    revokePreview(previewUrl)
    resetUpload()
    setFile(null)
    setPreviewUrl(null)
    setLocalError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    pickFile(e.dataTransfer.files?.[0] ?? null)
  }

  const handleUpload = async () => {
    if (!file || isBusy) return
    setLocalError(null)
    try {
      const data = await upload(file)
      if (!data) return // cancelled
      // Refresh the media list — the new row is in the DB now.
      queryClient.invalidateQueries(trpc.media.getAll.queryFilter())
      onUploaded?.(data.media as { id: string; name: string })
      setTimeout(() => {
        setOpen(false)
        reset()
      }, 600)
    } catch {
      // `upload` already surfaced the error via its own state.
    }
  }

  const canSubmit = file !== null && !isBusy && status !== "success"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isValidElement(children) ? (
        <DialogTrigger render={children} />
      ) : (
        <DialogTrigger>{children}</DialogTrigger>
      )}

      <DialogContent
        className="flex max-w-none flex-col overflow-hidden sm:max-w-none"
        style={{
          width: "min(520px, calc(100vw - 32px))",
          maxWidth: "100%",
          maxHeight: "calc(100dvh - 32px)",
          minWidth: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogHeader
          className="min-w-0 max-w-full shrink-0 pr-8"
          style={{ boxSizing: "border-box" }}
        >
          <DialogTitle>Upload media</DialogTitle>
          <DialogDescription>
            Pick a photo or video, then upload it to your library.
          </DialogDescription>
        </DialogHeader>

        <div
          className="grid min-h-0 w-full min-w-0 max-w-full flex-1 gap-4 overflow-x-hidden overflow-y-auto"
          style={{ boxSizing: "border-box" }}
        >
          <div className="grid min-w-0 max-w-full gap-1.5" style={{ boxSizing: "border-box" }}>
            <Label>File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              disabled={isBusy}
              onChange={(e) => {
                pickFile(e.target.files?.[0] ?? null)
                e.target.value = ""
              }}
            />

            {previewUrl && file ? (
              <div className="min-w-0 max-w-full" style={{ boxSizing: "border-box" }}>
                {isVideo ? (
                  <video
                    src={previewUrl}
                    controls
                    muted
                    playsInline
                    className="max-h-56 w-full min-w-0 max-w-full rounded-xl border bg-black object-contain sm:max-h-64"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="max-h-56 w-full min-w-0 max-w-full rounded-xl border object-contain sm:max-h-64"
                  />
                )}
                <Attachment
                  state={status === "uploading" || status === "presigning" ? "uploading" : "done"}
                  className="mt-2 w-full min-w-0 max-w-full"
                >
                  <AttachmentMedia variant="icon">
                    <FileUp />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{file.name}</AttachmentTitle>
                    <AttachmentDescription>
                      {status === "uploading"
                        ? `Uploading · ${progress}%`
                        : status === "presigning"
                          ? "Preparing upload…"
                          : status === "success"
                            ? "Upload complete"
                            : `${formatBytes(file.size)} · ${file.type || "unknown type"}`}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    {status === "uploading" ? (
                      <AttachmentAction aria-label="Cancel upload" onClick={abort}>
                        <XIcon />
                      </AttachmentAction>
                    ) : (
                      <AttachmentAction
                        aria-label="Remove file"
                        disabled={isBusy}
                        onClick={clearFile}
                      >
                        <XIcon />
                      </AttachmentAction>
                    )}
                  </AttachmentActions>
                </Attachment>
              </div>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex w-full min-w-0 max-w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
                  "hover:border-ring hover:bg-muted/40",
                  dragOver ? "border-ring bg-muted/40" : "border-input",
                  isBusy && "pointer-events-none opacity-60",
                )}
                style={{ boxSizing: "border-box" }}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <UploadCloud />
                </span>
                <span className="min-w-0 max-w-full text-sm font-medium">
                  {dragOver ? "Drop the file to preview it" : "Click to choose, or drag & drop"}
                </span>
                <span className="min-w-0 max-w-full text-xs text-muted-foreground">
                  Images up to {formatBytes(MAX_PHOTO_LIMIT)} · videos up to{" "}
                  {formatBytes(MAX_VIDEO_LIMIT)}
                </span>
              </button>
            )}
          </div>

          {(status === "presigning" || status === "uploading" || status === "success") && (
            <div
              className="grid min-w-0 max-w-full gap-1.5"
              aria-live="polite"
              style={{ boxSizing: "border-box" }}
            >
              <div className="flex min-w-0 max-w-full items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">
                  {status === "presigning"
                    ? "Preparing upload…"
                    : status === "success"
                      ? "Upload complete"
                      : `Uploading… ${progress}%`}
                </span>
                <span className="shrink-0">{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={status === "presigning" ? undefined : progress}
                className="h-2 w-full min-w-0 max-w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    status === "presigning" ? "w-1/4 animate-pulse bg-primary/70" : "bg-primary",
                  )}
                  style={status === "presigning" ? undefined : { width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="min-w-0 max-w-full overflow-x-hidden rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2"
              style={{ boxSizing: "border-box" }}
            >
              <p
                className="text-sm break-words whitespace-pre-wrap text-destructive"
                style={{ overflowWrap: "anywhere" }}
              >
                {error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="min-w-0 max-w-full shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => (status === "success" ? (reset(), setOpen(false)) : setOpen(false))}
          >
            Cancel
          </Button>
          {status === "uploading" ? (
            <Button type="button" variant="outline" onClick={abort}>
              Cancel upload
            </Button>
          ) : (
            <Button type="button" disabled={!canSubmit} onClick={handleUpload}>
              {isBusy && <Loader2 className="animate-spin" />}
              {status === "success" ? "Uploaded" : "Upload"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
