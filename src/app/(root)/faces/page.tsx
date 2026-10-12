import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FacesList } from "@/features/face/components/faces-list"
import { UploadFaceDialog } from "@/features/face/components/upload-face-dailog"

export default function FacesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-medium">Faces</h1>
          <p className="text-sm text-muted-foreground">
            People you want to detect and blur.
          </p>
        </div>
        <UploadFaceDialog>
          <Button>
            <Plus />
            Add face
          </Button>
        </UploadFaceDialog>
      </div>
      <FacesList />
    </div>
  )
}
