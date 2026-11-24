import { z } from "zod";
import { blurrfield } from "@/lib/blurrfiled-client";

import {
  blurVideoBaseSchema,
  createBlurVideoFunction,
} from "./blur-video-shared";

// 1. Event validation

export const TimestampRangeSchema = z.tuple([
  z.number().min(0),
  z.number().min(0),
]);

export const TimestampRangesSchema = z.array(TimestampRangeSchema);

export type TimestampRange = z.infer<typeof TimestampRangeSchema>;
export type TimestampRanges = z.infer<typeof TimestampRangesSchema>;

export const blurVideoTimestampSchema = blurVideoBaseSchema.extend({
  timestamps: TimestampRangesSchema,
});

export type BlurVideoTimestampRequest = z.infer<
  typeof blurVideoTimestampSchema
>;

// 2. Function

export const blurVideoTimestamps = createBlurVideoFunction({
  id: "blur-video-timestamps",
  name: "Blur Video Timestamps",
  triggerEvent: "blur-video",
  schema: blurVideoTimestampSchema,
  runBlur: async ({ input, job }) => {
    return input.face_key
      ? await blurrfield.blurVideoTimestampEveryoneFiltered({
          blur_method: job.blur_type,
          generation_id: job.id,
          output_key: input.output_video_key,
          user_id: input.user_id,
          video_key: input.video_key,
          face_key: input.face_key,
          timestamp_ranges: input.timestamps,
        })
      : await blurrfield.blurVideoTimestampEveryone({
          blur_method: job.blur_type,
          generation_id: job.id,
          output_key: input.output_video_key,
          user_id: input.user_id,
          video_key: input.video_key,
          timestamp_ranges: input.timestamps,
        });
  },
});
