import { db } from "@/db/drizzle";
import { face, media } from "@/db/schema";
import { MAX_PHOTO_LIMIT, MAX_VIDEO_LIMIT, DOWNLOAD_URL_EXPIRES_IN } from "@/lib/constants";
import { deleteObject } from "@/s3/delete-object";
import {
  getCachedDownloadUrl,
  invalidateDownloadUrl,
} from "@/s3/get-download-url";
import { getUploadUrl } from "@/s3/get-upload-url";
import { createTRPCRouter, protectProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt } from "drizzle-orm";
import z from "zod";

type MediaRow = typeof media.$inferSelect;

/**
 * Public shape for a media row. `object_key` is never exposed — clients get
 * a presigned `url` (valid for 1 day, cached in Redis) instead.
 */
const toMediaDTO = (mediaRow: MediaRow, url: string) => {
  const { object_key: _objectKey, ...rest } = mediaRow;
  return {
    ...rest,
    url,
    urlExpiresIn: DOWNLOAD_URL_EXPIRES_IN,
  };
};

const withUrl = async (mediaRow: MediaRow) =>
  toMediaDTO(mediaRow, await getCachedDownloadUrl(mediaRow.object_key));

export const MediaRouters = createTRPCRouter({
  /**
   * Create a media row + presigned POST for direct-to-S3 upload
   * (mirrors `face.uploadFace`). Accepts images and videos; limits come
   * from `@/lib/constants`. The client uploads the bytes, then uses the
   * returned media id. Rolls back the row if presigning fails.
   */
  uploadMedia: protectProcedure.input(
    z.object({
      file_name: z.string(),
      file_type: z.string(),
      file_size: z.number(),
    })
  ).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    let key = `users/${userId}/media/<mediaId>/${input.file_name}`
    const contentType = input.file_type;
    if (!(contentType.includes("video") || contentType.includes("image"))) throw new TRPCError({ code: "UNSUPPORTED_MEDIA_TYPE" })
    const max_file_size = contentType.startsWith("image") ? MAX_PHOTO_LIMIT : MAX_VIDEO_LIMIT;
    if (input.file_size > max_file_size) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" })
    const rows = await db.insert(media).values({
      name: input.file_name,
      type: input.file_type,
      size: input.file_size,
      object_key: key,
      user_id: userId
    }).returning();
    const new_media = rows[0];
    key = key.replace("<mediaId>", new_media.id);
    // Swap the placeholder key for the final one.
    const updated = await db
      .update(media)
      .set({ object_key: key })
      .where(and(eq(media.id, new_media.id), eq(media.user_id, userId)))
      .returning();
    let upload_data: Awaited<ReturnType<typeof getUploadUrl>>;
    try {
      upload_data = await getUploadUrl(key, input.file_type);
    } catch (err) {
      // Presign failed — roll back the row so it never orphans.
      await db.delete(media).where(and(eq(media.id, new_media.id), eq(media.user_id, userId)));
      throw err;
    }
    const { object_key, ...rest } = updated[0] ?? new_media;
    return { media: rest, upload_data };
  }),

  /**
   * Cursor-based list of the current user's media, newest first.
   * `cursor` is the last seen media `id`; `nextCursor` is null at the end.
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
        .from(media)
        .where(
          input.cursor
            ? and(eq(media.user_id, userId), lt(media.id, input.cursor))
            : eq(media.user_id, userId),
        )
        .orderBy(desc(media.id))
        .limit(input.limit + 1);
      const hasMore = rows.length > input.limit;
      const page = hasMore ? rows.slice(0, -1) : rows;
      const items = await Promise.all(page.map((row) => withUrl(row)));
      return {
        items,
        nextCursor: hasMore ? page[page.length - 1].id : null,
      };
    }),

  /** Single media row by id (owner only), with a cached 1-day S3 `url`. */
  getById: protectProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await db
        .select()
        .from(media)
        .where(and(eq(media.id, input.id), eq(media.user_id, userId)))
        .limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Media not found" });
      return withUrl(row);
    }),

  /**
   * Delete a media row, its S3 object, and its cached URL (owner only).
   * Faces pointing at this media are removed too (their S3 objects and
   * cached URLs included) since the DB FK alone would leave orphaned files.
   */
  deleteMedia: protectProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await db
        .select()
        .from(media)
        .where(and(eq(media.id, input.id), eq(media.user_id, userId)))
        .limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Media not found" });

      // Remove dependent faces first (S3 + cache + rows).
      const dependentFaces = await db
        .select()
        .from(face)
        .where(and(eq(face.media_id, row.id), eq(face.user_id, userId)));
      for (const f of dependentFaces) {
        try {
          await deleteObject(f.object_key);
        } catch {
          console.error("Error deleting", f.object_key);
        }
        await invalidateDownloadUrl(f.object_key);
        await db.delete(face).where(and(eq(face.id, f.id), eq(face.user_id, userId)));
      }

      try {
        await deleteObject(row.object_key);
      } catch {
        console.error("Error deleting", row.object_key);
      }
      await invalidateDownloadUrl(row.object_key);
      await db.delete(media).where(and(eq(media.id, row.id), eq(media.user_id, userId)));

      return { deletedMedia: true, deletedFaces: dependentFaces.length };
    }),
})
