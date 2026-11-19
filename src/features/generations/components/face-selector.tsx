"use client"

import { Images, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SelectFaceDialog } from "@/features/face/components/select-face-dialog"
import { UploadFaceDialog } from "@/features/face/components/upload-face-dailog"
import { useFaceById } from "@/features/face/hooks"

type FaceSelectorProps = {
  value?: string | null
  onChange: (faceId: string | null) => void
  disabled?: boolean
}

export const FaceSelector = ({ value = null, onChange, disabled }: FaceSelectorProps) => {
  const { data: face, isPending } = useFaceById(value ?? "", Boolean(value))

  if (value) {
    return (
      <div className="flex w-full min-w-0 items-center gap-3 rounded-xl border p-2">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black">
          {face?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={face.url} alt="" className="h-full w-full object-cover" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {isPending ? "Loading…" : (face?.name ?? "Selected face")}
          </span>
          {face?.fileName && (
            <span className="block truncate text-xs text-muted-foreground">{face.fileName}</span>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Clear selected face"
          onClick={() => onChange(null)}
          className="shrink-0"
        >
          <X />
        </Button>
      </div>
    )
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2">
      <SelectFaceDialog selectedFaceId={value} onSelect={(id) => onChange(id)}>
        <Button type="button" variant="outline" disabled={disabled} className="w-full">
          <Images />
          Select existing
        </Button>
      </SelectFaceDialog>
      <UploadFaceDialog onUploaded={(f) => onChange(f.id)}>
        <Button type="button" variant="outline" disabled={disabled} className="w-full">
          <Plus />
          Upload new
        </Button>
      </UploadFaceDialog>
    </div>
  )
}
