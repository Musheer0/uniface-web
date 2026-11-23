"use client"

import { ZoomIn, ZoomOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { VideoTimeline } from "@/features/generations/hooks/use-video-timeline"
import { formatTime, ZOOM_LEVELS } from "@/features/generations/lib/video-timeline"

export function TimelineZoomControls({ timeline }: { timeline: VideoTimeline }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <p className="text-[11px] text-zinc-500">
        Scroll over the timeline to zoom, Shift+scroll to pan; on touch, drag to pan and pinch to
        zoom. Drag layers to move or resize, right-click for options. Press{" "}
        <kbd className="rounded border border-white/20 px-1">S</kbd> to split at the playhead.
      </p>
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-[10px] tabular-nums text-zinc-500">
          {formatTime(timeline.currentTime)} · {Math.round(timeline.zoom * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={timeline.zoomIndex === 0}
          onClick={() => timeline.changeZoom(timeline.zoomIndex - 1)}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <ZoomOut className="size-4" />
        </Button>
        <input
          type="range"
          min={0}
          max={ZOOM_LEVELS.length - 1}
          step={1}
          value={timeline.zoomIndex}
          onChange={(event) => timeline.changeZoom(Number(event.target.value))}
          aria-label="Timeline zoom"
          className="h-1 w-20 cursor-pointer accent-primary"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={timeline.zoomIndex === ZOOM_LEVELS.length - 1}
          onClick={() => timeline.changeZoom(timeline.zoomIndex + 1)}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px]"
          disabled={timeline.zoomIndex === 0}
          onClick={() => timeline.changeZoom(0)}
        >
          Fit
        </Button>
      </div>
    </div>
  )
}
