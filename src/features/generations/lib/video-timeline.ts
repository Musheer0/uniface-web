/** A time segment to blur. The blur method is global for the whole video. */
export type BlurLayer = {
  id: string
  start: number
  end: number
}

export type DragMode = "start" | "end" | "move"

export type DragState = {
  id: string
  mode: DragMode
  startX: number
  originalStart: number
  originalEnd: number
}

export const MIN_LENGTH = 0.1
export const EPSILON = 0.001
export const ZOOM_LEVELS = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32]

const TICK_INTERVALS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const tenths = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`
}

/** Tick spacing that stays readable at any zoom level. */
export const getTickIntervals = (pixelsPerSecond: number) => {
  const major =
    TICK_INTERVALS.find((interval) => interval * pixelsPerSecond >= 72) ??
    TICK_INTERVALS[TICK_INTERVALS.length - 1]
  const minor = TICK_INTERVALS.find((interval) => interval * pixelsPerSecond >= 28) ?? major
  return { major, minor }
}

/** Free ranges on the timeline, used to place new layers without overlap. */
export const getGaps = (layers: BlurLayer[], duration: number) => {
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
export const getNeighborLimits = (layers: BlurLayer[], drag: DragState, duration: number) => {
  let left = 0
  let right = duration
  for (const layer of layers) {
    if (layer.id === drag.id) continue
    if (layer.end <= drag.originalStart + EPSILON) left = Math.max(left, layer.end)
    if (layer.start >= drag.originalEnd - EPSILON) right = Math.min(right, layer.start)
  }
  return { left, right }
}

type VisibleTicksArgs = {
  duration: number
  pixelsPerSecond: number
  scrollOffset: number
  viewportWidth: number
  minorTick: number
  majorTick: number
}

/** Only build ticks inside the visible part of a zoomed timeline. */
export const getVisibleTicks = ({
  duration,
  pixelsPerSecond,
  scrollOffset,
  viewportWidth,
  minorTick,
  majorTick,
}: VisibleTicksArgs) => {
  const empty = { minor: [] as number[], major: [] as number[] }
  if (!duration || !viewportWidth || !Number.isFinite(duration)) return empty

  const visibleStart = scrollOffset / pixelsPerSecond
  const visibleEnd = (scrollOffset + viewportWidth) / pixelsPerSecond
  const build = (interval: number) => {
    const first = Math.max(0, Math.floor(visibleStart / interval))
    const last = Math.min(Math.floor(duration / interval), Math.ceil(visibleEnd / interval))
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) =>
      Number(((first + index) * interval).toFixed(3)),
    )
  }
  return { minor: build(minorTick), major: build(majorTick) }
}

export const canSplitLayer = (layer: BlurLayer, currentTime: number) =>
  currentTime - layer.start >= MIN_LENGTH && layer.end - currentTime >= MIN_LENGTH
