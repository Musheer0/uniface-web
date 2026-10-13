"use client"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { FacesList } from "@/features/face/components/faces-list"
import { UploadFaceDialog } from "@/features/face/components/upload-face-dailog"

export default function FacesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader title="Faces" />
      <div className="mx-auto w-full max-w-7xl px-4 pb-6">

        <FacesList />
      </div>
    </div>
  )
}
