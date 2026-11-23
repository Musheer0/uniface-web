"use client"

import type { RefObject } from "react"
import { Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { FileUploadStatus } from "@/features/face/hooks"
import ChangeFileButton from "@/features/generations/components/change-file-button"
import { useFileStore } from "@/features/generations/hooks/use-video-generation-store"
import type { VideoTimeline } from "@/features/generations/hooks/use-video-timeline"

type VideoPreviewProps = {
  focused?: boolean
  status: FileUploadStatus
  progress: number
  statusText: string
  videoRef: RefObject<HTMLVideoElement | null>
  timeline: VideoTimeline
}

export function VideoPreview({
  focused = false,
  status,
  progress,
  statusText,
  videoRef,
  timeline,
}: VideoPreviewProps) {
  const file = useFileStore((state) => state.file)
  const previewUrl = useFileStore((state) => state.previewUrl)

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 items-center justify-center transition-all duration-700 ease-out",
        focused ? "p-0" : "px-0! p-4 md:p-8",
      )}
    >
      {previewUrl && (
        <video
          ref={videoRef}
          src={previewUrl}
          playsInline
          onClick={timeline.togglePlay}
          onLoadedMetadata={timeline.handleLoadedMetadata}
          onTimeUpdate={timeline.handleTimeUpdate}
          onPlay={timeline.handlePlay}
          onPause={timeline.handlePause}
          onSeeked={timeline.handleTimeUpdate}
          onEnded={timeline.handleEnded}
          className={cn(
            "max-h-full aspect-video max-w-full cursor-pointer rounded-xl transition-all duration-700 ease-out",
            focused && "scale-[1.04] rounded-2xl shadow-2xl shadow-black/60",
          )}
        />
      )}

      {/* <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 md:p-4">
        <div className="min-w-0 pt-1">
          <p className="truncate text-sm font-medium text-white">{file?.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
            {(status === "presigning" || status === "uploading") && (
              <Loader2 className="size-3 shrink-0 animate-spin" />
            )}
            {status === "success" && <Check className="size-3 shrink-0 text-primary" />}
            {statusText}
          </p>
        </div>
        <ChangeFileButton />
      </div> */}

      {(status === "presigning" || status === "uploading" || status === "success") && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={status === "presigning" ? undefined : progress}
          className={cn(
            "absolute inset-x-0 top-0 z-20 h-1 bg-white/10 transition-opacity duration-300",
            focused && "pointer-events-none opacity-0",
          )}
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
  )
}
