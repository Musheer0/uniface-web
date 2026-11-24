import "server-only";
import { redis } from "@/redis/client";
import { generationStatus } from "@/redis/keys";
import { generation_status } from "@/db/schema";

export type GenerationStatus = (typeof generation_status.enumValues)[number];

/** Cache a generation's status so public status pollers can read it cheaply. */
export async function updateGenerationStatusCache(
  generationId: string,
  status: GenerationStatus,
) {
  await redis.set(generationStatus(generationId), status, {
    ex: 60 * 60, // 1 hour TTL
  });
}
