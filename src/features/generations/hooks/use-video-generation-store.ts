import { create } from "zustand"
import type { BlurMethod } from "@blurfield/js"

import {
  clamp,
  getGaps,
  MIN_LENGTH,
  type BlurLayer,
} from "@/features/generations/lib/video-timeline"

/** The uploaded file is shared with the upload flow through the existing file store. */
export { useFileStore } from "@/features/generations/hooks/use-file"

/**
 * Video-session state shared by the preview, timeline, and controls.
 * The uploaded file itself lives in `useFileStore` (see `use-file.ts`).
 */
type VideoGenerationState = {
  faceId: string | null
  blurMethod: BlurMethod
  mediaId: string | null
  duration: number
  currentTime: number
  layers: BlurLayer[]
  activeLayerId: string | null
  zoomIndex: number
  scrollOffset: number

  setFaceId: (faceId: string | null) => void
  setBlurMethod: (blurMethod: BlurMethod) => void
  setMediaId: (mediaId: string | null) => void
  setDuration: (duration: number) => void
  setCurrentTime: (currentTime: number) => void
  setActiveLayerId: (activeLayerId: string | null) => void
  setZoomIndex: (zoomIndex: number) => void
  setScrollOffset: (scrollOffset: number) => void
  setLayers: (layers: BlurLayer[]) => void
  updateLayer: (id: string, patch: Partial<BlurLayer>) => void
  deleteLayer: (id: string) => void
  addLayer: () => string | null
  splitLayer: (id: string, time: number) => string | null
  applyToFullVideo: () => void
  initializeFromDuration: (duration: number) => void
  reset: () => void
}

let layerCounter = 0
const nextLayerId = () => `layer-${++layerCounter}`

const initialState = {
  faceId: null,
  blurMethod: "blackout" as BlurMethod,
  mediaId: null,
  duration: 0,
  currentTime: 0,
  layers: [] as BlurLayer[],
  activeLayerId: null,
  zoomIndex: 0,
  scrollOffset: 0,
}

export const useVideoGenerationStore = create<VideoGenerationState>((set, get) => ({
  ...initialState,

  setFaceId: (faceId) => set({ faceId }),
  setBlurMethod: (blurMethod) => set({ blurMethod }),
  setMediaId: (mediaId) => set({ mediaId }),
  setDuration: (duration) => set({ duration }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setActiveLayerId: (activeLayerId) => set({ activeLayerId }),
  setZoomIndex: (zoomIndex) => set({ zoomIndex }),
  setScrollOffset: (scrollOffset) => set({ scrollOffset }),
  setLayers: (layers) => set({ layers }),

  updateLayer: (id, patch) =>
    set((state) => ({
      layers: state.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    })),

  deleteLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    })),

  addLayer: () => {
    const { layers, duration } = get()
    const gaps = getGaps(layers, duration)
    if (!gaps.some((gap) => gap.end - gap.start >= MIN_LENGTH)) return null

    // Prefer a 2s segment, otherwise use whatever free space is available.
    const gap =
      gaps.find((candidate) => candidate.end - candidate.start >= Math.min(2, duration)) ??
      gaps.find((candidate) => candidate.end - candidate.start >= MIN_LENGTH)
    if (!gap) return null

    const id = nextLayerId()
    set((state) => ({
      layers: [
        ...state.layers,
        {
          id,
          start: gap.start,
          end: gap.start + Math.min(2, gap.end - gap.start),
        },
      ],
      activeLayerId: id,
    }))
    return id
  },

  splitLayer: (id, time) => {
    const { layers } = get()
    const target = layers.find((layer) => layer.id === id)
    if (!target || target.end - target.start < 2 * MIN_LENGTH) return null

    const splitAt = clamp(time, target.start + MIN_LENGTH, target.end - MIN_LENGTH)
    const rightId = nextLayerId()
    set({
      layers: layers.flatMap((layer) =>
        layer.id !== id
          ? [layer]
          : [
              { ...layer, end: splitAt },
              { ...layer, id: rightId, start: splitAt },
            ],
      ),
      activeLayerId: rightId,
    })
    return rightId
  },

  applyToFullVideo: () => {
    const { duration } = get()
    if (!duration) return
    const id = nextLayerId()
    set({ layers: [{ id, start: 0, end: duration }], activeLayerId: id })
  },

  initializeFromDuration: (duration) => {
    const id = nextLayerId()
    set({
      ...initialState,
      duration,
      layers: [{ id, start: 0, end: duration }],
      activeLayerId: id,
    })
  },

  reset: () => set({ ...initialState }),
}))
