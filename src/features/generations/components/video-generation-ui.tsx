"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"
import { VideoControls } from "@/features/generations/components/video-controls"
import { VideoPreview } from "@/features/generations/components/video-preview"
import { VideoTimeline } from "@/features/generations/components/video-timeline"
import { useGenerateVideo } from "@/features/generations/hooks/use-generate-video"
import {
  useFileStore,
  useVideoGenerationStore,
} from "@/features/generations/hooks/use-video-generation-store"
import { useVideoTimeline } from "@/features/generations/hooks/use-video-timeline"

type VideoGenerationUIProps = {
  onDone: () => void
}

export function VideoGenerationUI({ onDone }: VideoGenerationUIProps) {
  const file = useFileStore((state) => state.file)
  const resetVideo = useVideoGenerationStore((state) => state.reset)

  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timeline = useVideoTimeline({ videoRef, timelineRef, scrollRef })

  const generation = useGenerateVideo({ timeline, onDone })

  useEffect(() => {
    resetVideo()
  }, [resetVideo])

  if (!file) return null

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto transition-all duration-700 ease-out md:flex-row md:overflow-hidden",
        generation.submitted && "items-center justify-center",
      )}
    >
      {/* Preview + timeline */}
      <section
        className={cn(
          "flex min-h-[55vh] w-full min-w-0 flex-col bg-black transition-all duration-700 ease-out md:min-h-0 md:flex-1",
          generation.submitted && "min-h-0",
        )}
      >
        <VideoPreview
          focused={generation.submitted}
          status={generation.status}
          progress={generation.progress}
          statusText={generation.statusText}
          videoRef={videoRef}
          timeline={timeline}
        />

        <div
          className={cn(
            "overflow-hidden transition-all duration-500 ease-out",
            generation.submitted
              ? "pointer-events-none max-h-0 -translate-y-3 opacity-0"
              : "max-h-[420px] translate-y-0 opacity-100",
          )}
        >
          <VideoTimeline
            timeline={timeline}
            timelineRef={timelineRef}
            scrollRef={scrollRef}
            status={generation.status}
            error={generation.submitError}
            isBusy={generation.busy}
          />
        </div>
      </section>

      <div
        className={cn(
          "shrink-0 overflow-hidden transition-all duration-500 ease-out",
          generation.submitted ? "pointer-events-none w-0 opacity-0" : "w-full opacity-100 md:w-[340px]",
        )}
      >
        <VideoControls
          timeline={timeline}
          status={generation.status}
          progress={generation.progress}
          isBusy={generation.busy}
          onSubmit={() => void generation.handleSubmit()}
          onCancel={generation.handleCancel}
        />
      </div>
    </div>
  )
}
