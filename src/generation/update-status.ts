import "server-only";
import { db } from "@/db/drizzle";
import { generation } from "@/db/schema";
import { redis } from "@/redis/client";
import { generationKey } from "@/redis/keys";
import { eq } from "drizzle-orm";

export type GenerationStatus = typeof generation.$inferInsert.status;
export type GenerationStatusUpdate = {
  status: NonNullable<GenerationStatus>;
  /** Set on failure (cleared automatically on non-failed statuses). */
  failure_reason?: string | null;
  /** Milliseconds the job took (set when finishing). */
  time_take?: number | null;
  /** Output media row id + object key, set when the result is ready. */
  output_media_id?: string | null;
  output_object_key?: string | null;
  credits_consumed?: number | null;
};

/**
 * Internal server-only status updater for generations. No auth, no tRPC —
 * import it from workers, webhooks, or any backend code:
 *
 *   import { updateGenerationStatus } from "@/generation/update-status";
 *   await updateGenerationStatus(id, { status: "COMPLETED", time_take: 4200 });
 *
 * Returns the updated row, or `null` when the id does not exist.
 */
export const updateGenerationStatus = async (
  id: string,
  update: GenerationStatusUpdate,
) => {
  const { status, failure_reason, time_take, output_media_id, output_object_key, credits_consumed } =
    update;
  const patch: Partial<typeof generation.$inferInsert> = { status };
  if (failure_reason !== undefined) patch.failure_reason = failure_reason;
  else if (status !== "FAILED") patch.failure_reason = null;
  if (time_take !== undefined) patch.time_take = time_take;
  if (output_media_id !== undefined) patch.output_media_id = output_media_id;
  if (output_object_key !== undefined) patch.output_object_key = output_object_key;
  if (credits_consumed !== undefined) patch.credits_consumed = credits_consumed;

  const rows = await db
    .update(generation)
    .set(patch)
    .where(eq(generation.id, id))
    .returning();
  const updated = rows[0] ?? null;
  if (updated) {
    // Writes must bust the cached getById DTO or polling clients go stale.
    try {
      await redis.del(generationKey(updated.user_id, updated.id));
    } catch (err) {
      console.error(`[redis] DEL for generation ${updated.id} failed`, err);
    }
  }
  return updated;
};
