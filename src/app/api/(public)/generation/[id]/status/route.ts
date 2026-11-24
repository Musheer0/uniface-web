import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { generation, media } from "@/db/schema";
import { DOWNLOAD_URL_EXPIRES_IN } from "@/lib/constants";
import type { GenerationStatusResponse } from "@/lib/update-genertation-status";
import { getCachedDownloadUrl } from "@/s3/get-download-url";
import { redis } from "@/redis/client";
import { generationStatus } from "@/redis/keys";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Generation ID is required" },
        { status: 400 },
      );
    }

    // Status lives in Redis (written by the worker), but the DB is the source
    // of truth for the output media and failure reason.
    const [row] = await db
      .select({
        status: generation.status,
        failure_reason: generation.failure_reason,
        is_video: generation.is_video,
        user_id: generation.user_id,
        output_media_id: generation.output_media_id,
      })
      .from(generation)
      .where(eq(generation.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 },
      );
    }

    let cachedStatus: GenerationStatusResponse["status"] = null;
    try {
      cachedStatus = await redis.get<GenerationStatusResponse["status"]>(
        generationStatus(id),
      );
    } catch (err) {
      console.error(`[redis] GET status for ${id} failed`, err);
    }

    const response: GenerationStatusResponse = {
      status: cachedStatus ?? row.status,
      failure_reason: row.failure_reason,
      is_video: row.is_video,
      output: null,
    };

    // Once finished, attach the output media with a presigned download URL.
    if (response.status === "COMPLETED" && row.output_media_id) {
      const [output] = await db
        .select()
        .from(media)
        .where(
          and(
            eq(media.id, row.output_media_id),
            eq(media.user_id, row.user_id),
          ),
        )
        .limit(1);

      if (output) {
        response.output = {
          id: output.id,
          name: output.name,
          type: output.type,
          size: output.size,
          url: await getCachedDownloadUrl(output.object_key),
          urlExpiresIn: DOWNLOAD_URL_EXPIRES_IN,
        };
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Generation status error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
