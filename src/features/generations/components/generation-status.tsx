"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  CircleCheck,
  Clock3,
  Download,
  Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { downloadFile } from "@/lib/download-file"
import {
  useGenerationStatusPoll,
  type GenerationStatus as GenerationStatusCode,
} from "@/lib/update-genertation-status"
import { STATUS_LABELS, STATUS_VARIANTS } from "../lib/generation-format"

function StatusIcon({ status }: { status: GenerationStatusCode }) {
  switch (status) {
    case "STARTED":
      return <Loader2 className="size-8 animate-spin text-primary" />
    case "PENDING":
      return <Clock3 className="size-8 text-muted-foreground" />
    case "COMPLETED":
      return <CircleCheck className="size-8 text-emerald-500" />
    case "FAILED":
      return <AlertCircle className="size-8 text-destructive" />
  }
}

/** Polls the public status endpoint and shows the finished output + download. */
export const GenerationStatus = ({ id }: { id: string }) => {
  const { data, error, isPolling } = useGenerationStatusPoll(id)
  const [isDownloading, setIsDownloading] = useState(false)

  const status = data?.status ?? null
  const output = data?.output ?? null
  const isVideo = output?.type?.startsWith("video/") ?? data?.is_video ?? false

  const message = error
    ? error
    : status === "FAILED"
      ? (data?.failure_reason ?? "Something went wrong while generating.")
      : status === "COMPLETED"
        ? output
          ? "Your generation is ready."
          : "Your generation completed, but no output file was found."
        : status === "STARTED"
          ? "Your generation is being processed."
          : status === "PENDING"
            ? "Your generation is queued and will start soon."
            : "Checking generation status…"

  const handleDownload = async () => {
    if (!output?.url) return
    setIsDownloading(true)
    try {
      await downloadFile(output.url, output.name || "generation")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button render={<Link href="/generations" />} variant="ghost" size="sm">
        <ArrowLeft />
        Back to generations
      </Button>

      {!data && !error ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : error || !status ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-12 text-center"
        >
          <AlertCircle className="mx-auto size-8 text-destructive" />
          <p className="mt-3 text-sm font-medium text-destructive">
            {error ?? "Couldn't load the generation status."}
          </p>
          <p className="mt-1 break-all text-xs text-muted-foreground">ID {id}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border px-4 py-12 text-center">
          <StatusIcon status={status} />
          <Badge variant={STATUS_VARIANTS[status]}>
            {STATUS_LABELS[status]}
          </Badge>
          <p className="text-sm text-muted-foreground">{message}</p>
          {isPolling && !output && (
            <p className="text-xs text-muted-foreground">
              This page updates automatically.
            </p>
          )}
          <p className="break-all text-xs text-muted-foreground">ID {id}</p>

          {output && (
            <div className="w-full space-y-3 pt-2">
              <div className="overflow-hidden rounded-lg bg-muted">
                {isVideo ? (
                  <video
                    src={output.url}
                    preload="metadata"
                    playsInline
                    controls
                    className="max-h-96 w-full object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={output.url}
                    alt={output.name}
                    className="max-h-96 w-full object-contain"
                  />
                )}
              </div>
              <Button type="button" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                Download {output.name}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
