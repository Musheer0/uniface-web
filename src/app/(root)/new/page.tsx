"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { ImageGenerationUI } from "@/features/generations/components/image-generation-ui"
import UploadFile from "@/features/generations/components/upload-file"
import { VideoGenerationUI } from "@/features/generations/components/video-generation-ui"
import { useFileStore } from "@/features/generations/hooks/use-file"

function NewPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const type = searchParams.get("type")

  const file = useFileStore((s) => s.file)
  const previewUrl = useFileStore((s) => s.previewUrl)
  const clearFile = useFileStore((s) => s.clearFile)

  // Keep the URL in sync: /new?type=image (or ?type=video) once a file is picked.
  useEffect(() => {
    if (!file) return
    const next = file.type.startsWith("video/") ? "video" : "image"
    if (type !== next) router.replace(`${pathname}?type=${next}`, { scroll: false })
  }, [file, type, pathname, router])

  const isImage = file ? !file.type.startsWith("video/") : false

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SiteHeader title="New generation" />

      {!file ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <UploadFile />
        </div>
      ) : isImage ? (
        <ImageGenerationUI
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          previewUrl={previewUrl}
          clearFile={clearFile}
          onDone={() => router.replace(pathname, { scroll: false })}
        />
      ) : (
        <VideoGenerationUI
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          previewUrl={previewUrl}
          clearFile={clearFile}
          onDone={() => router.replace(pathname, { scroll: false })}
        />
      )}
    </div>
  )
}

export default function NewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 flex-col">
          <SiteHeader title="New generation" />
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <NewPageContent />
    </Suspense>
  )
}
