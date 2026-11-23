import { blurImage } from "@/features/generations/actions/blur-image";
import { db } from "@/db/drizzle";
import { generation } from "@/db/schema";
import { getDownloadUrl } from "@/s3/get-download-url";
import { protectProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import {
  createGenerationJob,
  findOwnedFaceKey,
  findOwnedMedia,
  generationInputSchema,
  rollbackGeneration,
} from "./generate-shared";

/**
 * Create an image generation from an uploaded media id and blur it inline.
 * On any failure the job is rolled back so no FAILED generation/output row is
 * left behind; the caller keeps its uploaded media and can retry directly.
 */
export const generated_img = protectProcedure
  .input(generationInputSchema)
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // 1. Validate input media + optional face ownership.
    const inputMedia = await findOwnedMedia({
      mediaId: input.media_id,
      userId,
      kind: "image",
    });
    const faceKey = await findOwnedFaceKey({
      faceId: input.face_id,
      userId,
      notFoundCode: "NOT_FOUND",
    });

    const outputFileName = `blurred-${inputMedia.name}`;

    // 2. Create output media + generation sequentially (no transactions).
    const job = await createGenerationJob({
      userId,
      blurId: input.blur_id,
      inputMediaId: inputMedia.id,
      faceId: input.face_id ?? null,
      isVideo: false,
      outputFileName,
      source: { size: inputMedia.size, type: inputMedia.type },
    });

    try {
      // 3. Mark generation as started.
      await db
        .update(generation)
        .set({ status: "STARTED" })
        .where(eq(generation.id, job.id));

      // 4. Process image.
      await blurImage({
        blurMethod: input.blur_id,
        generationId: job.id,
        inputKey: inputMedia.object_key,
        outputKey: job.outputKey,
        user_id: userId,
        faceId: faceKey,
      });

      // 5. Mark generation completed.
      await db
        .update(generation)
        .set({
          status: "COMPLETED",
          output_object_key: job.outputKey,
        })
        .where(eq(generation.id, job.id));

      // 6. Generate download URL.
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
      await rollbackGeneration(job, userId);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Image generation failed",
      });
    }
  });

export const imageProcedures = { generated_img };
