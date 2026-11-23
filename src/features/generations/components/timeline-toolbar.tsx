"use client"

import { useState } from "react"
import { Maximize2, Pause, Play, Plus, Scissors } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { VideoTimeline } from "@/features/generations/hooks/use-video-timeline"
import { formatTime } from "@/features/generations/lib/video-timeline"

type TimelineToolbarProps = {
  timeline: VideoTimeline
  isBusy: boolean
}

export function TimelineToolbar({ timeline, isBusy }: TimelineToolbarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">Timeline</h3>
        <span className="text-[11px] text-zinc-500">
          {timeline.layers.length} layer{timeline.layers.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!timeline.duration}
          onClick={timeline.togglePlay}
          className="h-8 gap-1.5"
          aria-label={timeline.isPlaying ? "Pause" : "Play"}
        >
          {timeline.isPlaying ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
          {timeline.isPlaying ? "Pause" : "Play"}
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" />
            }
            disabled={!timeline.duration || isBusy}
          >
            <Maximize2 className="size-3.5" />
            Apply to full video
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply blur to the full video?</AlertDialogTitle>
              <AlertDialogDescription>
                All existing blur segments will be removed and replaced with a single segment
                covering the entire video ({formatTime(timeline.duration)}). The active blur type
                will be kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  timeline.applyToFullVideo()
                  setConfirmOpen(false)
                }}
              >
                Apply to full video
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!timeline.splitTarget}
          onClick={timeline.splitAtPlayhead}
          className="h-8 gap-1.5"
          title="Split the layer under the playhead (S)"
        >
          <Scissors className="size-3.5" />
          Split
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!timeline.duration || !timeline.canAddLayer}
          onClick={timeline.addLayer}
          className="h-8 gap-1.5"
        >
          <Plus className="size-3.5" />
          Add blur segment
        </Button>
      </div>
    </div>
  )
}
