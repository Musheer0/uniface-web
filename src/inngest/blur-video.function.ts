
import { db } from "@/db/drizzle";
import { inngest } from "./client";
import { z } from "zod";
import { generation } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { blurrfield } from "@/lib/blurrfiled-client";

// 1. Event validation

export const blurVideoSchema = z.object({
  video_key: z.string().min(1),
  output_video_key: z.string().min(1),
  generation_id: z.string().min(1),
  user_id: z.string().min(1),
  face_key:z.string().optional()
});

export type BlurVideoRequest = z.infer<typeof blurVideoSchema>;

// 2. Function

export const blurVideo = inngest.createFunction(
  {
    id: "blur-video",
    name: "Blur Video",
    retries: 3,

    // Runs after all retries are exhausted (or a non-retriable failure).
    onFailure: async ({ event, step }) => {
      const originalEvent = event.data.event;
      const parsed = blurVideoSchema.safeParse(originalEvent.data);

      if (!parsed.success) return;

      const { generation_id, user_id } = parsed.data;

      await step.run("mark-generation-failed", async () => {
        await db
          .update(generation)
          .set({
            status: "FAILED",
            failure_reason: "Video processing failed",
          })
          .where(
            and(
              eq(generation.id, generation_id),
              eq(generation.user_id, user_id)
            )
          );
      });
    },

    triggers: {
      event: "blur-video",
    },
  },

  async ({ event, step }) => {
    // STEP 1: Validate event

    const parsed = blurVideoSchema.safeParse(event.data);

    if (!parsed.success) {
      throw new NonRetriableError(
        `Invalid blur-video event: ${parsed.error.message}`
      );
    }

    const input = parsed.data;

    // STEP 2: Fetch generation

    const job = await step.run("fetch-generation", async () => {
      const [result] = await db
        .select({
          id: generation.id,
          user_id: generation.user_id,
          blur_type: generation.blur_type,
        })
        .from(generation)
        .where(
          and(
            eq(generation.id, input.generation_id),
            eq(generation.user_id, input.user_id)
          )
        )
        .limit(1);

      if (!result) {
        throw new NonRetriableError("Generation not found");
      }

      return result;
    });

    // STEP 3: Mark generation as processing

    await step.run("mark-generation-processing", async () => {
      await db
        .update(generation)
        .set({
          status: "STARTED",
          failure_reason: null,
        })
        .where(
          and(
            eq(generation.id, input.generation_id),
            eq(generation.user_id, input.user_id)
          )
        );
    });

    // STEP 4: Process video

    await step.run("process-video", async () => {
      const result = input.face_key ?
      await blurrfield.blurVideoEveryoneFiltered({
        blur_method: job.blur_type,
        generation_id: job.id,
        output_key: input.output_video_key,
        user_id: input.user_id,
        video_key: input.video_key,
        face_key:input.face_key
      })
      :
      await blurrfield.blurVideoEveryone({
        blur_method: job.blur_type,
        generation_id: job.id,
        output_key: input.output_video_key,
        user_id: input.user_id,
        video_key: input.video_key,
      })

      if (result.error) {
        throw new Error(result.error);
      }

      return { success: true };
    });

    // STEP 5: Mark generation as completed

    await step.run("mark-generation-completed", async () => {
      await db
        .update(generation)
        .set({
          status: "COMPLETED",
          failure_reason: null,
        })
        .where(
          and(
            eq(generation.id, input.generation_id),
            eq(generation.user_id, input.user_id)
          )
        );
    });

    // STEP 6: Update cache (TODO)

    // await step.run("update-cache", async () => {
    //   ...
    // });

    return {
      success: true,
      generation_id: input.generation_id,
    };
  }
);
