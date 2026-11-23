"use client"

import { GripVertical, Scissors } from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import type { VideoTimeline } from "@/features/generations/hooks/use-video-timeline"
import { formatTime } from "@/features/generations/lib/video-timeline"

export function TimelineTrack({ timeline }: { timeline: VideoTimeline }) {
  return (
    <div
      className="relative h-16 touch-none"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) timeline.startScrub(event)
      }}
      onPointerMove={timeline.moveScrub}
      onPointerUp={timeline.endScrub}
      onPointerCancel={timeline.endScrub}
    >
      {timeline.duration === 0 && (
        <p className="flex h-full items-center justify-center text-xs text-zinc-500">
          Loading video…
        </p>
      )}

      {timeline.layers.map((layer) => {
        const left = layer.start * timeline.pixelsPerSecond
        const width = Math.max((layer.end - layer.start) * timeline.pixelsPerSecond, 2)
        const isActive = layer.id === timeline.activeLayerId
        return (
          <ContextMenu key={layer.id}>
            <ContextMenuTrigger
              render={
                <div
                  onClick={() => timeline.setActiveLayerId(layer.id)}
                  onPointerDown={(event) => timeline.startDrag(event, layer, "move")}
                  onPointerMove={timeline.onDragMove}
                  onPointerUp={timeline.endDrag}
                  className={cn(
                    "absolute inset-y-1 flex cursor-grab items-center justify-between overflow-hidden rounded-md border px-1 text-[11px] touch-none select-none active:cursor-grabbing",
                    isActive
                      ? "border-primary bg-primary/25 ring-2 ring-primary/50"
                      : "border-white/20 bg-white/10 hover:bg-white/15",
                  )}
                  style={{ left, width }}
                >
                  <span className="pointer-events-none min-w-0 truncate px-1 tabular-nums text-zinc-100">
                    {formatTime(layer.start)} – {formatTime(layer.end)}
                  </span>

                  <div
                    role="slider"
                    aria-label={`${layer.blurMethod} layer start`}
                    aria-valuemin={0}
                    aria-valuemax={timeline.duration}
                    aria-valuenow={layer.start}
                    tabIndex={0}
                    onPointerDown={(event) => timeline.startDrag(event, layer, "start")}
                    onPointerMove={timeline.onDragMove}
                    onPointerUp={timeline.endDrag}
                    className="absolute inset-y-0 left-0 flex w-3 touch-none items-center justify-center bg-primary/60 hover:bg-primary"
                  >
                    <GripVertical className="size-3 text-white" />
                  </div>
                  <div
                    role="slider"
                    aria-label={`${layer.blurMethod} layer end`}
                    aria-valuemin={0}
                    aria-valuemax={timeline.duration}
                    aria-valuenow={layer.end}
                    tabIndex={0}
                    onPointerDown={(event) => timeline.startDrag(event, layer, "end")}
                    onPointerMove={timeline.onDragMove}
                    onPointerUp={timeline.endDrag}
                    className="absolute inset-y-0 right-0 flex w-3 touch-none items-center justify-center bg-primary/60 hover:bg-primary"
                  >
                    <GripVertical className="size-3 text-white" />
                  </div>
                </div>
              }
            />
            <ContextMenuContent>
              <ContextMenuLabel>
                {formatTime(layer.start)} – {formatTime(layer.end)} · {layer.blurMethod}
              </ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => timeline.setActiveLayerId(layer.id)}>
                Select layer
              </ContextMenuItem>
              {timeline.canSplit(layer) && (
                <ContextMenuItem onClick={() => timeline.splitLayer(layer.id, timeline.currentTime)}>
                  <Scissors className="size-4" />
                  Split at playhead
                </ContextMenuItem>
              )}
              <ContextMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => timeline.deleteLayer(layer.id)}
              >
                Delete layer
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )
      })}
      {timeline.layers.length === 0 && timeline.duration > 0 && (
        <p className="flex h-full items-center justify-center text-xs text-zinc-500">
          No blur layers. Add a blur segment to start.
        </p>
      )}
    </div>
  )
}
