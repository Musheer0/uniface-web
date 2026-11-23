"use client"

import { Check, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BlurMethodSelect } from "@/features/generations/components/blur-method-select"
import { FaceSelector } from "@/features/generations/components/face-selector"
import type { ImageGeneration } from "@/features/generations/hooks/use-image-generation"

export function ImageControls({ generation }: { generation: ImageGeneration }) {
  return (
    <aside className="w-full shrink-0 space-y-6 border-t bg-sidebar p-4 md:w-[340px] md:overflow-y-auto md:border-l md:border-t-0 md:p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Blur method</h2>
          {generation.status === "success" && <Check className="size-4 text-primary" />}
        </div>
        <BlurMethodSelect
          value={generation.blurMethod}
          onChange={generation.setBlurMethod}
          disabled={generation.busy}
        />
        <p className="text-xs text-muted-foreground">Choose how detected faces are obscured.</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Faces to keep unblurred</h2>
        <FaceSelector
          value={generation.faceId}
          onChange={generation.setFaceId}
          disabled={generation.busy}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Selected faces are excluded from blurring.
        </p>
      </div>

      {generation.status === "error" && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={generation.handleSubmit}
          >
            Try again
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={generation.handleCancel}
          >
            Remove file
          </Button>
        </div>
      )}

      {generation.status === "uploading" && (
        <Button type="button" variant="outline" className="w-full" onClick={generation.handleCancel}>
          <X />
          Cancel upload
        </Button>
      )}

      <div className="space-y-2 border-t pt-4">
        <Button
          type="button"
          size="lg"
          className="w-full font-semibold"
          disabled={generation.busy}
          onClick={generation.handleSubmit}
        >
          {generation.busy && <Loader2 className="animate-spin" />}
          {generation.isGenerating
            ? "Creating…"
            : generation.status === "presigning"
              ? "Preparing…"
              : generation.status === "uploading"
                ? `Uploading · ${generation.progress}%`
                : "Submit"}
        </Button>

        {generation.submitError && <p className="text-xs text-destructive">{generation.submitError}</p>}
      </div>
    </aside>
  )
}
