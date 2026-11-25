"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"

import { useFileUpload } from "@/features/face/hooks"
import { formatBytes } from "@/features/generations/lib/image-generation"
import { EPSILON } from "@/features/generations/lib/video-timeline"
import { useTRPC } from "@/trpc/client"
import { useFileStore } from "./use-file"
import { useVideoGenerationStore } from "./use-video-generation-store"
import type { VideoTimeline } from "./use-video-timeline"

type Options = {
  timeline: VideoTimeline
  onDone: () => void
}

/**
 * Owns the video generation flow: upload the source once per File, then
 * dispatch a normal or timestamp-scoped blur job. A failed generation can be
 * retried without re-uploading until the user swaps the file.
 */
export function useGenerateVideo({ timeline, onDone }: Options) {
  const file = useFileStore((state) => state.file)
  const clearFile = useFileStore((state) => state.clearFile)
  const faceId = useVideoGenerationStore((state) => state.faceId)
  const blurMethod = useVideoGenerationStore((state) => state.blurMethod)

  const { upload, abort, progress, status, error, isBusy } = useFileUpload()
  const trpc = useTRPC()
  const { mutateAsync: deleteFile } = useMutation(
    trpc.media.deleteMedia.mutationOptions(),
  )
  const { mutateAsync: generate, isPending: isGenerating } = useMutation(
    trpc.generation.generate_video.mutationOptions(),
  )
  const { mutateAsync: generateTimestamp, isPending: isGeneratingTimestamp } =
    useMutation(trpc.generation.generate_video_timestamped.mutationOptions())

  const [mediaId, setMediaId] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const uploadedFileRef = useRef<File | null>(null)

  // A different File invalidates the uploaded media. Generation failures do
  // not: the id stays in state so a retry goes straight to dispatch.
  useEffect(() => {
    if (uploadedFileRef.current && uploadedFileRef.current !== file) {
      const previousId = mediaId
      uploadedFileRef.current = null
      setMediaId(null)
      setSubmitError(null)
      if (previousId) void deleteFile({ id: previousId }).catch(() => {})
    }
  }, [file, mediaId, deleteFile])

  const busy = isBusy || isGenerating || isGeneratingTimestamp

  const handleCancel = () => {
    abort()
    clearFile()
    onDone()
  }

  const handleSubmit = async () => {
    if (busy || submitted || !file) return
    setSubmitError(null)
    setGenerationId(null)
    setSubmitted(true)

    try {
      // 1. Upload only when this exact File has no media yet.
      let id = mediaId
      if (!id || uploadedFileRef.current !== file) {
        const data = await upload(file)
        if (!data) {
          setSubmitted(false) // upload was cancelled
          return
        }
        id = (data.media as { id: string }).id
        setMediaId(id)
        uploadedFileRef.current = file
      }

      const layers = timeline.layers
      if (layers.length === 0) {
        throw new Error("Add at least one blur layer first.")
      }

      const timeStamps: [number, number][] = layers.map(({ start, end }) => [
        start,
        end,
      ])
      const input = { media_id: id, face_id: faceId, blur_id: blurMethod }

      // One segment covering the entire video is a plain full-video blur.
      const isFullVideo =
        timeStamps.length === 1 &&
        timeStamps[0][0] <= EPSILON &&
        timeStamps[0][1] >= timeline.duration - EPSILON

      const result = isFullVideo
        ? await generate(input)
        : await generateTimestamp({ ...input, time_stamps: timeStamps })
      setGenerationId(result.jobId)
    } catch (err) {
      setSubmitted(false)
      // Upload errors are already surfaced by the upload hook.
      if (!error) {
        setSubmitError(
          err instanceof Error ? err.message : "Couldn't create the generation.",
        )
      }
    }
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
            : isGenerating || isGeneratingTimestamp
              ? "Starting generation…"
              : file
                ? `${formatBytes(file.size)} · ${file.type || "file"}`
                : "Ready to submit"

  return {
    progress,
    status,
    error,
    isBusy,
    busy,
    isGenerating: isGenerating || isGeneratingTimestamp,
    mediaId,
    generationId,
    submitError: error ?? submitError,
    submitted,
    statusText,
    handleSubmit,
    handleCancel,
  }
}

export type GenerateVideo = ReturnType<typeof useGenerateVideo>
