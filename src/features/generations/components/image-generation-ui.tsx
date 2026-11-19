"use client"

import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import type { BlurMethod } from "@blurfield/js"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useFileUpload } from "@/features/face/hooks"
import { BlurMethodSelect } from "@/features/generations/components/blur-method-select"
import ChangeFileButton from "@/features/generations/components/change-file-button"
import { FaceSelector } from "@/features/generations/components/face-selector"
import { useGenerateImage } from "@/features/generations/hooks"

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

type ImageGenerationUIProps = {
  file: File
  previewUrl: string | null
  clearFile: () => void
  onDone: () => void
}

export function ImageGenerationUI({
  file,
  previewUrl,
  clearFile,
  onDone,
}: ImageGenerationUIProps) {
  // Same two-step upload as the face dialog: presign → XHR → progress / abort /
  // orphan cleanup. Runs on submit — the returned `media.id` is used below.
  const { upload, abort, progress, status, error, isBusy } = useFileUpload()
  const { mutateAsync: createGeneration, isPending: isGenerating } = useGenerateImage()

  const [blurMethod, setBlurMethod] = useState<BlurMethod>("blackout")
  const [faceId, setFaceId] = useState<string | null>(null)
  const [mediaId, setMediaId] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const busy = isBusy || isGenerating

  const handleCancel = () => {
    abort()
    clearFile()
    onDone()
  }

  const handleSubmit = async () => {
    if (busy) return
    setSubmitError(null)
    try {
      // 1. Upload the bytes, then use the returned media id.
      const data = await upload(file)
      if (!data) return // cancelled
      const id = (data.media as { id: string }).id
      setMediaId(id)

      // 2. Create the generation record (server logs the ids for now).
      const generation = await createGeneration({
        media_id: id,
        face_id: faceId,
        blur_id: blurMethod,
      })
      setGenerationId(generation.generation_id)
    } catch (err) {
      // Upload errors are surfaced by the hook; show generation errors here.
      if (!error) {
        setSubmitError(err instanceof Error ? err.message : "Couldn't create the generation.")
      }
    }
  }

  const statusText =
    status === "presigning"
      ? "Preparing upload…"
      : status === "uploading"
        ? `Uploading · ${progress}%`
        : status === "success"
          ? "Upload complete"
          : status === "error"
            ? "Upload failed"
            : `${formatBytes(file.size)} · ${file.type || "file"}`

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
      {/* Preview */}
      <section className="relative flex min-h-[45vh] w-full flex-col bg-black md:min-h-0 md:flex-1">
        {/* Progress bar */}
        {(status === "presigning" || status === "uploading" || status === "success") && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={status === "presigning" ? undefined : progress}
            className="absolute inset-x-0 top-0 z-20 h-1 bg-white/10"
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

        {/* File bar — ChangeFileButton stays on top */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 md:p-4">
          <div className="min-w-0 pt-1">
            <p className="truncate text-sm font-medium text-white">{file.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
              {status === "presigning" && <Loader2 className="size-3 shrink-0 animate-spin" />}
              {status === "uploading" && <Loader2 className="size-3 shrink-0 animate-spin" />}
              {status === "success" && <Check className="size-3 shrink-0 text-primary" />}
              {statusText}
            </p>
          </div>
          <ChangeFileButton />
        </div>

        {/* Image preview */}
        <div className="flex flex-1 items-center justify-center p-4 pt-20 md:p-8 md:pt-24">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected upload"
              className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            />
          )}
        </div>

        {/* Inline error on the preview */}
        {status === "error" && (
          <div className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-destructive/30 bg-destructive/10 p-3 backdrop-blur md:inset-x-4 md:bottom-4">
            <p className="text-sm font-medium text-destructive">Couldn&apos;t upload</p>
            <p
              className="whitespace-pre-wrap text-xs text-destructive/80"
              style={{ overflowWrap: "anywhere" }}
            >
              {error ?? "Upload failed. Please try again."}
            </p>
          </div>
        )}
      </section>

      {/* Controls */}
      <aside className="w-full shrink-0 space-y-6 border-t bg-sidebar p-4 md:w-[340px] md:overflow-y-auto md:border-l md:border-t-0 md:p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Blur method</h2>
            {status === "success" && <Check className="size-4 text-primary" />}
          </div>
          <BlurMethodSelect value={blurMethod} onChange={setBlurMethod} disabled={busy} />
          <p className="text-xs text-muted-foreground">
            Choose how detected faces are obscured.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Faces to keep unblurred</h2>
          <FaceSelector value={faceId} onChange={setFaceId} disabled={busy} />
          <p className="text-xs text-muted-foreground">
            Optional. Selected faces are excluded from blurring.
          </p>
        </div>

        {status === "error" && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleSubmit}>
              Try again
            </Button>
            <Button type="button" variant="ghost" className="flex-1" onClick={handleCancel}>
              Remove file
            </Button>
          </div>
        )}

        {status === "uploading" && (
          <Button type="button" variant="outline" className="w-full" onClick={handleCancel}>
            <X />
            Cancel upload
          </Button>
        )}

        <div className="space-y-2 border-t pt-4">
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={busy}
            onClick={handleSubmit}
          >
            {busy && <Loader2 className="animate-spin" />}
            {isGenerating
              ? "Creating…"
              : status === "presigning"
                ? "Preparing…"
                : status === "uploading"
                  ? `Uploading · ${progress}%`
                  : "Submit"}
          </Button>

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          {status === "success" && mediaId && (
            <p className="truncate text-center font-mono text-[11px] text-muted-foreground">
              media: {mediaId}
            </p>
          )}
          {generationId && (
            <p className="truncate text-center font-mono text-[11px] text-muted-foreground">
              generation: {generationId}
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
