import { describe, expect, it, vi } from "vitest";

// Stub streamChat — these tests cover request validation only. We don't
// need to drive the SSE stream; the 400 paths return before the stream
// even starts.
const streamChat = vi.fn();
vi.mock("../src/lib/claude", () => ({
  streamChat: (...args: unknown[]) => streamChat(...args),
}));

const { chatRoute } = await import("../src/routes/chat");

const validBody = {
  messages: [{ role: "user", content: "hello" }],
  portfolio: {
    addresses: {},
    topHoldings: [],
    hiddenCount: 0,
    totalUsd: 0,
  },
  writeMode: false,
};

const post = (body: unknown) =>
  chatRoute.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("chatRoute — POST / request validation", () => {
  it("returns 400 when the body isn't valid JSON", async () => {
    const res = await post("not json");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid-request");
  });

  it("returns 400 when the body fails the Zod schema", async () => {
    const res = await post({ messages: [], portfolio: {} });
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      issues: unknown[];
    };
    expect(body.error).toBe("invalid-request");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects message arrays over 100 entries (abuse guard upheld at the edge)", async () => {
    const tooMany = Array.from({ length: 101 }, () => ({
      role: "user",
      content: "spam",
    }));
    const res = await post({ ...validBody, messages: tooMany });
    expect(res.status).toBe(400);
  });

  it("rejects empty user content (schema's min(1) constraint)", async () => {
    const res = await post({
      ...validBody,
      messages: [{ role: "user", content: "" }],
    });
    expect(res.status).toBe(400);
  });

  it("does NOT call streamChat on invalid bodies", async () => {
    streamChat.mockClear();
    await post("garbage");
    await post({ messages: [], portfolio: {} });
    expect(streamChat).not.toHaveBeenCalled();
  });
});

describe("chatRoute — POST / accepts valid bodies and forwards to streamChat", () => {
  it("invokes streamChat with the trimmed history + portfolio + writeMode", async () => {
    streamChat.mockClear();
    streamChat.mockImplementationOnce(async () => {
      // Resolve immediately so the SSE stream completes.
    });

    const res = await post(validBody);
    expect(res.status).toBe(200);
    expect(streamChat).toHaveBeenCalledTimes(1);

    const [messages, portfolio, writeMode] = streamChat.mock.calls[0] ?? [];
    expect(messages).toHaveLength(1);
    expect(portfolio).toMatchObject({ totalUsd: 0 });
    expect(writeMode).toBe(false);
  });

  it("trims a long history to the last 20 turns before invoking streamChat", async () => {
    streamChat.mockClear();
    streamChat.mockImplementationOnce(async () => {});

    const longHistory = Array.from({ length: 50 }, (_, i) => ({
      role: "user" as const,
      content: `msg-${i}`,
    }));

    await post({ ...validBody, messages: longHistory });
    const [messages] = streamChat.mock.calls[0] ?? [];
    expect((messages as unknown[]).length).toBe(20);
    // First sent message should be the 31st original message.
    expect((messages as Array<{ content: string }>)[0]?.content).toBe(
      "msg-30",
    );
  });

  it("defaults writeMode to false when omitted", async () => {
    streamChat.mockClear();
    streamChat.mockImplementationOnce(async () => {});
    const { writeMode: _drop, ...rest } = validBody;

    await post(rest);
    const writeMode = streamChat.mock.calls[0]?.[2];
    expect(writeMode).toBe(false);
  });
});
