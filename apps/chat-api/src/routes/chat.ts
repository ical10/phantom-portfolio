import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ChatRequestSchema } from "@portfolio/shared";
import type { StreamEvent } from "@portfolio/shared";
import { streamChat } from "../lib/claude";

const MAX_TURNS_IN_HISTORY = 20;

export const chatRoute = new Hono();

// Rate limiting applied at mount time in index.ts.
chatRoute.post("/", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json(
      { error: "invalid-request", issues: parsed.error.issues.slice(0, 5) },
      400,
    );
  }

  // Trim to last N turns for cost control. Schema caps at 100; we send 20.
  const messages = parsed.data.messages.slice(-MAX_TURNS_IN_HISTORY);
  const { portfolio } = parsed.data;

  return streamSSE(c, async (stream) => {
    const abortController = new AbortController();
    // If the client disconnects mid-stream, abort Claude/MCP work.
    stream.onAbort(() => abortController.abort());

    const emit = async (event: StreamEvent) => {
      await stream.writeSSE({ data: JSON.stringify(event) });
    };

    await streamChat(messages, portfolio, (event) => {
      // Fire-and-forget — Hono's writeSSE is async but we don't need to
      // serialize writes strictly; the stream internally buffers in order.
      void emit(event);
    }, abortController.signal);
  });
});
