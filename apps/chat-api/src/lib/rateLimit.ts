import { LRUCache } from "lru-cache";

// Per-IP chat rate limit. Matches the pattern in apps/web/src/lib/coingecko.ts:
// LRU-scoped counter with a TTL window. Rejects once a caller exceeds the
// burst cap inside the window.

const WINDOW_MS = 5 * 60_000; // 5 minutes
const MAX_PER_WINDOW = 20;

const counters = new LRUCache<string, number>({
  max: 1000,
  ttl: WINDOW_MS,
});

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

export function checkRateLimit(ip: string): RateLimitResult {
  const current = counters.get(ip) ?? 0;
  if (current >= MAX_PER_WINDOW) {
    // TTL for this key is refreshed on every get/set, but we treat
    // "time to a full reset" as the original window for a conservative hint.
    return { ok: false, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) };
  }
  counters.set(ip, current + 1);
  return { ok: true, remaining: MAX_PER_WINDOW - current - 1 };
}
