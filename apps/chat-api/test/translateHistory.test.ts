import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@portfolio/shared";
import { translateHistory } from "../src/lib/claude";

describe("translateHistory — base cases", () => {
  it("returns an empty array for empty input", () => {
    expect(translateHistory([])).toEqual([]);
  });

  it("wraps a single user message as a user message with one text block", () => {
    const result = translateHistory([{ role: "user", content: "hello" }]);
    expect(result).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "hello" }],
      },
    ]);
  });

  it("wraps a single assistant message as an assistant text block", () => {
    const result = translateHistory([
      { role: "assistant", content: "hi there" },
    ]);
    expect(result).toEqual([
      {
        role: "assistant",
        content: [{ type: "text", text: "hi there" }],
      },
    ]);
  });

  it("drops assistant messages with empty content (intermediate streaming state)", () => {
    const result = translateHistory([{ role: "assistant", content: "" }]);
    expect(result).toEqual([]);
  });
});

describe("translateHistory — tool-call and tool-result", () => {
  it("emits an assistant tool_use block for tool-call entries", () => {
    const msgs: ChatMessage[] = [
      {
        role: "tool-call",
        id: "tool_1",
        name: "transfer",
        input: { amount: 0.001 },
      },
    ];
    expect(translateHistory(msgs)).toEqual([
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "tool_1",
            name: "transfer",
            input: { amount: 0.001 },
          },
        ],
      },
    ]);
  });

  it("defaults missing tool-call input to an empty object", () => {
    const msgs: ChatMessage[] = [
      // input is required by the schema but the type allows unknown — we
      // accept undefined and substitute {} so Anthropic doesn't reject.
      { role: "tool-call", id: "tool_1", name: "wallet_addresses", input: {} },
    ];
    const result = translateHistory(msgs);
    expect((result[0]?.content as Array<{ input: unknown }>)[0]?.input).toEqual(
      {},
    );
  });

  it("emits a user tool_result block for tool-result entries", () => {
    const msgs: ChatMessage[] = [
      {
        role: "tool-result",
        id: "tool_1",
        name: "transfer",
        output: { signature: "abc" },
        isError: false,
      },
    ];
    expect(translateHistory(msgs)).toEqual([
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "tool_1",
            content: JSON.stringify({ signature: "abc" }),
            is_error: false,
          },
        ],
      },
    ]);
  });

  it("passes string tool-result outputs through verbatim (no double-encoding)", () => {
    const msgs: ChatMessage[] = [
      {
        role: "tool-result",
        id: "tool_1",
        name: "wallet_status",
        output: "raw text response",
      },
    ];
    const result = translateHistory(msgs);
    const block = (result[0]?.content as Array<{ content: string }>)[0];
    expect(block?.content).toBe("raw text response");
  });

  it("defaults tool-result is_error to false when isError is omitted", () => {
    const msgs: ChatMessage[] = [
      { role: "tool-result", id: "tool_1", name: "x", output: {} },
    ];
    const block = (
      translateHistory(msgs)[0]?.content as Array<{ is_error: boolean }>
    )[0];
    expect(block?.is_error).toBe(false);
  });

  it("preserves isError=true on tool failures", () => {
    const msgs: ChatMessage[] = [
      {
        role: "tool-result",
        id: "tool_1",
        name: "transfer",
        output: { error: "blocked" },
        isError: true,
      },
    ];
    const block = (
      translateHistory(msgs)[0]?.content as Array<{ is_error: boolean }>
    )[0];
    expect(block?.is_error).toBe(true);
  });
});

describe("translateHistory — adjacent same-role merging", () => {
  it("merges an assistant text + tool-call into a single assistant message", () => {
    const msgs: ChatMessage[] = [
      { role: "assistant", content: "I'll transfer 0.001 SOL." },
      {
        role: "tool-call",
        id: "tool_1",
        name: "transfer",
        input: { amount: 0.001 },
      },
    ];
    const result = translateHistory(msgs);
    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe("assistant");
    expect((result[0]?.content as unknown[]).length).toBe(2);
  });

  it("keeps tool-result + user text as a single user message", () => {
    const msgs: ChatMessage[] = [
      {
        role: "tool-result",
        id: "tool_1",
        name: "transfer",
        output: { signature: "abc" },
      },
      { role: "user", content: "thanks!" },
    ];
    const result = translateHistory(msgs);
    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe("user");
    expect((result[0]?.content as unknown[]).length).toBe(2);
  });

  it("does NOT merge across role transitions", () => {
    const msgs: ChatMessage[] = [
      { role: "user", content: "send 0.001 SOL" },
      { role: "assistant", content: "I'll transfer..." },
      { role: "user", content: "wait, change of mind" },
    ];
    const result = translateHistory(msgs);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("translateHistory — full agent loop fixture", () => {
  it("round-trips a complete user→assistant→tool-call→tool-result→assistant cycle", () => {
    const msgs: ChatMessage[] = [
      { role: "user", content: "send 0.001 SOL to 9xY..." },
      { role: "assistant", content: "I'll transfer 0.001 SOL." },
      {
        role: "tool-call",
        id: "t1",
        name: "transfer",
        input: { amount: 0.001 },
      },
      {
        role: "tool-result",
        id: "t1",
        name: "transfer",
        output: { signature: "sig123" },
        isError: false,
      },
      {
        role: "assistant",
        content: "Done — [View on Solscan](https://solscan.io/tx/sig123)",
      },
    ];

    const result = translateHistory(msgs);

    // Anthropic groups: user → (assistant text + tool_use) → (tool_result) → assistant text
    expect(result.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);

    const assistantWithToolUse = result[1];
    expect((assistantWithToolUse?.content as unknown[]).length).toBe(2);
  });
});
