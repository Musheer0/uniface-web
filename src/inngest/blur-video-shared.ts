import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import type { BlurMethod } from "@blurfield/js";

import { db } from "@/db/drizzle";
import { generation } from "@/db/schema";
import { updateGenerationStatus } from "@/generation/update-status";

import { inngest } from "./client";

/** Fields shared by every video-blur event. */
export const blurVideoBaseSchema = z.object({
  video_key: z.string().min(1),
  output_video_key: z.string().min(1),
  generation_id: z.string().min(1),
  user_id: z.string().min(1),
  face_key: z.string().optional(),
});

export type BlurVideoBaseRequest = z.infer<typeof blurVideoBaseSchema>;

export type BlurVideoJob = {
  id: string;
  user_id: string;
  blur_type: BlurMethod;
};

export type BlurVideoRunArgs<TInput extends BlurVideoBaseRequest> = {
  input: TInput;
  job: BlurVideoJob;
};

/** Subset of the Blurfield response used by these functions. */
export type BlurResponse = {
  error?: string | null;
};

export type RunBlur<TInput extends BlurVideoBaseRequest> = (
  args: BlurVideoRunArgs<TInput>,
) => Promise<BlurResponse>;

export const calculateCredits = (durationMs: number) =>
  Math.max(1, Math.ceil(durationMs / 60_000));

type CreateBlurVideoFunctionOptions<TInput extends BlurVideoBaseRequest> = {
  id: string;
  name: string;
  /** Event that dispatches this function. Defaults to `blur-video`. */
  triggerEvent?: string;
  /** Parses the payload and narrows it to this function's input type. */
  schema: z.ZodType<TInput>;
  /** Performs the actual Blurfield call for this variant. */
  runBlur: RunBlur<TInput>;
};

/**
 * Builds the common Inngest video-blur workflow: event validation, ownership
 * checks, status transitions, timing and credit accounting. Variants only
 * supply their event schema and the Blurfield method they need to call.
 */
export const createBlurVideoFunction = <TInput extends BlurVideoBaseRequest>({
  id,
  name,
  triggerEvent = "blur-video",
  schema,
  runBlur,
}: CreateBlurVideoFunctionOptions<TInput>) =>
  inngest.createFunction(
    {
      id,
      name,
      retries: 3,

      onFailure: async ({ event, step }) => {
        const originalEvent = event.data.event;
        const parsed = schema.safeParse(originalEvent.data);

        if (!parsed.success) return;

        const { generation_id, user_id } = parsed.data;

        await step.run("mark-generation-failed", async () => {
          // Verify ownership before updating.
          const [job] = await db
            .select({ id: generation.id })
            .from(generation)
            .where(
              and(
                eq(generation.id, generation_id),
                eq(generation.user_id, user_id)
              )
            )
            .limit(1);

          if (!job) return;

          await updateGenerationStatus(generation_id, {
            status: "FAILED",
            failure_reason: "Video processing failed",
          });
        });
      },

      triggers: {
        event: triggerEvent,
      },
    },

    async ({ event, step }) => {
      // STEP 1: Validate event
      const parsed = schema.safeParse(event.data);

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
        await updateGenerationStatus(input.generation_id, {
          status: "STARTED",
        });
      });

      // STEP 4: Process video and track execution time
      const processingResult = await step.run("process-video", async () => {
        const startedAt = Date.now();

        const result = await runBlur({ input, job });

        const timeTake = Date.now() - startedAt;

        if (result.error) {
          throw new Error(result.error);
        }

        return {
          success: true as const,
          timeTake,
          creditsConsumed: calculateCredits(timeTake),
        };
      });

      // STEP 5: Mark generation as completed
      await step.run("mark-generation-completed", async () => {
        await updateGenerationStatus(input.generation_id, {
          status: "COMPLETED",
          time_take: processingResult.timeTake,
          credits_consumed: processingResult.creditsConsumed,
        });
      });

      return {
        success: true as const,
        generation_id: input.generation_id,
        time_take: processingResult.timeTake,
        credits_consumed: processingResult.creditsConsumed,
      };
    }
  );
