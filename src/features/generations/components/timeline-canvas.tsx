"use client"

import type { RefObject } from "react"

import type { VideoTimeline } from "@/features/generations/hooks/use-video-timeline"
import { TimelineRuler } from "@/features/generations/components/timeline-ruler"
import { TimelineTrack } from "@/features/generations/components/timeline-track"

type TimelineCanvasProps = {
  timeline: VideoTimeline
  timelineRef: RefObject<HTMLDivElement | null>
  scrollRef: RefObject<HTMLDivElement | null>
}

/** Scrollable ruler + track that share a single pixel-based coordinate system. */
export function TimelineCanvas({ timeline, timelineRef, scrollRef }: TimelineCanvasProps) {
  return (
    <div
      ref={scrollRef}
      onScroll={(event) => timeline.setScrollOffset(event.currentTarget.scrollLeft)}
      onPointerDownCapture={timeline.onPointerDownCapture}
      onPointerMoveCapture={timeline.onPointerMoveCapture}
      onPointerUpCapture={timeline.onPointerUpCapture}
      onPointerCancelCapture={timeline.onPointerCancelCapture}
      className="w-full min-w-0 max-w-full touch-pan-y overscroll-x-contain overflow-x-auto overflow-y-hidden rounded-lg border border-white/10 bg-white/[0.03]"
    >
      <div
        ref={timelineRef}
        className="relative select-none"
        style={{ width: timeline.contentWidth }}
      >
        <TimelineRuler timeline={timeline} />
        <TimelineTrack timeline={timeline} />

        {/* Playhead – spans both the ruler and the track */}
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"
          style={{ left: timeline.currentTime * timeline.pixelsPerSecond }}
        >
          <div className="absolute top-0 -left-[5px] size-[11px] rotate-45 rounded-[2px] bg-red-500" />
        </div>
      </div>
    </div>
  )
}
