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
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            People you want to detect and blur.
          </p>
          <UploadFaceDialog>
            <Button>
              <Plus />
              Add face
            </Button>
          </UploadFaceDialog>
        </div>
        <FacesList />
      </div>
    </div>
  )
}
