"use client"

import { cn } from "@/lib/utils"
import { ImageControls } from "@/features/generations/components/image-controls"
import { ImagePreview } from "@/features/generations/components/image-preview"
import { useImageGeneration } from "@/features/generations/hooks/use-image-generation"

type ImageGenerationUIProps = {
  file: File
  previewUrl: string | null
  clearFile: () => void
  onDone: () => void
}

export function ImageGenerationUI({
  file,
  previewUrl,
  clearFile,
  onDone,
}: ImageGenerationUIProps) {
  const generation = useImageGeneration({ file, previewUrl, clearFile, onDone })
  const focused = generation.phase !== "idle"

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto transition-all duration-700 ease-out md:flex-row md:overflow-hidden",
        focused && "items-center justify-center",
      )}
    >
      <ImagePreview generation={generation} />

      <div
        className={cn(
          "shrink-0 overflow-hidden transition-all duration-500 ease-out",
          focused ? "pointer-events-none w-0 opacity-0" : "w-full opacity-100 md:w-[340px]",
        )}
      >
        <ImageControls generation={generation} />
      </div>
    </div>
  )
}
