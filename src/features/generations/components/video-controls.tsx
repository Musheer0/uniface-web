"use client"

import { Loader2, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { FileUploadStatus } from "@/features/face/hooks"
import { BlurMethodSelect } from "@/features/generations/components/blur-method-select"
import { FaceSelector } from "@/features/generations/components/face-selector"
import { useVideoGenerationStore } from "@/features/generations/hooks/use-video-generation-store"
import type { VideoTimeline } from "@/features/generations/hooks/use-video-timeline"
import { formatTime } from "@/features/generations/lib/video-timeline"

type VideoControlsProps = {
  timeline: VideoTimeline
  status: FileUploadStatus
  progress: number
  isBusy: boolean
  onSubmit: () => void
  onCancel: () => void
}

export function VideoControls({
  timeline,
  status,
  progress,
  isBusy,
  onSubmit,
  onCancel,
}: VideoControlsProps) {
  const activeLayer = timeline.activeLayer
  const faceId = useVideoGenerationStore((state) => state.faceId)
  const setFaceId = useVideoGenerationStore((state) => state.setFaceId)
  const blurMethod = useVideoGenerationStore((state) => state.blurMethod)
  const setBlurMethod = useVideoGenerationStore((state) => state.setBlurMethod)
  const mediaId = useVideoGenerationStore((state) => state.mediaId)

  return (
    <aside className="w-full shrink-0 space-y-6 border-t bg-sidebar p-4 md:w-[340px] md:overflow-y-auto md:border-l md:border-t-0 md:p-5">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Blur method</h2>
        <BlurMethodSelect
          value={blurMethod}
          onChange={setBlurMethod}
          disabled={isBusy}
        />
        <p className="text-xs text-muted-foreground">
          Applied to every blur segment in the video.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Active layer</h2>
        {activeLayer ? (
          <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {formatTime(activeLayer.start)} – {formatTime(activeLayer.end)}
              </span>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              onClick={() => timeline.deleteLayer(activeLayer.id)}
            >
              <Trash2 className="size-4" />
              Delete layer
            </Button>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            Click a timeline layer to select it.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Faces to keep unblurred</h2>
        <FaceSelector value={faceId} onChange={setFaceId} disabled={isBusy} />
        <p className="text-xs text-muted-foreground">
          Optional. Selected faces are excluded from blurring.
        </p>
      </div>

      {status === "error" && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onSubmit}>
            Try again
          </Button>
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
            Remove file
          </Button>
        </div>
      )}

      {status === "uploading" && (
        <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
          <X />
          Cancel upload
        </Button>
      )}

      <div className="space-y-2 border-t pt-4">
        <Button
          type="button"
          size="lg"
          className="w-full font-semibold"
          disabled={isBusy || timeline.layers.length === 0}
          onClick={onSubmit}
        >
          {isBusy && <Loader2 className="animate-spin" />}
          {status === "presigning"
            ? "Preparing…"
            : status === "uploading"
              ? `Uploading · ${progress}%`
              : "Submit"}
        </Button>
        {status === "success" && mediaId && (
          <p className="truncate text-center font-mono text-[11px] text-muted-foreground">
            media: {mediaId}
          </p>
        )}
      </div>
    </aside>
  )
}
