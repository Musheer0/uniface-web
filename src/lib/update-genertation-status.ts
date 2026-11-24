"use client";

import { useEffect, useState } from "react";
import type { generation } from "@/db/schema";

/** Kept in sync with the `generation_status` pg enum in the schema. */
export type GenerationStatus = NonNullable<
  typeof generation.$inferInsert.status
>;

/** Public shape of the finished output media (no raw object key). */
export type GenerationOutputResult = {
  id: string;
  name: string;
  type: string | null;
  size: number | null;
  /** Presigned GET URL, safe to use for preview and download. */
  url: string;
  urlExpiresIn: number;
};

/** Response returned by `/api/generation/[id]/status`. */
export type GenerationStatusResponse = {
  status: GenerationStatus | null;
  failure_reason: string | null;
  is_video: boolean;
  /** Only populated once the generation is COMPLETED. */
  output: GenerationOutputResult | null;
};

const DEFAULT_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 5 * 60_000;

export type PollGenerationStatusOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Called on every poll, including the final terminal response. */
  onUpdate?: (data: GenerationStatusResponse) => void;
};

const isTerminal = (status: GenerationStatus | null) =>
  status === "COMPLETED" || status === "FAILED";

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });

/**
 * Poll the public status endpoint until the generation reaches COMPLETED or
 * FAILED. The final response carries the output media, so callers can preview
 * and download it without a second request.
 */
export async function pollGenerationStatus(
  generationId: string,
  {
    intervalMs = DEFAULT_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    onUpdate,
  }: PollGenerationStatusOptions = {},
): Promise<GenerationStatusResponse> {
  const deadline = Date.now() + timeoutMs;

  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const res = await fetch(
      `/api/generation/${encodeURIComponent(generationId)}/status`,
      { cache: "no-store", signal },
    );

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? `Status request failed (${res.status})`);
    }

    const data = (await res.json()) as GenerationStatusResponse;
    onUpdate?.(data);

    if (isTerminal(data.status)) return data;
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for the generation to finish");
    }
    await wait(intervalMs, signal);
  }
}

export type UseGenerationStatusPollResult = {
  data: GenerationStatusResponse | null;
  error: string | null;
  isPolling: boolean;
};

/** React wrapper around {@link pollGenerationStatus} for the status page. */
export function useGenerationStatusPoll(
  generationId: string,
  options: Pick<PollGenerationStatusOptions, "intervalMs" | "timeoutMs"> = {},
): UseGenerationStatusPollResult {
  const [data, setData] = useState<GenerationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(Boolean(generationId));
  const { intervalMs, timeoutMs } = options;

  useEffect(() => {
    if (!generationId) return;

    const controller = new AbortController();
    let active = true;

    void pollGenerationStatus(generationId, {
      intervalMs,
      timeoutMs,
      signal: controller.signal,
      onUpdate: (next) => {
        if (active) setData(next);
      },
    })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Couldn't check generation status",
        );
      })
      .finally(() => {
        if (active) setIsPolling(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [generationId, intervalMs, timeoutMs]);

  return { data, error, isPolling };
}
