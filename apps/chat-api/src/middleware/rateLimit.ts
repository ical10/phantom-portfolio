import { createMiddleware } from "hono/factory";
import { checkRateLimit } from "../lib/rateLimit";

// Per-IP rate limit. Apply to expensive routes (chat, agent-wallet); skip
// /health so Railway's probe traffic doesn't count against the cap.
export const rateLimit = createMiddleware(async (c, next) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return c.json(
      { error: "rate-limited", retryAfterSeconds: limit.retryAfterSeconds },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }
  return next();
});
