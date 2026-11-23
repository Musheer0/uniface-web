"use client"

import type { RefObject } from "react"

import type { FileUploadStatus } from "@/features/face/hooks"
import { TimelineCanvas } from "@/features/generations/components/timeline-canvas"
import { TimelineToolbar } from "@/features/generations/components/timeline-toolbar"
import { TimelineZoomControls } from "@/features/generations/components/timeline-zoom-controls"
import type { VideoTimeline as VideoTimelineState } from "@/features/generations/hooks/use-video-timeline"

type VideoTimelineProps = {
  timeline: VideoTimelineState
  timelineRef: RefObject<HTMLDivElement | null>
  scrollRef: RefObject<HTMLDivElement | null>
  status: FileUploadStatus
  error: string | null
  isBusy: boolean
}

export function VideoTimeline({
  timeline,
  timelineRef,
  scrollRef,
  status,
  error,
  isBusy,
}: VideoTimelineProps) {
  return (
    <div className="w-full min-w-0 max-w-full shrink-0 border-t border-white/10 bg-zinc-950 p-3 md:p-4">
      <TimelineToolbar timeline={timeline} isBusy={isBusy} />
      <TimelineCanvas timelineRef={timelineRef} scrollRef={scrollRef} timeline={timeline} />
      <TimelineZoomControls timeline={timeline} />

      {status === "error" && (
        <p className="mt-2 text-xs text-destructive">{error ?? "Upload failed. Please try again."}</p>
      )}
    </div>
  )
}
