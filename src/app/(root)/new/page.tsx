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
      <div className="mx-auto h-full w-full max-w-8xl gap-1 flex">
        <div className="flex-1 h-full bg-secondary"></div> 
        <div className="flex-4 h-full flex flex-col gap-1">
          <div className="w-full flex-1 bg-red-500"></div>
          <div className="w-full flex-9 bg-red-500"></div>
        </div> 
      </div>
    </div>
  )
}
