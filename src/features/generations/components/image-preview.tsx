"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import ChangeFileButton from "@/features/generations/components/change-file-button"
import type { ImageGeneration } from "@/features/generations/hooks/use-image-generation"

/** Sits exactly on top of the source image and fades in once decoded. */
function ResultImage({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Generated result"
      onLoad={() => setLoaded(true)}
      className={cn(
        "absolute inset-0 size-full rounded-2xl bg-black object-contain transition-opacity duration-700 ease-out",
        loaded ? "opacity-100" : "opacity-0",
      )}
    />
  )
}

export function ImagePreview({ generation }: { generation: ImageGeneration }) {
  const {
    file,
    previewUrl,
    status,
    progress,
    statusText,
    error,
    phase,
    scanProgress,
    isGenerating,
    downloadOutputUrl: resultUrl,
    handleCreateAnother,
  } = generation

  const focused = phase !== "idle"
  const revealed = phase === "result" && !!resultUrl
  const showBorder = focused && !revealed && status !== "error"
  // Determinate while uploading, endless spinning light once upload is done
  const indeterminate = isGenerating || scanProgress >= 100

  const loadingText =
    status === "presigning"
      ? "Preparing upload…"
      : status === "uploading"
        ? `Uploading · ${progress}%`
        : "Generating your image…"

  const borderStyle: React.CSSProperties = {
    padding: 3,
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    maskComposite: "exclude",
    ...(indeterminate
      ? {
          background:
            "conic-gradient(from var(--border-angle), transparent 0deg 200deg, var(--primary) 360deg)",
        }
      : {
          background: `conic-gradient(var(--primary) ${scanProgress * 3.6}deg, transparent 0deg)`,
        }),
  }

  return (
    <section
      className={cn(
        "relative flex min-h-[45vh] w-full flex-col bg-black transition-all duration-700 ease-out md:min-h-0 md:flex-1",
        focused && "min-h-0",
      )}
    >
      {/* Upload progress bar */}
      {(status === "presigning" || status === "uploading" || status === "success") && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={status === "presigning" ? undefined : progress}
          className={cn(
            "absolute inset-x-0 top-0 z-20 h-1 bg-white/10 transition-opacity duration-500",
            focused && "pointer-events-none opacity-0",
          )}
        >
          <div
            className={cn(
              "h-full bg-primary transition-[width]",
              status === "presigning" && "w-1/4 animate-pulse",
            )}
            style={status === "presigning" ? undefined : { width: `${progress}%` }}
          />
        </div>
      )}

      {/* File bar */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 transition-opacity duration-500 md:p-4",
          focused && "pointer-events-none opacity-0",
        )}
      >
        <div className="min-w-0 pt-1">
          <p className="truncate text-sm font-medium text-white">{file.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
            {(status === "presigning" || status === "uploading") && (
              <Loader2 className="size-3 shrink-0 animate-spin" />
            )}
            {status === "success" && <Check className="size-3 shrink-0 text-primary" />}
            {statusText}
          </p>
        </div>
        <ChangeFileButton />
      </div>

      {/* Stage: source image, border, and result all share one box */}
      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center p-4 pt-20 transition-all duration-700 ease-out md:p-8 md:pt-24",
          focused && "p-4 pt-4 md:p-6 md:pt-6",
        )}
      >
        {previewUrl && (
          <div className="relative inline-block max-h-full max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected upload"
              className={cn(
                "max-h-full max-w-full rounded-xl object-contain shadow-2xl transition-all duration-700 ease-out",
                focused && "rounded-2xl",
              )}
            />

            {/* Result fades in on top of the source, same size, no layout shift */}
            {revealed && <ResultImage key={resultUrl} src={resultUrl} />}

            {/* Border: stays through upload AND generation, fades out on reveal */}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-700",
                showBorder ? "opacity-100" : "opacity-0",
                indeterminate && "animate-[border-spin_1.8s_linear_infinite]",
              )}
              style={borderStyle}
            />
            <div
              className={cn(
                "pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10 transition-opacity duration-700",
                showBorder ? "opacity-100" : "opacity-0",
              )}
            />

            {/* Status pill, inside the image so it never pushes layout */}
            <div
              className={cn(
                "absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full border border-white/10 bg-black/85 px-4 py-2 text-xs text-zinc-200 shadow-xl backdrop-blur transition-opacity duration-500",
                showBorder ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>{loadingText}</span>
              {!indeterminate && (
                <span className="tabular-nums text-primary">{scanProgress}%</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action bar: always rendered (fixed height), enabled only when result is ready */}
      <div className="flex h-20 shrink-0 items-center justify-center gap-3 px-4">
        {revealed ? (
          <Button >
            <Link href={resultUrl} target="_blank">
              Download
            </Link>
          </Button>
        ) : (
          <Button disabled>Download</Button>
        )}
        <Button variant="outline" disabled={!revealed} onClick={handleCreateAnother}>
          Create another
        </Button>
      </div>

      {/* Inline error, sits above the action bar */}
      {status === "error" && (
        <div className="absolute inset-x-3 bottom-24 z-10 rounded-xl border border-destructive/30 bg-destructive/10 p-3 backdrop-blur md:inset-x-4">
          <p className="text-sm font-medium text-destructive">Couldn&apos;t upload</p>
          <p
            className="whitespace-pre-wrap text-xs text-destructive/80"
            style={{ overflowWrap: "anywhere" }}
          >
            {error ?? "Upload failed. Please try again."}
          </p>
        </div>
      )}
    </section>
  )
}