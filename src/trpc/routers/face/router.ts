import { db } from "@/db/drizzle";
import { face, media } from "@/db/schema";
import { MAX_PHOTO_LIMIT, MAX_VIDEO_LIMIT } from "@/lib/constants";
import { deleteObject } from "@/s3/delete-object";
import {
  DOWNLOAD_URL_EXPIRES_IN,
  getCachedDownloadUrl,
  invalidateDownloadUrl,
} from "@/s3/get-download-url";
import { getUploadUrl } from "@/s3/get-upload-url";
import { createTRPCRouter, protectProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import z from "zod";

type FaceRow = typeof face.$inferSelect;
type MediaRow = typeof media.$inferSelect;

/**
 * Public shape for a face. `object_key` is never exposed — clients get a
 * presigned `url` (valid for 1 day) instead.
 */
const toFaceDTO = (faceRow: FaceRow, mediaRow: MediaRow | null, url: string) => {
  const { object_key: _objectKey, ...rest } = faceRow;
  return {
    ...rest,
    fileName: mediaRow?.name ?? null,
    mimeType: mediaRow?.type ?? null,
    size: mediaRow?.size ?? null,
    url,
    urlExpiresIn: DOWNLOAD_URL_EXPIRES_IN,
  };
};

const withUrl = async (faceRow: FaceRow, mediaRow: MediaRow | null) =>
  toFaceDTO(faceRow, mediaRow, await getCachedDownloadUrl(faceRow.object_key));

export const Facerouters = createTRPCRouter({
  uploadFace: protectProcedure.input(
    z.object({
      file_name: z.string(),
      file_type: z.string(),
      file_size: z.number(),
      name:z.string()
    })
  ).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    let key = `users/${userId}/faces/<faceId>/${input.file_name}`
    const contentType = input.file_type;
    if(!(contentType.includes("video")||contentType.includes("image"))) throw new TRPCError({code:"UNSUPPORTED_MEDIA_TYPE"})
    const max_file_size = contentType.startsWith("image") ? MAX_PHOTO_LIMIT : MAX_VIDEO_LIMIT;
    if(input.file_size>max_file_size) throw new TRPCError({code:"PAYLOAD_TOO_LARGE"})
    const new_media = await db.insert(media).values({
      name: input.file_name,
      type: input.file_type,
      size: input.file_size,
      object_key: key,
      user_id: userId
    }).returning({ id: media.id });
    const mediaId = new_media[0].id
    key = key.replace("<faceId>", mediaId)
    let new_face: typeof face.$inferSelect;
    try {
      const rows = await db.insert(face).values({
        media_id: mediaId,
        name: input.name,
        object_key: key,
        user_id: userId,
      }).returning();
      new_face = rows[0];
    } catch (err) {
      // Face insert failed — remove the orphan media row so we don't leak it.
      await db.delete(media).where(and(eq(media.id, mediaId), eq(media.user_id, userId)));
      throw err;
    }
    const { object_key, ...rest } = new_face
    let upload_data: Awaited<ReturnType<typeof getUploadUrl>>;
    try {
      upload_data = await getUploadUrl(key, input.file_type);
    } catch (err) {
      // Presign failed — roll back both rows (face first due to FK).
      await db.delete(face).where(and(eq(face.id, new_face.id), eq(face.user_id, userId)));
      await db.delete(media).where(and(eq(media.id, mediaId), eq(media.user_id, userId)));
      throw err;
    }
    return {face:rest,upload_data}
  }),

  /** All faces of the current user, each with a cached 1-day S3 `url`. */
  getAll: protectProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const rows = await db
      .select({ face, media })
      .from(face)
      .innerJoin(media, eq(face.media_id, media.id))
      .where(eq(face.user_id, userId))
      .orderBy(asc(face.name));
    return Promise.all(rows.map((r) => withUrl(r.face, r.media)));
  }),

  /** Single face by id (owner only), with a cached 1-day S3 `url`. */
  getById: protectProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await db
        .select({ face, media })
        .from(face)
        .innerJoin(media, eq(face.media_id, media.id))
        .where(and(eq(face.id, input.id), eq(face.user_id, userId)))
        .limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Face not found" });
      return withUrl(row.face, row.media);
    }),

  /** Rename a face (owner only). The object key is unchanged, so cached URLs stay valid. */
  updateFace: protectProcedure
    .input(z.object({ id: z.string(), name: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await db
        .update(face)
        .set({ name: input.name })
        .where(and(eq(face.id, input.id), eq(face.user_id, userId)))
        .returning();
      const updated = rows[0];
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Face not found" });
      const mediaRows = await db
        .select()
        .from(media)
        .where(eq(media.id, updated.media_id))
        .limit(1);
      return withUrl(updated, mediaRows[0] ?? null);
    }),

  /**
   * Delete a face and its media row (plus the S3 object, best-effort).
   * Used to clean up after a failed/orphaned upload:
   * - S3 upload failed client-side after the rows were created, or
   * - only the media row exists (face insert failed before compensation).
   * Pass whichever ids the client has; at least one is required.
   */
  deleteFace: protectProcedure.input(
    z.object({
      faceId: z.string().optional(),
      mediaId: z.string().optional(),
    }).refine((v) => v.faceId ?? v.mediaId, { message: "faceId or mediaId is required" })
  ).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    let deletedFace = false;
    let deletedMedia = false;

    // Resolve the media id + object key via the face row when possible.
    let mediaId = input.mediaId ?? null;
    let objectKey: string | null = null;
    if (input.faceId) {
      const rows = await db
        .select()
        .from(face)
        .where(and(eq(face.id, input.faceId), eq(face.user_id, userId)))
        .limit(1);
      const row = rows[0];
      if (row) {
        mediaId ??= row.media_id;
        objectKey = row.object_key;
        await db.delete(face).where(and(eq(face.id, row.id), eq(face.user_id, userId)));
        deletedFace = true;
      }
    }

    if (objectKey) {
      // Best-effort: a missing S3 object must not fail the cleanup.
      try {
        await deleteObject(objectKey);
      }
      catch {
        console.error("Error deleting",objectKey)
      }
      // Drop the cached download URL so it can never be served again.
      await invalidateDownloadUrl(objectKey);
    }

    if (mediaId) {
      const result = await db
        .delete(media)
        .where(and(eq(media.id, mediaId), eq(media.user_id, userId)))
        .returning({ id: media.id });
      deletedMedia = result.length > 0;
    }

    if (!deletedFace && !deletedMedia) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Face or media not found" });
    }
    return { deletedFace, deletedMedia };
  }),
})
