"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { SelectFaceDialog } from "@/features/face/components/select-face-dialog"
import { useFaceById } from "@/features/face/hooks"

export default function NewPage() {
  const [faceId, setFaceId] = useState<string | null>(null)
  const { data: face } = useFaceById(faceId ?? "", Boolean(faceId))

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader title="New generation" />
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Pick a face to detect and blur in your next video.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SelectFaceDialog selectedFaceId={faceId} onSelect={setFaceId}>
            <Button variant={faceId ? "outline" : "default"}>
              {faceId ? "Change face" : "Select a face"}
            </Button>
          </SelectFaceDialog>
          {faceId && (
            <p className="text-sm">
              Selected: <span className="font-medium">{face?.name ?? faceId}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
