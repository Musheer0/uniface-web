"use client"

import { useCallback, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { uploadViaXHR } from "@/lib/upload-xhr"
import { useTRPC } from "@/trpc/client"

export type FileUploadStatus = "idle" | "presigning" | "uploading" | "success" | "error"

/** Re-exported from `@/lib/upload-xhr` so existing imports keep working. */
export { uploadViaXHR }

/**
 * Two-step media upload: reads the presigned POST from
 * `media.uploadMedia`, then PUTs the bytes to S3 via XHR with progress.
 * Accepts images and videos (same as the API) — callers validate first.
 * If the S3 bytes never land, the orphan media row is removed.
 *
 * Returns `null` when the upload is cancelled; throws the original error
 * (and sets `error`) on failure.
 */
export const useFileUpload = () => {
  const trpc = useTRPC()
  const { mutateAsync: getUploadData, isPending: isPresigning } = useMutation(
    trpc.media.uploadMedia.mutationOptions(),
  )
  const { mutateAsync: deleteMediaAsync } = useMutation(
    trpc.media.deleteMedia.mutationOptions(),
  )
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<FileUploadStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const abort = useCallback(() => {
    xhrRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    xhrRef.current?.abort()
    xhrRef.current = null
    setProgress(0)
    setStatus("idle")
    setError(null)
  }, [])

  const upload = useCallback(
    async (file: File) => {
      setError(null)
      setStatus("presigning")
      setProgress(0)
      // 1. Create the media row + get a presigned POST
      const data = await getUploadData({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      })
      const createdMediaId = (data.media as { id?: string }).id
      try {
        // 2. Upload bytes straight to S3 with XHR for progress events
        setStatus("uploading")
        await uploadViaXHR(data.upload_data.url, data.upload_data.fields, file, setProgress, xhrRef)
        setStatus("success")
        return data
      } catch (err) {
        if (err instanceof Error && err.message === "Upload cancelled") {
          setStatus("idle")
          return null
        }
        // The S3 bytes never landed — remove the orphan media row.
        if (createdMediaId) {
          try {
            await deleteMediaAsync({ id: createdMediaId })
          } catch {
            // Cleanup is best-effort; surface the original upload error below.
          }
        }
        setStatus("error")
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.")
        throw err
      }
    },
    [getUploadData, deleteMediaAsync],
  )

  return {
    upload,
    abort,
    reset,
    progress,
    status,
    error,
    isBusy: status === "presigning" || status === "uploading" || isPresigning,
  }
}
