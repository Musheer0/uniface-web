"use client"

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react"
import { isValidElement } from "react"
import { ImagePlus, Loader2, UploadCloud } from "lucide-react"
import { XIcon } from "lucide-react"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DOWNLOAD_URL_EXPIRES_IN, MAX_PHOTO_LIMIT } from "@/lib/constants"
import { useTRPC } from "@/trpc/client"
import type { FaceDTO } from "../hooks/use-faces"
import { useDeleteFace, useUploadFace } from "../hooks/use-upload-face"

type UploadStatus = "idle" | "presigning" | "uploading" | "success" | "error"

type UploadFaceDialogProps = {
  children: React.ReactNode
  onUploaded?: (face: { id: string; name: string }) => void
}

const ACCEPT = "image/*"

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/** POST a file to an S3 presigned-POST URL with XHR so we get upload progress. */
function uploadViaXHR(
  url: string,
  fields: Record<string, string>,
  file: File,
  onProgress: (pct: number) => void,
  signalRef: { current: XMLHttpRequest | null },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    signalRef.current = xhr
    xhr.open("POST", url)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      // S3 returns 200 | 201 | 204 on success depending on config
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.onabort = () => reject(new Error("Upload cancelled"))

    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value)
    }
    // S3 requires `file` to be the last field
    form.append("file", file)
    xhr.send(form)
  })
}

export const UploadFaceDialog = ({ children, onUploaded }: UploadFaceDialogProps) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { mutateAsync, isPending: isPresigning } = useUploadFace()
  const { mutateAsync: deleteFaceAsync } = useDeleteFace()

  const isBusy = status === "presigning" || status === "uploading" || isPresigning

  const revokePreview = useCallback((url: string | null) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url)
  }, [])

  useEffect(() => {
    return () => revokePreview(previewUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reset = useCallback(() => {
    xhrRef.current?.abort()
    xhrRef.current = null
    revokePreview(previewUrl)
    setName("")
    setFile(null)
    setPreviewUrl(null)
    setProgress(0)
    setStatus("idle")
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, revokePreview])

  const handleOpenChange = (next: boolean) => {
    // Abort an in-flight upload when the dialog is dismissed
    if (!next && (status === "uploading" || status === "presigning")) {
      xhrRef.current?.abort()
    }
    if (!next && status === "success") reset()
    setOpen(next)
  }

  const pickFile = useCallback(
    (next: File | null) => {
      if (!next) return
      setError(null)

      if (!next.type.startsWith("image/")) {
        setError("Only image files are supported.")
        return
      }
      if (next.size > MAX_PHOTO_LIMIT) {
        setError(`File is too large. Max ${formatBytes(MAX_PHOTO_LIMIT)}.`)
        return
      }

      revokePreview(previewUrl)
      setFile(next)
      setPreviewUrl(URL.createObjectURL(next))
      setProgress(0)
      setStatus("idle")
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [previewUrl, revokePreview],
  )

  const clearFile = () => {
    revokePreview(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setProgress(0)
    setStatus((s) => (s === "uploading" || s === "presigning" ? s : "idle"))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    pickFile(e.dataTransfer.files?.[0] ?? null)
  }

  const handleUpload = async () => {
    if (!file || name.trim().length === 0 || isBusy) return
    setError(null)
    setStatus("presigning")
    setProgress(0)

    let createdFaceId: string | undefined
    let createdMediaId: string | undefined
    try {
      // 1. Create DB rows + get a presigned POST
      const data = await mutateAsync({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        name: name.trim(),
      })
      const { face, upload_data } = data
      createdFaceId = (face as { id?: string }).id
      createdMediaId = (face as { media_id?: string }).media_id

      // 2. Upload bytes straight to S3 with XHR for progress events
      setStatus("uploading")
      await uploadViaXHR(upload_data.url, upload_data.fields, file, setProgress, xhrRef)

      setStatus("success")
      // Seed the new face straight into the faces cache — no refetch.
      // The local blob preview renders instantly; the next fetch swaps in the server URL.
      const uploaded = face as { id: string; name: string; user_id: string; media_id: string }
      const entry: FaceDTO = {
        ...uploaded,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        url: previewUrl ?? "",
        urlExpiresIn: DOWNLOAD_URL_EXPIRES_IN,
      }
      queryClient.setQueryData<FaceDTO[]>(trpc.face.getAll.queryKey(), (old) => [
        entry,
        ...(old ?? []).filter((f) => f.id !== entry.id),
      ])
      queryClient.setQueryData<FaceDTO>(trpc.face.getById.queryKey({ id: entry.id }), entry)
      onUploaded?.(face as { id: string; name: string })
      // Close (and reset) shortly after success so the user sees 100%
      setTimeout(() => {
        setOpen(false)
        reset()
      }, 600)
    } catch (err) {
      if (err instanceof Error && err.message === "Upload cancelled") return
      // The S3 bytes never landed — remove the orphan face/media rows.
      if (createdFaceId || createdMediaId) {
        try {
          await deleteFaceAsync({ faceId: createdFaceId, mediaId: createdMediaId })
        } catch {
          // Cleanup is best-effort; surface the original upload error below.
        }
      }
      setStatus("error")
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.")
    }
  }

  const canSubmit = file !== null && name.trim().length > 0 && !isBusy && status !== "success"

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
          width: "min(560px, calc(100vw - 32px))",
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
          <DialogTitle>Add a face</DialogTitle>
          <DialogDescription>
            Give it a name, pick a photo, then upload.
          </DialogDescription>
        </DialogHeader>

        <div
          className="grid min-h-0 w-full min-w-0 max-w-full flex-1 gap-4 overflow-x-hidden overflow-y-auto"
          style={{ boxSizing: "border-box" }}
        >
          <div className="grid min-w-0 max-w-full gap-1.5" style={{ boxSizing: "border-box" }}>
            <Label htmlFor="face-name">Name</Label>
            <Input
              id="face-name"
              placeholder="e.g. Ada"
              value={name}
              disabled={isBusy}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-w-0 max-w-full"
            />
          </div>

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
              <div
                className="min-w-0 max-w-full"
                style={{ boxSizing: "border-box" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="max-h-56 w-full min-w-0 max-w-full rounded-xl border object-contain sm:max-h-64"
                />
                <Attachment
                  state={status === "uploading" || status === "presigning" ? "uploading" : "done"}
                  className="mt-2 w-full min-w-0 max-w-full"
                >
                  <AttachmentMedia variant="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="" />
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
                            : `${formatBytes(file.size)} · ${file.type || "image"}`}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    {status === "uploading" ? (
                      <AttachmentAction
                        aria-label="Cancel upload"
                        onClick={() => xhrRef.current?.abort()}
                      >
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
                  {dragOver ? <UploadCloud /> : <ImagePlus />}
                </span>
                <span className="min-w-0 max-w-full text-sm font-medium">
                  {dragOver ? "Drop the file to preview it" : "Click to choose, or drag & drop"}
                </span>
                <span className="min-w-0 max-w-full text-xs text-muted-foreground">
                  Images up to {formatBytes(MAX_PHOTO_LIMIT)}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => xhrRef.current?.abort()}
            >
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
