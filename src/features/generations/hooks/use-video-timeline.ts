"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SyntheticEvent,
} from "react"
import { useShallow } from "zustand/react/shallow"

import {
  canSplitLayer as isSplittable,
  clamp,
  getGaps,
  getNeighborLimits,
  getTickIntervals,
  getVisibleTicks,
  MIN_LENGTH,
  ZOOM_LEVELS,
  type BlurLayer,
  type DragMode,
  type DragState,
} from "@/features/generations/lib/video-timeline"
import { useVideoGenerationStore } from "@/features/generations/hooks/use-video-generation-store"

type Options = {
  isBusy?: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  timelineRef: RefObject<HTMLDivElement | null>
  scrollRef: RefObject<HTMLDivElement | null>
}

/** Controller for the editor: refs, playback loop, geometry, and pointer interactions. */
export function useVideoTimeline({ isBusy = false, videoRef, timelineRef, scrollRef }: Options) {
  const duration = useVideoGenerationStore((state) => state.duration)
  const currentTime = useVideoGenerationStore((state) => state.currentTime)
  const layers = useVideoGenerationStore((state) => state.layers)
  const activeLayerId = useVideoGenerationStore((state) => state.activeLayerId)
  const zoomIndex = useVideoGenerationStore((state) => state.zoomIndex)
  const scrollOffset = useVideoGenerationStore((state) => state.scrollOffset)

  const {
    setCurrentTime,
    setZoomIndex,
    setScrollOffset,
    setActiveLayerId,
    initializeFromDuration,
    addLayer,
    deleteLayer,
    updateLayer,
    splitLayer,
    applyToFullVideo,
  } = useVideoGenerationStore(
    useShallow((state) => ({
      setCurrentTime: state.setCurrentTime,
      setZoomIndex: state.setZoomIndex,
      setScrollOffset: state.setScrollOffset,
      setActiveLayerId: state.setActiveLayerId,
      initializeFromDuration: state.initializeFromDuration,
      addLayer: state.addLayer,
      deleteLayer: state.deleteLayer,
      updateLayer: state.updateLayer,
      splitLayer: state.splitLayer,
      applyToFullVideo: state.applyToFullVideo,
    })),
  )

  const [viewportWidth, setViewportWidth] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const dragRef = useRef<DragState | null>(null)
  const scrubbingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const currentTimeRef = useRef(0)
  const zoomIndexRef = useRef(0)
  const ppsRef = useRef(1)
  const pendingScrollRef = useRef<{ anchorTime: number } | null>(null)
  const wheelDeltaRef = useRef(0)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ distance: number; zoomIndex: number } | null>(null)
  const panRef = useRef<{ x: number; scrollLeft: number } | null>(null)

  const updateCurrentTime = (time: number) => {
    currentTimeRef.current = time
    setCurrentTime(time)
  }

  const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const videoDuration = event.currentTarget.duration
    if (!Number.isFinite(videoDuration) || videoDuration <= 0) return
    initializeFromDuration(videoDuration)
    updateCurrentTime(0)
    zoomIndexRef.current = 0
    pendingScrollRef.current = null
    if (scrollRef.current) scrollRef.current.scrollLeft = 0
  }

  const fitPps = duration > 0 && viewportWidth > 0 ? viewportWidth / duration : 1
  const pixelsPerSecond = fitPps * ZOOM_LEVELS[zoomIndex]
  const contentWidth = Math.max(viewportWidth, duration * pixelsPerSecond, 1)
  const { major: majorTick, minor: minorTick } = getTickIntervals(pixelsPerSecond)

  const ticks = useMemo(
    () =>
      getVisibleTicks({
        duration,
        pixelsPerSecond,
        scrollOffset,
        viewportWidth,
        minorTick,
        majorTick,
      }),
    [duration, majorTick, minorTick, pixelsPerSecond, scrollOffset, viewportWidth],
  )

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const measure = () => setViewportWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [scrollRef, setViewportWidth])

  useEffect(() => {
    const pending = pendingScrollRef.current
    const element = scrollRef.current
    if (!pending || !element) return
    pendingScrollRef.current = null
    element.scrollLeft = pending.anchorTime * pixelsPerSecond - element.clientWidth / 2
  }, [pixelsPerSecond, scrollRef])

  useEffect(() => {
    ppsRef.current = pixelsPerSecond
    zoomIndexRef.current = zoomIndex
  }, [pixelsPerSecond, zoomIndex])

  const changeZoom = useCallback(
    (nextIndex: number, anchorTime?: number) => {
      const clamped = clamp(Math.round(nextIndex), 0, ZOOM_LEVELS.length - 1)
      if (clamped === zoomIndexRef.current) return
      zoomIndexRef.current = clamped
      pendingScrollRef.current = { anchorTime: anchorTime ?? currentTimeRef.current }
      setZoomIndex(clamped)
    },
    [setZoomIndex],
  )

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()

      // Shift+wheel or a horizontal trackpad swipe pans the zoomed timeline.
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        element.scrollLeft += event.deltaX || event.deltaY
        wheelDeltaRef.current = 0
        return
      }

      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1
      wheelDeltaRef.current += event.deltaY * unit

      const step = 40 // smooth trackpad scrolling still produces discrete zoom levels
      if (Math.abs(wheelDeltaRef.current) < step) return
      const steps = Math.trunc(wheelDeltaRef.current / step)
      wheelDeltaRef.current -= steps * step

      const content = timelineRef.current
      const anchorTime = content
        ? clamp(
            (event.clientX - content.getBoundingClientRect().left) / pixelsPerSecond,
            0,
            duration,
          )
        : currentTimeRef.current
      changeZoom(zoomIndexRef.current - steps, anchorTime)
    }
    element.addEventListener("wheel", onWheel, { passive: false })
    return () => element.removeEventListener("wheel", onWheel)
  }, [changeZoom, duration, pixelsPerSecond, scrollRef, timelineRef])

  const stopPlayheadLoop = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  const playheadLoop = () => {
    const video = videoRef.current
    if (!video) return
    updateCurrentTime(video.currentTime)
    const element = scrollRef.current
    if (element) {
      const x = video.currentTime * ppsRef.current
      if (x > element.scrollLeft + element.clientWidth - 48) {
        element.scrollLeft = x - element.clientWidth + 48
      } else if (x < element.scrollLeft + 48) {
        element.scrollLeft = Math.max(0, x - 48)
      }
    }
    rafRef.current = requestAnimationFrame(playheadLoop)
  }

  useEffect(() => () => stopPlayheadLoop(), [])

  const handlePlay = () => {
    stopPlayheadLoop()
    setIsPlaying(true)
    rafRef.current = requestAnimationFrame(playheadLoop)
  }

  const handlePause = () => {
    stopPlayheadLoop()
    setIsPlaying(false)
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
  }

  const handleTimeUpdate = () => updateCurrentTime(videoRef.current?.currentTime ?? 0)

  const seekTo = (time: number) => {
    const video = videoRef.current
    if (!video || !duration) return
    const clamped = clamp(time, 0, duration)
    video.currentTime = clamped
    updateCurrentTime(clamped)
  }

  const timeFromClientX = (clientX: number) => {
    const content = timelineRef.current
    if (!content) return 0
    return clamp((clientX - content.getBoundingClientRect().left) / pixelsPerSecond, 0, duration)
  }

  const startScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pinchRef.current || pointersRef.current.size > 1) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)

    // On touch, a single finger pans the zoomed timeline; pinching zooms.
    if (event.pointerType === "touch") {
      panRef.current = { x: event.clientX, scrollLeft: scrollRef.current?.scrollLeft ?? 0 }
      return
    }

    scrubbingRef.current = true
    seekTo(timeFromClientX(event.clientX))
  }

  const moveScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft = panRef.current.scrollLeft - (event.clientX - panRef.current.x)
      return
    }
    if (scrubbingRef.current) seekTo(timeFromClientX(event.clientX))
  }

  const endScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    scrubbingRef.current = false
    panRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  // Capture phase runs before ruler/track handlers, so a second finger starts a pinch, not a scrub.
  const onPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size < 2) return
    const [a, b] = Array.from(pointersRef.current.values())
    pinchRef.current = {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      zoomIndex: zoomIndexRef.current,
    }
    scrubbingRef.current = false
    panRef.current = null
    dragRef.current = null
  }

  const onPointerMoveCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const pinch = pinchRef.current
    if (!pinch || pointersRef.current.size < 2 || !pinch.distance) return

    const [a, b] = Array.from(pointersRef.current.values())
    const distance = Math.hypot(a.x - b.x, a.y - b.y)
    const next = clamp(
      Math.round(pinch.zoomIndex * (distance / pinch.distance)),
      0,
      ZOOM_LEVELS.length - 1,
    )
    if (next === zoomIndexRef.current) return

    const content = timelineRef.current
    const midX = (a.x + b.x) / 2
    pendingScrollRef.current = {
      anchorTime: content
        ? clamp((midX - content.getBoundingClientRect().left) / pixelsPerSecond, 0, duration)
        : currentTimeRef.current,
    }
    zoomIndexRef.current = next
    setZoomIndex(next)
  }

  const onPointerEndCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) {
      panRef.current = null
      scrubbingRef.current = false
    }
  }

  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? null

  const canSplit = (layer: BlurLayer) => !isBusy && isSplittable(layer, currentTime)

  const splitTarget =
    layers.find((layer) => layer.id === activeLayerId && canSplit(layer)) ??
    layers.find(canSplit) ??
    null

  const splitAtPlayhead = () => {
    if (splitTarget) splitLayer(splitTarget.id, currentTime)
  }

  const splitShortcutRef = useRef<() => void>(() => {})

  useEffect(() => {
    splitShortcutRef.current = splitAtPlayhead
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "s" || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return
      splitShortcutRef.current()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const gaps = getGaps(layers, duration)
  const canAddLayer = gaps.some((gap) => gap.end - gap.start >= MIN_LENGTH)

  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    layer: BlurLayer,
    mode: DragMode,
  ) => {
    if (pinchRef.current || pointersRef.current.size > 1) return
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
    if (!drag || !duration) return
    const delta = (event.clientX - drag.startX) / pixelsPerSecond

    useVideoGenerationStore.setState((state) => {
      const limits = getNeighborLimits(state.layers, drag, duration)
      return {
        layers: state.layers.map((layer) => {
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
        }),
      }
    })
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  return {
    // video state
    duration,
    currentTime,
    handleLoadedMetadata,
    handlePlay,
    handlePause,
    handleEnded: handlePause,
    handleTimeUpdate,
    isPlaying,
    togglePlay,
    // layers
    layers,
    activeLayerId,
    activeLayer,
    setActiveLayerId,
    updateLayer,
    deleteLayer,
    addLayer,
    canAddLayer,
    splitLayer,
    splitAtPlayhead,
    canSplit,
    splitTarget,
    applyToFullVideo,
    // timeline geometry + view
    pixelsPerSecond,
    contentWidth,
    zoomIndex,
    zoom: ZOOM_LEVELS[zoomIndex],
    changeZoom,
    setScrollOffset,
    ticks,
    majorTick,
    // interactions
    startScrub,
    moveScrub,
    endScrub,
    onPointerDownCapture,
    onPointerMoveCapture,
    onPointerUpCapture: onPointerEndCapture,
    onPointerCancelCapture: onPointerEndCapture,
    startDrag,
    onDragMove,
    endDrag,
  }
}

export type VideoTimeline = ReturnType<typeof useVideoTimeline>
