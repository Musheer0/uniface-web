import { db } from "@/db/drizzle";
import { face, generation, media } from "@/db/schema";
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
    .input(z.object({
      media_id: z.string().min(1),
      face_id: z.string().nullish(),
      blur_id: z.enum(blur_methods),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Only allow media/face rows owned by the caller.
      const mediaRows = await db
        .select()
        .from(media)
        .where(and(eq(media.id, input.media_id), eq(media.user_id, userId)))
        .limit(1);
      if (!mediaRows[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Media not found" });
      }
       
      if (input.face_id) {
        const faceRows = await db
          .select()
          .from(face)
          .where(and(eq(face.id, input.face_id), eq(face.user_id, userId)))
          .limit(1);
        if (!faceRows[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Face not found" });
        }
      }

      const rows = await db
        .insert(generation)
        .values({
          user_id: userId,
          blur_type: input.blur_id,
          face_id: input.face_id ?? null,
          input_media_id: input.media_id,
          is_video: false,
        })
        .returning();
      const created = rows[0];
      const inputMedia = mediaRows[0]
      const output_key = getKey({
        file_name:"blurred-"+inputMedia.name,
        userId,
        media_id:inputMedia.id,
        upload_type:"generation",
      })
      console.log({output_key,inputMedia})
      if(input.face_id ){
        //TODO get face
      }
      const generation_response = await blurImage({
        blurMethod:input.blur_id,
        generationId:created.id,
        inputKey:mediaRows[0].object_key,
        outputKey:output_key,
        user_id:userId,
      });
      const [output_media] = await db.insert(media)
      .values({
        name:inputMedia.name,
        object_key:output_key,
        user_id:userId,
        size:inputMedia.size,
        uploaded_type:"GENERATED",
        type:inputMedia.type
      }).returning();
      if(!output_media) {
        //TODO raise a bg job to retry saving
        throw new TRPCError({code:"INTERNAL_SERVER_ERROR",message:"error saving output to db"})
      }
       const [{output_object_key,...generation_job}] = await db.update(generation)
       .set({
        output_object_key:output_media.object_key,
        output_media_id:output_media.id
       })
       .where(eq(generation.id,created.id)).returning();
        const media_url = await getDownloadUrl(output_key);

      return {...generation_job, media_url };
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
     .input(z.object({
      media_id: z.string().min(1),
      face_id: z.string().nullish(),
      blur_id: z.enum(blur_methods),
     }))
     .mutation(async({ctx,input})=>{
       const userId = ctx.session.user.id;
       const [userMedia] = await db.select().from(media).where(
        and(
          eq(media.id,input.media_id),
          eq(media.user_id, userId)
        )
       );
       if(!userMedia) throw new TRPCError({code:"UNAUTHORIZED",message:"video not found"});
       const output_file_name ="blurred-"+ userMedia.name
       const [output_media] = await db.insert(media).values(
        {
          ...userMedia,
          object_key:"<placeHolder>",
          uploaded_type:"GENERATED",
          name:output_file_name
        }
       ).returning();
       const outputKey = getKey({
        file_name:output_file_name,
        media_id:output_media.id,
        upload_type:"generation",
        userId:userId,
       });
       const job = await db.transaction(async(ctx)=>{
          await ctx.update(media).set({object_key:outputKey}).where(eq(media.id, output_media.id));
          const [generation_job] = await ctx.insert(generation).values({
            blur_type:input.blur_id ,
            input_media_id:userMedia.id,
            user_id:userId,
            is_video:true,
            output_media_id:output_media.id,
            output_object_key:outputKey
          }).returning();
          return generation_job
       });
       //TODO trigger inggest 
       return {jobId:job.id}
     })
 })
