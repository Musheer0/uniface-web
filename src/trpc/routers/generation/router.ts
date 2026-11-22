import { db } from "@/db/drizzle";
import { face,  generation, media } from "@/db/schema";
import { blur_methods } from "@/lib/backend-client";
import { DOWNLOAD_URL_EXPIRES_IN, GENERATION_CACHE_TTL } from "@/lib/constants";
import { redis } from "@/redis/client";
import { generationKey } from "@/redis/keys";
import { deleteObject } from "@/s3/delete-object";
import { getDownloadUrl, invalidateDownloadUrl } from "@/s3/get-download-url";
import { createTRPCRouter, internalProcedure, protectProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt } from "drizzle-orm";
import z from "zod";
import { withMediaUrl } from "../media/router";
import { blurImage } from "@/features/generations/actions/blur-image";
import { getKey } from "@/lib/get-key";
import { inngest } from "@/inngest/client";
import {  blurVideoSchema } from "@/inngest/blur-video.function";
import { TimestampRangesSchema, blurVideoTimestampSchema } from "@/inngest/blur-video-timeastamp.function";

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
   * Create an image generation record from an uploaded media id.
   * The blur job itself isn't dispatched yet — for now we just log the ids.
   */
 
generated_img: protectProcedure
  .input(
    z.object({
      media_id: z.string().min(1),
      face_id: z.string().nullish(),
      blur_id: z.enum(blur_methods),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // 1. Validate input media ownership
    const [inputMedia] = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.id, input.media_id),
          eq(media.user_id, userId)
        )
      )
      .limit(1);

    if (!inputMedia) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Media not found",
      });
    }

    if (!inputMedia.object_key || !inputMedia.type?.startsWith("image/")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid image file",
      });
    }

    // 2. Validate optional face
    let faceKey: string | undefined;

    if (input.face_id) {
      const [userFace] = await db
        .select({
          id: face.id,
          object_key: face.object_key,
        })
        .from(face)
        .where(
          and(
            eq(face.id, input.face_id),
            eq(face.user_id, userId)
          )
        )
        .limit(1);

      if (!userFace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Face not found",
        });
      }

      faceKey = userFace.object_key;
    }

    const outputFileName = `blurred-${inputMedia.name}`;

    // 3. Create generation and output media atomically
    const job = await db.transaction(async (tx) => {
      const [outputMedia] = await tx
        .insert(media)
        .values({
          name: outputFileName,
          object_key: "pending",
          user_id: userId,
          size: inputMedia.size,
          type: inputMedia.type,
          uploaded_type: "GENERATED",
        })
        .returning();

      const outputKey = getKey({
        file_name: outputFileName,
        userId,
        media_id: outputMedia.id,
        upload_type: "generation",
      });

      await tx
        .update(media)
        .set({ object_key: outputKey })
        .where(eq(media.id, outputMedia.id));

      const [generationJob] = await tx
        .insert(generation)
        .values({
          user_id: userId,
          blur_type: input.blur_id,
          face_id: input.face_id ?? null,
          input_media_id: inputMedia.id,
          is_video: false,
          output_media_id: outputMedia.id,
          output_object_key: outputKey,
        })
        .returning();

      return {
        ...generationJob,
        outputKey,
        outputMediaId: outputMedia.id,
      };
    });

    // 4. Mark generation as started
    await db
      .update(generation)
      .set({ status: "STARTED" })
      .where(eq(generation.id, job.id));

    try {
      // 5. Process image
      const generationResponse = await blurImage({
        blurMethod: input.blur_id,
        generationId: job.id,
        inputKey: inputMedia.object_key,
        outputKey: job.outputKey,
        user_id: userId,
        // Pass faceKey here if your blurImage API supports it.
      });

      // 6. Mark generation completed
      await db
        .update(generation)
        .set({
          status: "COMPLETED",
          output_object_key: job.outputKey,
        })
        .where(eq(generation.id, job.id));

      // 7. Generate download URL
      const media_url = await getDownloadUrl(job.outputKey);

      return {
        id: job.id,
        status: "COMPLETED" as const,
        output_media_id: job.outputMediaId,
        output_object_key: job.outputKey,
        media_url,
      };
    } catch (error) {
      console.error("[generated-img] Image processing failed:", error);

      await db
        .update(generation)
        .set({
          status: "FAILED",
          failure_reason:
            error instanceof Error
              ? error.message
              : "Image processing failed",
        })
        .where(eq(generation.id, job.id));

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Image generation failed",
      });
    }
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
            console.error("Error deleting outuput", output.object_key);
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

  generate_video: protectProcedure
  .input(
    z.object({
      media_id: z.string().min(1),
      face_id: z.string().nullish(),
      blur_id: z.enum(blur_methods),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // 1. Validate source media
    const [userMedia] = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.id, input.media_id),
          eq(media.user_id, userId)
        )
      )
      .limit(1);

    if (!userMedia) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Video not found",
      });
    }

    if (!userMedia.object_key || !userMedia.type?.includes("video/")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid video file",
      });
    }

    // 2. Validate optional face
    let faceKey: string | undefined;

    if (input.face_id) {
      const [filterFace] = await db
        .select({ object_key: face.object_key })
        .from(face)
        .where(
          and(
            eq(face.id, input.face_id),
            eq(face.user_id, userId)
          )
        )
        .limit(1);

      if (!filterFace?.object_key) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Face not found or invalid face ID",
        });
      }

      faceKey = filterFace.object_key;
    }

    const outputFileName = `blurred-${userMedia.name}`;

    // 3. Create output media and generation atomically
    const job = await db.transaction(async (tx) => {
      const [outputMedia] = await tx
        .insert(media)
        .values({
          user_id: userId,
          name: outputFileName,
          type: userMedia.type,
          object_key: "pending",
          uploaded_type: "GENERATED",
          size:userMedia.size
        })
        .returning({ id: media.id });

      const outputKey = getKey({
        file_name: outputFileName,
        media_id: outputMedia.id,
        upload_type: "generation",
        userId,
      });

      await tx
        .update(media)
        .set({ object_key: outputKey })
        .where(eq(media.id, outputMedia.id));

      const [generationJob] = await tx
        .insert(generation)
        .values({
          blur_type: input.blur_id,
          input_media_id: userMedia.id,
          user_id: userId,
          is_video: true,
          output_media_id: outputMedia.id,
          output_object_key: outputKey,
        })
        .returning();

      return {
        ...generationJob,
        outputKey,
      };
    });

    // 4. Dispatch Inngest event
    const event = blurVideoSchema.parse({
      generation_id: job.id,
      output_video_key: job.outputKey,
      user_id: userId,
      video_key: userMedia.object_key,
      ...(faceKey && { face_key: faceKey }),
    });

    await inngest.send({
      name: "blur-video",
      data: event,
    });

    return { jobId: job.id };
  }),
 generate_video_timestamped: protectProcedure
  .input(
    z.object({
      media_id: z.string().min(1),
      face_id: z.string().nullish(),
      blur_id: z.enum(blur_methods),
      time_stamps: TimestampRangesSchema,
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // 1. Validate source media
    const [userMedia] = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.id, input.media_id),
          eq(media.user_id, userId)
        )
      )
      .limit(1);

    if (!userMedia) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Video not found",
      });
    }

    if (!userMedia.object_key || !userMedia.type?.includes("video/")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid video file",
      });
    }

    // 2. Validate optional face
    let faceKey: string | undefined;

    if (input.face_id) {
      const [filterFace] = await db
        .select({ object_key: face.object_key })
        .from(face)
        .where(
          and(
            eq(face.id, input.face_id),
            eq(face.user_id, userId)
          )
        )
        .limit(1);

      if (!filterFace?.object_key) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Face not found or invalid face ID",
        });
      }

      faceKey = filterFace.object_key;
    }

    const outputFileName = `blurred-${userMedia.name}`;

    // 3. Create output media and generation atomically
    const job = await db.transaction(async (tx) => {
      const [outputMedia] = await tx
        .insert(media)
        .values({
          user_id: userId,
          name: outputFileName,
          type: userMedia.type,
          object_key: "pending",
          uploaded_type: "GENERATED",
          size: userMedia.size,
        })
        .returning({ id: media.id });

      if (!outputMedia) {
        throw new Error("Failed to create output media");
      }

      const outputKey = getKey({
        file_name: outputFileName,
        media_id: outputMedia.id,
        upload_type: "generation",
        userId,
      });

      await tx
        .update(media)
        .set({ object_key: outputKey })
        .where(eq(media.id, outputMedia.id));

      const [generationJob] = await tx
        .insert(generation)
        .values({
          blur_type: input.blur_id,
          face_id: input.face_id ?? null,
          input_media_id: userMedia.id,
          user_id: userId,
          is_video: true,
          output_media_id: outputMedia.id,
          output_object_key: outputKey,
        })
        .returning();

      if (!generationJob) {
        throw new Error("Failed to create generation");
      }

      return {
        ...generationJob,
        outputKey,
      };
    });

    // 4. Validate and dispatch Inngest event
    const event = blurVideoTimestampSchema.parse({
      generation_id: job.id,
      output_video_key: job.outputKey,
      user_id: userId,
      video_key: userMedia.object_key,
      ...(faceKey && { face_key: faceKey }),
      timestamps: input.time_stamps,
    });

    await inngest.send({
      name: "blur-video-timestamps",
      data: event,
    });

    return { jobId: job.id };
  })

 })
