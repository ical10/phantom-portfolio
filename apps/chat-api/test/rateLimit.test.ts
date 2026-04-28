import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../src/lib/rateLimit";

// The counter is a module-level LRU shared across calls. To avoid test
// state bleed, every test uses a unique IP and tests are independent of
// what other tests did to other IPs.
let ipCounter = 0;
const freshIp = () => `192.0.2.${++ipCounter}-${Date.now()}`;

const MAX = 20;

describe("checkRateLimit — first request from a new IP", () => {
  it("returns ok with the full quota minus one", () => {
    const ip = freshIp();
    const r = checkRateLimit(ip);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remaining).toBe(MAX - 1);
  });
});

describe("checkRateLimit — within the burst window", () => {
  it("decrements 'remaining' on each call", () => {
    const ip = freshIp();
    const remainingValues: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit(ip);
      expect(r.ok).toBe(true);
      if (r.ok) remainingValues.push(r.remaining);
    }
    expect(remainingValues).toEqual([19, 18, 17, 16, 15]);
  });

  it("allows exactly MAX_PER_WINDOW requests", () => {
    const ip = freshIp();
    for (let i = 0; i < MAX; i++) {
      expect(checkRateLimit(ip).ok).toBe(true);
    }
  });
});

describe("checkRateLimit — over-limit", () => {
  it("rejects the (MAX_PER_WINDOW + 1)th request with a Retry-After hint", () => {
    const ip = freshIp();
    for (let i = 0; i < MAX; i++) checkRateLimit(ip);

    const r = checkRateLimit(ip);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // Window is 5 minutes. Hint should be a positive int upper-bound.
      expect(r.retryAfterSeconds).toBeGreaterThan(0);
      expect(r.retryAfterSeconds).toBeLessThanOrEqual(300);
      expect(Number.isInteger(r.retryAfterSeconds)).toBe(true);
    }
  });

  it("keeps rejecting subsequent calls in the same window", () => {
    const ip = freshIp();
    for (let i = 0; i < MAX; i++) checkRateLimit(ip);
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(ip).ok).toBe(false);
    }
  });
});

describe("checkRateLimit — IP isolation", () => {
  it("counts each IP separately", () => {
    const ipA = freshIp();
    const ipB = freshIp();
    for (let i = 0; i < MAX; i++) checkRateLimit(ipA);
    // ipA exhausted; ipB should still be at full quota.
    const r = checkRateLimit(ipB);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remaining).toBe(MAX - 1);
  });
});
