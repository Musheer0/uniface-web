"use client"

import { useEffect, useRef, useState } from "react"
import type { BlurMethod } from "@blurfield/js"

import { useFileUpload } from "@/features/face/hooks"
import { useGenerateImage } from "@/features/generations/hooks"
import { formatBytes } from "@/features/generations/lib/image-generation"

type Options = {
  file: File
  previewUrl: string | null
  clearFile: () => void
  onDone: () => void
}

/** Owns the image upload + generation flow and the settings that feed it. */
export function useImageGeneration({ file, previewUrl, clearFile, onDone }: Options) {
  // Same two-step upload as the face dialog: presign → XHR → progress / abort /
  // orphan cleanup. Runs on submit — the returned `media.id` is used below.
  const { upload, abort, progress, status, error, isBusy } = useFileUpload()
  const {
    mutateAsync: createGeneration,
    isPending: isGenerating,
    data: generationResult,
  } = useGenerateImage()

  const [blurMethod, setBlurMethod] = useState<BlurMethod>("blackout")
  const [faceId, setFaceId] = useState<string | null>(null)
  const [mediaId, setMediaId] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [downloadOutputUrl, setDownloadOutputUrl] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanComplete, setScanComplete] = useState(false)

  // The uploaded media belongs to a specific File. Keep it across failed
  // generation attempts so a retry can skip the upload, but drop it as soon
  // as the user swaps the file (a different File needs its own upload).
  const uploadedFileRef = useRef<File | null>(null)

  useEffect(() => {
    if (uploadedFileRef.current && uploadedFileRef.current !== file) {
      uploadedFileRef.current = null
      setMediaId(null)
      setSubmitError(null)
    }
  }, [file])

  const busy = isBusy || isGenerating
  const phase: "idle" | "scanning" | "result" = !submitted
    ? "idle"
    : scanComplete && downloadOutputUrl
      ? "result"
      : "scanning"

  // Starts the moment Submit is clicked (like the video flow) and draws the border 0 → 100.
  useEffect(() => {
    if (!submitted) return
    const duration = 1600
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const ratio = Math.min((now - start) / duration, 1)
      setScanProgress(Math.round(ratio * 100))
      if (ratio < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setScanComplete(true)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [submitted])

  const handleCancel = () => {
    abort()
    uploadedFileRef.current = null
    setMediaId(null)
    clearFile()
    onDone()
  }

  const handleSubmit = async () => {
    if (busy || submitted) return
    setSubmitError(null)
    setDownloadOutputUrl(null)
    setScanProgress(0)
    setScanComplete(false)
    setSubmitted(true)

    try {
      // 1. Reuse the uploaded media for this exact file; only upload when
      //    there isn't one yet (e.g. first submit, or after a file change).
      let id = mediaId
      if (!id || uploadedFileRef.current !== file) {
        const data = await upload(file)
        if (!data) {
          setSubmitted(false) // cancelled
          return
        }
        id = (data.media as { id: string }).id
        setMediaId(id)
        uploadedFileRef.current = file
      }

      // 2. Create the generation. On failure the id stays in state so the
      //    next attempt retries the generation without re-uploading.
      const generation = await createGeneration({
        media_id: id,
        face_id: faceId,
        blur_id: blurMethod,
      })
      setGenerationId(generation.id)
      setDownloadOutputUrl(generation.media_url)
    } catch (err) {
      setSubmitted(false)
      setScanComplete(false)
      // Upload errors are surfaced by the hook; show generation errors here.
      if (!error) {
        setSubmitError(err instanceof Error ? err.message : "Couldn't create the generation.")
      }
    }
  }

  const handleCreateAnother = () => {
    abort()
    uploadedFileRef.current = null
    setMediaId(null)
    clearFile()
    onDone()
  }

  const statusText =
    status === "presigning"
      ? "Preparing upload…"
      : status === "uploading"
        ? `Uploading · ${progress}%`
        : status === "success"
          ? "Upload complete"
          : status === "error"
            ? "Upload failed"
            : `${formatBytes(file.size)} · ${file.type || "file"}`

  return {
    file,
    previewUrl,
    progress,
    status,
    error,
    isBusy,
    busy,
    isGenerating,
    generationResult,
    blurMethod,
    setBlurMethod,
    faceId,
    setFaceId,
    mediaId,
    generationId,
    submitError,
    downloadOutputUrl,
    phase,
    scanProgress,
    statusText,
    handleSubmit,
    handleCancel,
    handleCreateAnother,
  }
}

export type ImageGeneration = ReturnType<typeof useImageGeneration>
