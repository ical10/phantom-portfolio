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
    // Fixed window: lru-cache TTL is set on insert and not refreshed on get
    // (we don't pass `updateAgeOnGet`). The retry hint is therefore an upper
    // bound — the entry actually expires N ms after the FIRST hit in this
    // window, not the most recent one.
    return { ok: false, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) };
  }
  counters.set(ip, current + 1);
  return { ok: true, remaining: MAX_PER_WINDOW - current - 1 };
}
