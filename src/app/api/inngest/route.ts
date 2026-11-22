import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";
import { blurVideo } from "@/inngest/blur-video.function";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions:[
    blurVideo
  ],
});
