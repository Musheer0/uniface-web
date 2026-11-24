import { z } from "zod";
import { blurrfield } from "@/lib/blurrfiled-client";

import {
  blurVideoBaseSchema,
  createBlurVideoFunction,
} from "./blur-video-shared";

export const blurVideoSchema = blurVideoBaseSchema;

export type BlurVideoRequest = z.infer<typeof blurVideoSchema>;

export const blurVideo = createBlurVideoFunction({
  id: "blur-video",
  name: "Blur Video",
  triggerEvent: "blur-video",
  schema: blurVideoSchema,
  runBlur: async ({ input, job }) => {
    return input.face_key
      ? await blurrfield.blurVideoEveryoneFiltered({
          blur_method: job.blur_type,
          generation_id: job.id,
          output_key: input.output_video_key,
          user_id: input.user_id,
          video_key: input.video_key,
          face_key: input.face_key,
        })
      : await blurrfield.blurVideoEveryone({
          blur_method: job.blur_type,
          generation_id: job.id,
          output_key: input.output_video_key,
          user_id: input.user_id,
          video_key: input.video_key,
        });
  },
});
