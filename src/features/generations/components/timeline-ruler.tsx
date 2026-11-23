"use client"

import { cn } from "@/lib/utils"
import type { VideoTimeline } from "@/features/generations/hooks/use-video-timeline"
import { formatTime } from "@/features/generations/lib/video-timeline"

export function TimelineRuler({ timeline }: { timeline: VideoTimeline }) {
  return (
    <div
      className="relative h-6 cursor-ew-resize touch-none border-b border-white/10 bg-white/[0.02]"
      onPointerDown={timeline.startScrub}
      onPointerMove={timeline.moveScrub}
      onPointerUp={timeline.endScrub}
      onPointerCancel={timeline.endScrub}
    >
      {timeline.ticks.minor.map((time) => (
        <span
          key={`minor-${time}`}
          className="pointer-events-none absolute bottom-0 h-1.5 w-px bg-white/15"
          style={{ left: time * timeline.pixelsPerSecond }}
        />
      ))}
      {timeline.ticks.major.map((time) => (
        <div
          key={`major-${time}`}
          className="pointer-events-none absolute inset-y-0"
          style={{ left: time * timeline.pixelsPerSecond }}
        >
          <span className="absolute inset-y-0 left-0 w-px bg-white/25" />
          <span
            className={cn(
              "absolute top-0.5 whitespace-nowrap text-[10px] tabular-nums text-zinc-500",
              time + timeline.majorTick > timeline.duration
                ? "-ml-1 -translate-x-full"
                : "translate-x-1",
            )}
          >
            {formatTime(time)}
          </span>
        </div>
      ))}
    </div>
  )
}
