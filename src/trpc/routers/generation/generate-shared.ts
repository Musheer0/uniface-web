import { db } from "@/db/drizzle";
import { face, generation, media } from "@/db/schema";
import { blur_methods } from "@/lib/backend-client";
import { getKey } from "@/lib/get-key";
import { redis } from "@/redis/client";
import { generationKey } from "@/redis/keys";
import { deleteObject } from "@/s3/delete-object";
import { invalidateDownloadUrl } from "@/s3/get-download-url";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";

type GenerationRow = typeof generation.$inferSelect;

/** Shared input for every generation mutation. */
export const generationInputSchema = z.object({
  media_id: z.string().min(1),
  face_id: z.string().nullish(),
  blur_id: z.enum(blur_methods),
});

/** A job returned by `createGenerationJob`, with its output artifacts. */
export type GenerationJob = GenerationRow & {
  outputKey: string;
  outputMediaId: string;
};

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
 * Fetch a media row owned by the user, or throw. `kind` keeps the existing
 * per-endpoint error messages (image vs video) intact.
 */
export const findOwnedMedia = async (params: {
  mediaId: string;
  userId: string;
  kind: "image" | "video";
}) => {
  const { mediaId, userId, kind } = params;
  const [row] = await db
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.user_id, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: kind === "image" ? "Media not found" : "Video not found",
    });
  }

  const validType =
    kind === "image"
      ? row.type?.startsWith("image/")
      : row.type?.includes("video/");
  if (!row.object_key || !validType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: kind === "image" ? "Invalid image file" : "Invalid video file",
    });
  }

  return row;
};

/** Resolve an optional face to its S3 key, scoped to the user. */
export const findOwnedFaceKey = async (params: {
  faceId: string | null | undefined;
  userId: string;
  notFoundCode?: "NOT_FOUND" | "BAD_REQUEST";
}) => {
  const { faceId, userId, notFoundCode = "BAD_REQUEST" } = params;
  if (!faceId) return undefined;

  const [row] = await db
    .select({ object_key: face.object_key })
    .from(face)
    .where(and(eq(face.id, faceId), eq(face.user_id, userId)))
    .limit(1);

  if (!row?.object_key) {
    throw new TRPCError({
      code: notFoundCode,
      message:
        notFoundCode === "NOT_FOUND"
          ? "Face not found"
          : "Face not found or invalid face ID",
    });
  }

  return row.object_key;
};

/**
 * Create the output media row and its generation row without a transaction.
 *
 * The `neon-http` driver does not support `db.transaction`, so the writes run
 * sequentially and we compensate by hand: if either write fails the output
 * media row is deleted so it never becomes an orphan.
 */
export const createGenerationJob = async (params: {
  userId: string;
  blurId: (typeof blur_methods)[number];
  inputMediaId: string;
  faceId: string | null;
  isVideo: boolean;
  outputFileName: string;
  source: {
    size: number | null;
    type: string | null;
  };
}): Promise<GenerationJob> => {
  const {
    userId,
    blurId,
    inputMediaId,
    faceId,
    isVideo,
    outputFileName,
    source,
  } = params;

  const [outputMedia] = await db
    .insert(media)
    .values({
      name: outputFileName,
      object_key: "pending",
      user_id: userId,
      size: source.size,
      type: source.type,
      uploaded_type: "GENERATED",
    })
    .returning();

  if (!outputMedia) {
    throw new Error("Failed to create output media");
  }

  const outputKey = getKey({
    file_name: outputFileName,
    userId,
    media_id: outputMedia.id,
    upload_type: "generation",
  });

  try {
    await db
      .update(media)
      .set({ object_key: outputKey })
      .where(eq(media.id, outputMedia.id));

    const rows = await db
      .insert(generation)
      .values({
        user_id: userId,
        blur_type: blurId,
        face_id: faceId,
        input_media_id: inputMediaId,
        is_video: isVideo,
        output_media_id: outputMedia.id,
        output_object_key: outputKey,
      })
      .returning();

    const generationJob: GenerationRow | undefined = rows[0];
    if (!generationJob) {
      throw new Error("Failed to create generation");
    }

    return {
      ...generationJob,
      outputKey,
      outputMediaId: outputMedia.id,
    };
  } catch (err) {
    // No transaction support: undo the output media row created above.
    await db
      .delete(media)
      .where(and(eq(media.id, outputMedia.id), eq(media.user_id, userId)));
    throw err;
  }
};

/**
 * Compensating rollback for a job that failed before completing: remove the
 * generation plus its output media, S3 object and cached URLs. The input
 * media is deliberately kept — it belongs to the user's library and can be
 * reused on retry. Cleanup is best-effort so it never masks the original error.
 */
export const rollbackGeneration = async (
  job: Pick<GenerationJob, "id" | "outputKey" | "outputMediaId">,
  userId: string,
): Promise<void> => {
  await deleteObject(job.outputKey);
  await invalidateDownloadUrl(job.outputKey);

  try {
    await db
      .delete(generation)
      .where(and(eq(generation.id, job.id), eq(generation.user_id, userId)));
    await db
      .delete(media)
      .where(
        and(eq(media.id, job.outputMediaId), eq(media.user_id, userId)),
      );
  } catch (err) {
    console.error(`[generation] rollback failed for ${job.id}`, err);
  }

  await invalidateGeneration(userId, job.id);
};
