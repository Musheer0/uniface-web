import { db } from "@/db/drizzle";
import { generation, media } from "@/db/schema";
import { DOWNLOAD_URL_EXPIRES_IN, GENERATION_CACHE_TTL } from "@/lib/constants";
import { redis } from "@/redis/client";
import { generationKey } from "@/redis/keys";
import { deleteObject } from "@/s3/delete-object";
import { invalidateDownloadUrl } from "@/s3/get-download-url";
import { createTRPCRouter, protectProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt } from "drizzle-orm";
import z from "zod";
import { withMediaUrl } from "../media/router";

type GenerationRow = typeof generation.$inferSelect;

/** Drop the cached DTO for a generation. Never throws. */
export const invalidateGeneration = async (
  userId: string,
  generationId: string,
): Promise<void> => {
  try {
    await redis.del(generationKey(userId, generationId));
  } catch (err) {
    console.error(`[redis] DEL ${generationKey(userId, generationId)} failed`, err);
  }
};

/**
 * Public shape for a generation. Only the **output** media is fetched and
 * its `object_key` is replaced with a presigned `url` (valid for 1 day,
 * cached in Redis) — raw object keys are never exposed to the client.
 */
const toGenerationDTO = async (
  generationRow: GenerationRow,
  userId: string,
) => {
  const { output_object_key: _outputObjectKey, ...rest } = generationRow;
  let output: Awaited<ReturnType<typeof withMediaUrl>> | null = null;
  if (generationRow.output_media_id) {
    const rows = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.id, generationRow.output_media_id),
          eq(media.user_id, userId),
        ),
      )
      .limit(1);
    if (rows[0]) output = await withMediaUrl(rows[0]);
  }
  return {
    ...rest,
    output,
    urlExpiresIn: DOWNLOAD_URL_EXPIRES_IN,
  };
};

export const GenerationRouters = createTRPCRouter({
  /**
   * Cursor-based list of the current user's generations, newest first.
   * `cursor` is the last seen generation `id`; `nextCursor` is null at
   * the end. Each item carries its output media `url` (null until ready).
   */
  getAll: protectProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await db
        .select()
        .from(generation)
        .where(
          input.cursor
            ? and(eq(generation.user_id, userId), lt(generation.id, input.cursor))
            : eq(generation.user_id, userId),
        )
        .orderBy(desc(generation.id))
        .limit(input.limit + 1);
      const hasMore = rows.length > input.limit;
      const page = hasMore ? rows.slice(0, -1) : rows;
      const items = await Promise.all(
        page.map((row) => toGenerationDTO(row, userId)),
      );
      return {
        items,
        nextCursor: hasMore ? page[page.length - 1].id : null,
      };
    }),

  /** Single generation by id (owner only), with its output media `url`. */
  getById: protectProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const cacheKey = generationKey(userId, input.id);
      try {
        const cached = await redis.get<Awaited<ReturnType<typeof toGenerationDTO>>>(cacheKey);
        if (cached) return cached;
      } catch (err) {
        // Cache is best-effort — fall through to the database on Redis errors.
        console.error(`[redis] GET ${cacheKey} failed`, err);
      }
      const rows = await db
        .select()
        .from(generation)
        .where(and(eq(generation.id, input.id), eq(generation.user_id, userId)))
        .limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Generation not found" });
      const dto = await toGenerationDTO(row, userId);
      try {
        await redis.set(cacheKey, dto, { ex: GENERATION_CACHE_TTL });
      } catch (err) {
        console.error(`[redis] SET ${cacheKey} failed`, err);
      }
      return dto;
    }),

  /**
   * Delete a generation (owner only) along with its output artifacts: the
   * output S3 object, its cached URL, and the output media row. The input
   * media is left untouched since it lives in the user's library.
   */
  deleteGeneration: protectProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await db
        .select()
        .from(generation)
        .where(and(eq(generation.id, input.id), eq(generation.user_id, userId)))
        .limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Generation not found" });

      let deletedOutputMedia = false;
      if (row.output_media_id) {
        const outputRows = await db
          .select()
          .from(media)
          .where(and(eq(media.id, row.output_media_id), eq(media.user_id, userId)))
          .limit(1);
        const output = outputRows[0];
        if (output) {
          try {
            await deleteObject(output.object_key);
          } catch {
            console.error("Error deleting", output.object_key);
          }
          await invalidateDownloadUrl(output.object_key);
          await db
            .delete(media)
            .where(and(eq(media.id, output.id), eq(media.user_id, userId)));
          deletedOutputMedia = true;
        }
      }

      await db
        .delete(generation)
        .where(and(eq(generation.id, row.id), eq(generation.user_id, userId)));

      // Drop the cached DTO so it can never be served again.
      await invalidateGeneration(userId, row.id);

      return { deletedGeneration: true, deletedOutputMedia };
    }),
})
