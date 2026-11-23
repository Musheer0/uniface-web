"use client"

import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  CircleCheck,
  Clock3,
  Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useGenerationById, type GenerationDTO } from "../hooks"
import { STATUS_LABELS, STATUS_VARIANTS } from "../lib/generation-format"

function StatusIcon({ status }: { status: GenerationDTO["status"] }) {
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

/** Static snapshot of a generation's status — no polling or auto-refresh. */
export const GenerationStatus = ({ id }: { id: string }) => {
  // No refetchInterval: refreshing/status updates are handled elsewhere.
  const { data, isPending, isError } = useGenerationById(id)

  const message = !data
    ? ""
    : data.status === "FAILED"
      ? (data.failure_reason ?? "Something went wrong while generating.")
      : data.status === "COMPLETED"
        ? "Your generation is ready."
        : data.status === "STARTED"
          ? "Your generation is being processed."
          : "Your generation is queued and will start soon."

  return (
    <div className="space-y-4">
      <Button render={<Link href="/generations" />} variant="ghost" size="sm">
        <ArrowLeft />
        Back to generations
      </Button>

      {isPending ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : isError || !data ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-12 text-center"
        >
          <p className="text-sm font-medium text-destructive">
            Couldn&apos;t load the generation status.
          </p>
          <p className="mt-1 break-all text-xs text-muted-foreground">ID {id}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border px-4 py-12 text-center">
          <StatusIcon status={data.status} />
          <Badge variant={STATUS_VARIANTS[data.status]}>
            {STATUS_LABELS[data.status]}
          </Badge>
          <p className="text-sm text-muted-foreground">{message}</p>
          <p className="break-all text-xs text-muted-foreground">
            ID {data.id}
          </p>
        </div>
      )}
    </div>
  )
}
