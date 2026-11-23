import type { GenerationDTO } from "../hooks"

export const STATUS_LABELS: Record<GenerationDTO["status"], string> = {
  PENDING: "Queued",
  STARTED: "Processing",
  FAILED: "Failed",
  COMPLETED: "Completed",
}

export const STATUS_VARIANTS: Record<
  GenerationDTO["status"],
  "secondary" | "default" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  STARTED: "default",
  FAILED: "destructive",
  COMPLETED: "outline",
}

export function formatDuration(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}
