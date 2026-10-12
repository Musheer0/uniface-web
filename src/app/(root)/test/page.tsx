import { Button } from "@/components/ui/button";
import { UploadFaceDialog } from "@/features/face/components/upload-face-dailog";

export default function page() {
  return (
    <div>
      <UploadFaceDialog>
        <Button>
          Upload
        </Button>
      </UploadFaceDialog>
    </div>
  )
}