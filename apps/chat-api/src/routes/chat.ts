import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ChatRequestSchema } from "@portfolio/shared";
import type { StreamEvent } from "@portfolio/shared";
import { streamChat } from "../lib/claude";
import { checkRateLimit } from "../lib/rateLimit";

const MAX_TURNS_IN_HISTORY = 20;

export const chatRoute = new Hono();

chatRoute.post("/", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("cf-connecting-ip") ||
    "unknown";

  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return c.json(
      { error: "rate-limited", retryAfterSeconds: limit.retryAfterSeconds },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

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

    // Give any in-flight writes a tick to flush before closing.
    await new Promise((r) => setTimeout(r, 10));
  });
});
