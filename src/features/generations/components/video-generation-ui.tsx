"use client"

import { useEffect, useRef, useState } from "react"

import { useFileUpload } from "@/features/face/hooks"
import { cn } from "@/lib/utils"
import { VideoControls } from "@/features/generations/components/video-controls"
import { VideoPreview } from "@/features/generations/components/video-preview"
import { VideoTimeline } from "@/features/generations/components/video-timeline"
import {
  useFileStore,
  useVideoGenerationStore,
} from "@/features/generations/hooks/use-video-generation-store"
import { useVideoTimeline } from "@/features/generations/hooks/use-video-timeline"

type VideoGenerationUIProps = {
  onDone: () => void
}

export function VideoGenerationUI({ onDone }: VideoGenerationUIProps) {
  const { abort, progress, status, error, isBusy } = useFileUpload()
  const file = useFileStore((state) => state.file)
  const clearFile = useFileStore((state) => state.clearFile)
  const faceId = useVideoGenerationStore((state) => state.faceId)
  const resetVideo = useVideoGenerationStore((state) => state.reset)

  const [submitted, setSubmitted] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timeline = useVideoTimeline({ isBusy, videoRef, timelineRef, scrollRef })

  useEffect(() => {
    resetVideo()
  }, [resetVideo])

  const handleCancel = () => {
    abort()
    clearFile()
    onDone()
  }

  // Temporary: log the timeline and switch to the centered-video view.
  const handleSubmit = () => {
    console.log({
      face_id: faceId,
      duration: timeline.duration,
      current_time: timeline.currentTime,
      zoom: timeline.zoom,
      layers: timeline.layers.map(({ start, end, blurMethod }) => ({
        start,
        end,
        blur_type: blurMethod,
      })),
    })
    setSubmitted(true)
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
            : "Ready to submit"

  if (!file) return null

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto transition-all duration-700 ease-out md:flex-row md:overflow-hidden",
        submitted && "items-center justify-center",
      )}
    >
      {/* Preview + timeline */}
      <section
        className={cn(
          "flex min-h-[55vh] w-full min-w-0 flex-col bg-black transition-all duration-700 ease-out md:min-h-0 md:flex-1",
          submitted && "min-h-0",
        )}
      >
        <VideoPreview
          focused={submitted}
          status={status}
          progress={progress}
          statusText={statusText}
          videoRef={videoRef}
          timeline={timeline}
        />

        <div
          className={cn(
            "overflow-hidden transition-all duration-500 ease-out",
            submitted
              ? "pointer-events-none max-h-0 -translate-y-3 opacity-0"
              : "max-h-[420px] translate-y-0 opacity-100",
          )}
        >
          <VideoTimeline
            timeline={timeline}
            timelineRef={timelineRef}
            scrollRef={scrollRef}
            status={status}
            error={error}
            isBusy={isBusy}
          />
        </div>
      </section>

      <div
        className={cn(
          "shrink-0 overflow-hidden transition-all duration-500 ease-out",
          submitted ? "pointer-events-none w-0 opacity-0" : "w-full opacity-100 md:w-[340px]",
        )}
      >
        <VideoControls
          timeline={timeline}
          status={status}
          progress={progress}
          isBusy={isBusy}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
