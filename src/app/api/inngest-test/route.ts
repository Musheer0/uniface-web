import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

/** Fire the test event consumed by the `test-hello` function. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "world";
  const { ids } = await inngest.send({
    name: "app/test.triggered",
    data: { name, at: new Date().toISOString() },
  });
  return NextResponse.json({ eventIds: ids });
}
