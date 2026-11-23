import { inngest } from "@/inngest/client";
import {
  blurVideoTimestampSchema,
  TimestampRangesSchema,
} from "@/inngest/blur-video-timeastamp.function";
import { blurVideoSchema } from "@/inngest/blur-video.function";
import { protectProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

import {
  createGenerationJob,
  findOwnedFaceKey,
  findOwnedMedia,
  generationInputSchema,
  rollbackGeneration,
} from "./generate-shared";

/**
 * Dispatch a full-video blur job. If dispatching fails, the freshly created
 * generation and its output media are rolled back so no orphan rows remain.
 */
export const generate_video = protectProcedure
  .input(generationInputSchema)
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // 1. Validate source media + optional face ownership.
    const userMedia = await findOwnedMedia({
      mediaId: input.media_id,
      userId,
      kind: "video",
    });
    const faceKey = await findOwnedFaceKey({
      faceId: input.face_id,
      userId,
    });

    const outputFileName = `blurred-${userMedia.name}`;

    // 2. Create output media + generation sequentially (no transactions).
    const job = await createGenerationJob({
      userId,
      blurId: input.blur_id,
      inputMediaId: userMedia.id,
      faceId: null,
      isVideo: true,
      outputFileName,
      source: { size: userMedia.size, type: userMedia.type },
    });

    try {
      // 3. Validate and dispatch Inngest event.
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
    } catch (error) {
      console.error("[generate-video] Dispatch failed:", error);
      await rollbackGeneration(job, userId);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Video generation failed",
      });
    }
  });

/** Dispatch a timestamp-scoped video blur job. */
export const generate_video_timestamped = protectProcedure
  .input(
    generationInputSchema.extend({
      time_stamps: TimestampRangesSchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // 1. Validate source media + optional face ownership.
    const userMedia = await findOwnedMedia({
      mediaId: input.media_id,
      userId,
      kind: "video",
    });
    const faceKey = await findOwnedFaceKey({
      faceId: input.face_id,
      userId,
    });

    const outputFileName = `blurred-${userMedia.name}`;

    // 2. Create output media + generation sequentially (no transactions).
    const job = await createGenerationJob({
      userId,
      blurId: input.blur_id,
      inputMediaId: userMedia.id,
      faceId: input.face_id ?? null,
      isVideo: true,
      outputFileName,
      source: { size: userMedia.size, type: userMedia.type },
    });

    try {
      // 3. Validate and dispatch Inngest event.
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
    } catch (error) {
      console.error("[generate-video-timestamps] Dispatch failed:", error);
      await rollbackGeneration(job, userId);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Video generation failed",
      });
    }
  });

export const videoProcedures = {
  generate_video,
  generate_video_timestamped,
};
