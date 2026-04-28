import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { rateLimit } from "../src/middleware/rateLimit";

const buildApp = () => {
  const app = new Hono();
  app.use("/limited/*", rateLimit);
  app.get("/limited/ping", (c) => c.text("ok"));
  return app;
};

const reqWithIp = (app: ReturnType<typeof buildApp>, ip: string) =>
  app.request("/limited/ping", {
    headers: { "x-forwarded-for": ip },
  });

let testIp = 0;
const freshIp = () => `198.51.100.${++testIp}-${Date.now()}`;

describe("rateLimit middleware", () => {
  it("passes through requests under the burst cap", async () => {
    const app = buildApp();
    const ip = freshIp();
    const res = await reqWithIp(app, ip);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("returns 429 with Retry-After + structured body once the cap is exhausted", async () => {
    const app = buildApp();
    const ip = freshIp();
    for (let i = 0; i < 20; i++) await reqWithIp(app, ip);

    const res = await reqWithIp(app, ip);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
    const body = (await res.json()) as {
      error: string;
      retryAfterSeconds: number;
    };
    expect(body.error).toBe("rate-limited");
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates counters per source IP", async () => {
    const app = buildApp();
    const ipA = freshIp();
    const ipB = freshIp();
    for (let i = 0; i < 20; i++) await reqWithIp(app, ipA);

    // ipA exhausted; ipB should still pass.
    expect((await reqWithIp(app, ipA)).status).toBe(429);
    expect((await reqWithIp(app, ipB)).status).toBe(200);
  });

  it("falls back to a stable bucket when x-forwarded-for is missing", async () => {
    const app = buildApp();
    // No header → middleware uses 'unknown' as the IP key. All such requests
    // share a counter, but a single call should still pass.
    const res = await app.request("/limited/ping");
    expect(res.status).toBe(200);
  });

  it("uses only the leftmost IP from a comma-separated x-forwarded-for chain", async () => {
    const app = buildApp();
    const realIp = freshIp();
    // Simulate a proxied request: real client first, then upstream proxies.
    const headers = {
      "x-forwarded-for": `${realIp}, 10.0.0.1, 10.0.0.2`,
    };
    for (let i = 0; i < 20; i++) {
      await app.request("/limited/ping", { headers });
    }
    // Same realIp → should now be limited regardless of the proxy chain.
    const limited = await app.request("/limited/ping", { headers });
    expect(limited.status).toBe(429);

    // Different leftmost IP, even with same proxy chain → fresh counter.
    const fresh = await app.request("/limited/ping", {
      headers: { "x-forwarded-for": `${freshIp()}, 10.0.0.1, 10.0.0.2` },
    });
    expect(fresh.status).toBe(200);
  });
});
