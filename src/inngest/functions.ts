import { inngest } from "./client";

/**
 * Test function to verify the Inngest setup. Trigger it from the Dev Server
 * UI (http://localhost:8288) or via POST /api/inngest-test.
 */
export const testHello = inngest.createFunction(
  { id: "test-hello", triggers: { event: "app/test.triggered" } },
  async ({ event, step }) => {
    const echoed = await step.run("echo-payload", async () => {
      return { received: event.data };
    });

    await step.sleep("pause-a-bit", "2s");

    return { message: `Hello ${event.data.name ?? "world"}`, echoed };
  },
);

export const functions = [testHello];
