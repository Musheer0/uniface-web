"use client"

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react"
import { Check, GripVertical, Loader2, Plus, Trash2, X } from "lucide-react"
import type { BlurMethod } from "@blurfield/js"

import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import { useFileUpload } from "@/features/face/hooks"
import { BlurMethodSelect } from "@/features/generations/components/blur-method-select"
import ChangeFileButton from "@/features/generations/components/change-file-button"
import { FaceSelector } from "@/features/generations/components/face-selector"

type BlurLayer = {
  id: string
  start: number
  end: number
  blurMethod: BlurMethod
}

type DragMode = "start" | "end" | "move"

type DragState = {
  id: string
  mode: DragMode
  startX: number
  originalStart: number
  originalEnd: number
}

const MIN_LENGTH = 0.1
const EPSILON = 0.001

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const tenths = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`
}

/** Free ranges on the timeline, used to place new layers without overlap. */
const getGaps = (layers: BlurLayer[], duration: number) => {
  const sorted = [...layers].sort((a, b) => a.start - b.start)
  const gaps: { start: number; end: number }[] = []
  let cursor = 0
  for (const layer of sorted) {
    if (layer.start - cursor > EPSILON) gaps.push({ start: cursor, end: layer.start })
    cursor = Math.max(cursor, layer.end)
  }
  if (duration - cursor > EPSILON) gaps.push({ start: cursor, end: duration })
  return gaps
}

/** Closest occupied edges on either side of the dragged layer. */
const getNeighborLimits = (
  layers: BlurLayer[],
  drag: DragState,
  duration: number,
) => {
  let left = 0
  let right = duration
  for (const layer of layers) {
    if (layer.id === drag.id) continue
    if (layer.end <= drag.originalStart + EPSILON) left = Math.max(left, layer.end)
    if (layer.start >= drag.originalEnd - EPSILON) right = Math.min(right, layer.start)
  }
  return { left, right }
}

type VideoGenerationUIProps = {
  file: File
  previewUrl: string | null
  clearFile: () => void
  onDone: () => void
}

export function VideoGenerationUI({
  file,
  previewUrl,
  clearFile,
  onDone,
}: VideoGenerationUIProps) {
  const { upload, abort, progress, status, error, isBusy } = useFileUpload()

  const [mediaId, setMediaId] = useState<string | null>(null)
  const [faceId, setFaceId] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [layers, setLayers] = useState<BlurLayer[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const layerCounter = useRef(0)

  const handleCancel = () => {
    abort()
    clearFile()
    onDone()
  }

  const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const videoDuration = event.currentTarget.duration
    if (!Number.isFinite(videoDuration) || videoDuration <= 0) return
    const id = `layer-${++layerCounter.current}`
    setDuration(videoDuration)
    setLayers([{ id, start: 0, end: videoDuration, blurMethod: "blackout" }])
    setActiveLayerId(id)
  }

  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? null

  const updateLayer = (id: string, patch: Partial<BlurLayer>) =>
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)))

  const gaps = getGaps(layers, duration)
  const canAddLayer = gaps.some((gap) => gap.end - gap.start >= MIN_LENGTH)

  const addLayer = () => {
    if (!canAddLayer) return
    // Prefer a 2s segment, otherwise use whatever free space is available.
    const gap =
      gaps.find((candidate) => candidate.end - candidate.start >= Math.min(2, duration)) ??
      gaps.find((candidate) => candidate.end - candidate.start >= MIN_LENGTH)
    if (!gap) return
    const length = Math.min(2, gap.end - gap.start)
    const id = `layer-${++layerCounter.current}`
    setLayers((prev) => [
      ...prev,
      { id, start: gap.start, end: gap.start + length, blurMethod: "blackout" },
    ])
    setActiveLayerId(id)
  }

  const deleteLayer = (id: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== id))
    setActiveLayerId((current) => (current === id ? null : current))
  }

  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    layer: BlurLayer,
    mode: DragMode,
  ) => {
    if (event.button !== 0) return // let right-click open the context menu
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      id: layer.id,
      mode,
      startX: event.clientX,
      originalStart: layer.start,
      originalEnd: layer.end,
    }
  }

  const onDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || !duration || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    if (!rect.width) return
    const delta = ((event.clientX - drag.startX) / rect.width) * duration

    setLayers((prev) => {
      const limits = getNeighborLimits(prev, drag, duration)
      return prev.map((layer) => {
        if (layer.id !== drag.id) return layer
        if (drag.mode === "start") {
          return {
            ...layer,
            start: clamp(
              drag.originalStart + delta,
              limits.left,
              Math.max(limits.left, drag.originalEnd - MIN_LENGTH),
            ),
          }
        }
        if (drag.mode === "end") {
          return {
            ...layer,
            end: clamp(
              drag.originalEnd + delta,
              Math.min(drag.originalStart + MIN_LENGTH, limits.right),
              limits.right,
            ),
          }
        }
        const length = drag.originalEnd - drag.originalStart
        const start = clamp(
          drag.originalStart + delta,
          limits.left,
          Math.max(limits.left, limits.right - length),
        )
        return { ...layer, start, end: start + length }
      })
    })
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  const handleSubmit = async () => {
    if (isBusy) return
    try {
      // Upload only on submit — the returned media id is the generation input.
      const data = await upload(file)
      if (!data) return // cancelled
      const id = (data.media as { id: string }).id
      setMediaId(id)
      console.log({
        face_id: faceId,
        media_id: id,
        layers: layers.map(({ start, end, blurMethod }) => ({
          start,
          end,
          blur_type: blurMethod,
        })),
      })
    } catch {
      // The hook already surfaces the error in `error` / `status`.
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
            : "Ready to submit"

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
      {/* Preview + timeline */}
      <section className="flex min-h-[55vh] w-full flex-col bg-black md:min-h-0 md:flex-1">
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-0! p-4 pt-20 md:p-8 md:pt-24">
          {previewUrl && (
            <video
              src={previewUrl}
              controls
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              className="max-h-full max-w-full rounded-xl"
            />
          )}

          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 md:p-4">
            <div className="min-w-0 pt-1">
              <p className="truncate text-sm font-medium text-white">{file.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
                {status === "presigning" && <Loader2 className="size-3 shrink-0 animate-spin" />}
                {status === "uploading" && <Loader2 className="size-3 shrink-0 animate-spin" />}
                {status === "success" && <Check className="size-3 shrink-0 text-primary" />}
                {statusText}
              </p>
            </div>
            <ChangeFileButton />
          </div>

          {(status === "presigning" || status === "uploading" || status === "success") && (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={status === "presigning" ? undefined : progress}
              className="absolute inset-x-0 top-0 z-20 h-1 bg-white/10"
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
        </div>

        {/* Timeline */}
        <div className="shrink-0 border-t border-white/10 bg-zinc-950 p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">
                Timeline
              </h3>
              <span className="text-[11px] text-zinc-500">
                {layers.length} layer{layers.length === 1 ? "" : "s"}
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!duration || !canAddLayer}
              onClick={addLayer}
              className="h-8 gap-1.5"
            >
              <Plus className="size-3.5" />
              Add blur segment
            </Button>
          </div>

          {/* Ruler */}
          <div className="relative mb-1 h-4 select-none text-[10px] text-zinc-500">
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <span
                key={fraction}
                className={cn(
                  "absolute -translate-x-1/2",
                  fraction === 0 && "translate-x-0",
                  fraction === 1 && "-translate-x-full",
                )}
                style={{ left: `${fraction * 100}%` }}
              >
                {formatTime(duration * fraction)}
              </span>
            ))}
          </div>

          {/* Track */}
          <div
            ref={timelineRef}
            className="relative h-16 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
          >
            {duration === 0 && (
              <p className="flex h-full items-center justify-center text-xs text-zinc-500">
                Loading video…
              </p>
            )}

            {layers.map((layer) => {
              const left = (layer.start / duration) * 100
              const width = ((layer.end - layer.start) / duration) * 100
              const isActive = layer.id === activeLayerId
              return (
                <ContextMenu key={layer.id}>
                  <ContextMenuTrigger
                    render={
                      <div
                        onClick={() => setActiveLayerId(layer.id)}
                        onPointerDown={(event) => startDrag(event, layer, "move")}
                        onPointerMove={onDragMove}
                        onPointerUp={endDrag}
                        className={cn(
                          "absolute inset-y-1 flex cursor-grab items-center justify-between overflow-hidden rounded-md border px-1 text-[11px] touch-none select-none active:cursor-grabbing",
                          isActive
                            ? "border-primary bg-primary/25 ring-2 ring-primary/50"
                            : "border-white/20 bg-white/10 hover:bg-white/15",
                        )}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        <span className="pointer-events-none min-w-0 truncate px-1 tabular-nums text-zinc-100">
                          {formatTime(layer.start)} – {formatTime(layer.end)}
                        </span>

                        <div
                          role="slider"
                          aria-label={`${layer.blurMethod} layer start`}
                          aria-valuemin={0}
                          aria-valuemax={duration}
                          aria-valuenow={layer.start}
                          tabIndex={0}
                          onPointerDown={(event) => startDrag(event, layer, "start")}
                          onPointerMove={onDragMove}
                          onPointerUp={endDrag}
                          className="absolute inset-y-0 left-0 flex w-3 touch-none items-center justify-center bg-primary/60 hover:bg-primary"
                        >
                          <GripVertical className="size-3 text-white" />
                        </div>
                        <div
                          role="slider"
                          aria-label={`${layer.blurMethod} layer end`}
                          aria-valuemin={0}
                          aria-valuemax={duration}
                          aria-valuenow={layer.end}
                          tabIndex={0}
                          onPointerDown={(event) => startDrag(event, layer, "end")}
                          onPointerMove={onDragMove}
                          onPointerUp={endDrag}
                          className="absolute inset-y-0 right-0 flex w-3 touch-none items-center justify-center bg-primary/60 hover:bg-primary"
                        >
                          <GripVertical className="size-3 text-white" />
                        </div>
                      </div>
                    }
                  />
                  <ContextMenuContent>
                    <ContextMenuLabel>
                      {formatTime(layer.start)} – {formatTime(layer.end)} · {layer.blurMethod}
                    </ContextMenuLabel>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => setActiveLayerId(layer.id)}>
                      Select layer
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => deleteLayer(layer.id)}
                    >
                      Delete layer
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
            {layers.length === 0 && (
              <p className="flex h-full items-center justify-center text-xs text-zinc-500">
                No blur layers. Add a blur segment to start.
              </p>
            )}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            Drag a layer to move it, drag its edges to resize, or right-click it for options. Layers
            can&apos;t overlap.
          </p>

          {status === "error" && (
            <p className="mt-2 text-xs text-destructive">
              {error ?? "Upload failed. Please try again."}
            </p>
          )}
        </div>
      </section>

      {/* Controls */}
      <aside className="w-full shrink-0 space-y-6 border-t bg-sidebar p-4 md:w-[340px] md:overflow-y-auto md:border-l md:border-t-0 md:p-5">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Active layer</h2>
          {activeLayer ? (
            <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {formatTime(activeLayer.start)} – {formatTime(activeLayer.end)}
                </span>
                <span className="rounded-md bg-primary/15 px-2 py-0.5 font-medium text-primary capitalize">
                  {activeLayer.blurMethod}
                </span>
              </div>
              <BlurMethodSelect
                value={activeLayer.blurMethod}
                onChange={(value) => updateLayer(activeLayer.id, { blurMethod: value })}
                disabled={isBusy}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => deleteLayer(activeLayer.id)}
              >
                <Trash2 className="size-4" />
                Delete layer
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
              Click a timeline layer to see and change its blur type.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Faces to keep unblurred</h2>
          <FaceSelector value={faceId} onChange={setFaceId} disabled={isBusy} />
          <p className="text-xs text-muted-foreground">
            Optional. Selected faces are excluded from blurring.
          </p>
        </div>

        {status === "error" && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleSubmit}>
              Try again
            </Button>
            <Button type="button" variant="ghost" className="flex-1" onClick={handleCancel}>
              Remove file
            </Button>
          </div>
        )}

        {status === "uploading" && (
          <Button type="button" variant="outline" className="w-full" onClick={handleCancel}>
            <X />
            Cancel upload
          </Button>
        )}

        <div className="space-y-2 border-t pt-4">
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={isBusy || layers.length === 0}
            onClick={handleSubmit}
          >
            {isBusy && <Loader2 className="animate-spin" />}
            {status === "presigning"
              ? "Preparing…"
              : status === "uploading"
                ? `Uploading · ${progress}%`
                : "Submit"}
          </Button>
          {status === "success" && mediaId && (
            <p className="truncate text-center font-mono text-[11px] text-muted-foreground">
              media: {mediaId}
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
