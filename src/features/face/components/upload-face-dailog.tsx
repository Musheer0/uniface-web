"use client"

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react"
import { isValidElement } from "react"
import { Check, Loader2, UploadCloud, XIcon } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DOWNLOAD_URL_EXPIRES_IN, MAX_PHOTO_LIMIT } from "@/lib/constants"
import { uploadViaXHR } from "@/lib/upload-xhr"
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

  const fileStatusText =
    status === "uploading"
      ? `Uploading · ${progress}%`
      : status === "presigning"
        ? "Preparing upload…"
        : status === "success"
          ? "Upload complete"
          : file
            ? `${formatBytes(file.size)} · ${file.type || "image"}`
            : ""

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isValidElement(children) ? (
        <DialogTrigger render={children} />
      ) : (
        <DialogTrigger>{children}</DialogTrigger>
      )}

      <DialogContent
        showCloseButton={false}
        className="flex shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.12)] max-w-none flex-col gap-3 overflow-hidden rounded-3xl bg-card p-5 sm:max-w-none"
        style={{
          width: "min(520px, calc(100vw - 32px))",
          maxWidth: "100%",
          maxHeight: "calc(100dvh - 32px)",
        }}
      >
        {/* Title + close */}
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-3">
          <DialogTitle className="text-lg font-semibold">Add a face</DialogTitle>
          <DialogDescription className="sr-only">
            Give it a name, pick a photo, then upload.
          </DialogDescription>
          <button
            type="button"
            aria-label="Close"
            onClick={() => handleOpenChange(false)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent"
          >
            <XIcon className="size-5" />
          </button>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
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

          {/* Name panel */}
          <div className="flex h-44 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-muted/50 px-5 transition-shadow focus-within:ring-2 focus-within:ring-ring/40">
            <Label htmlFor="face-name" className="text-sm font-normal text-muted-foreground">
              Name
            </Label>
            <Input
              id="face-name"
              placeholder="Enter name"
              value={name}
              disabled={isBusy}
              onChange={(e) => setName(e.target.value)}
              className="h-auto w-full min-w-0 rounded-none border-0 bg-transparent px-0 py-1 text-center text-3xl font-semibold shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 disabled:bg-transparent md:text-3xl dark:bg-transparent dark:disabled:bg-transparent"
            />
          </div>

          {/* Photo row */}
          <div
            onDragOver={(e) => {
              if (isBusy || file) return
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              if (isBusy || file) return
              handleDrop(e)
            }}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-2xl bg-muted/50 transition-shadow",
              dragOver && "ring-2 ring-primary",
            )}
          >
            <div className="flex min-h-16 items-center gap-3 px-5 py-3">
              {previewUrl && file && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="size-10 shrink-0 rounded-lg border object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                {file ? (
                  <>
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{fileStatusText}</p>
                  </>
                ) : (
                  <p className="text-base font-medium">
                    {dragOver ? "Drop image to upload" : "Add a photo"}
                  </p>
                )}
              </div>

              {!file && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 shrink-0 rounded-lg px-3.5"
                >
                  <UploadCloud />
                  Upload
                </Button>
              )}

              {file && status === "presigning" && (
                <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
              )}
              {file && status === "success" && (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}
              {file && status !== "presigning" && status !== "success" && (
                <button
                  type="button"
                  aria-label={status === "uploading" ? "Cancel upload" : "Remove file"}
                  onClick={status === "uploading" ? () => xhrRef.current?.abort() : clearFile}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>

            {(status === "presigning" || status === "uploading" || status === "success") && (
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={status === "presigning" ? undefined : progress}
                className="absolute inset-x-0 bottom-0 h-1 bg-foreground/10"
              >
                <div
                  className={cn(
                    "h-full bg-primary transition-[width]",
                    status === "presigning" && "w-1/4 animate-pulse",
                  )}
                  style={status === "presigning" ? undefined : { width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Helper text, or the error in the same spot */}
          <div className="min-w-0 shrink-0 px-1" aria-live="polite">
            {error ? (
              <div role="alert">
                <p className="text-sm font-medium text-destructive">Couldn&apos;t upload</p>
                <p
                  className="text-sm whitespace-pre-wrap text-destructive/80"
                  style={{ overflowWrap: "anywhere" }}
                >
                  {error}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium">Use a clear photo</p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, GIF or WEBP, up to {formatBytes(MAX_PHOTO_LIMIT)}. Drag a file onto the photo row or use Upload.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            className="h-11 rounded-xl px-5"
            onClick={() => (status === "success" ? (reset(), setOpen(false)) : setOpen(false))}
          >
            Cancel
          </Button>
          {status === "uploading" ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-5"
              onClick={() => xhrRef.current?.abort()}
            >
              Cancel upload
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={handleUpload}
              className="h-11 rounded-xl px-6 font-semibold"
            >
              {isBusy && <Loader2 className="animate-spin" />}
              {status === "success" ? "Uploaded" : "Upload"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}