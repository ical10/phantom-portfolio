import { describe, expect, it } from "vitest";
import {
  AgentWalletAddressesResponseSchema,
  ChatMessageSchema,
  ChatRequestSchema,
  DEMO_WRITE_CAPS,
  HoldingSchema,
  PortfolioContextSchema,
  StreamEventSchema,
} from "../src/chat-schemas";

const validHolding = {
  chain: "solana" as const,
  symbol: "SOL",
  mint: "native",
  balance: "1000000000",
  decimals: 9,
  usdValue: 200,
};

const validPortfolio = {
  addresses: { solana: "66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1" },
  topHoldings: [validHolding],
  hiddenCount: 0,
  totalUsd: 200,
};

describe("HoldingSchema", () => {
  it("accepts a fully-populated holding", () => {
    expect(HoldingSchema.parse(validHolding)).toEqual(validHolding);
  });

  it("makes usdValue optional", () => {
    const { usdValue: _omit, ...rest } = validHolding;
    expect(HoldingSchema.parse(rest)).toEqual(rest);
  });

  it("rejects unsupported chains", () => {
    expect(() =>
      HoldingSchema.parse({ ...validHolding, chain: "bitcoin" }),
    ).toThrow();
  });

  it("rejects negative decimals", () => {
    expect(() => HoldingSchema.parse({ ...validHolding, decimals: -1 })).toThrow();
  });

  it("rejects decimals beyond the documented bound (36)", () => {
    expect(() => HoldingSchema.parse({ ...validHolding, decimals: 37 })).toThrow();
  });
});

describe("PortfolioContextSchema", () => {
  it("accepts a portfolio with both Solana + Ethereum addresses", () => {
    const ctx = {
      ...validPortfolio,
      addresses: {
        solana: "66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1",
        ethereum: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      },
    };
    expect(PortfolioContextSchema.parse(ctx)).toEqual(ctx);
  });

  it("accepts addresses with neither field present (watcher with no resolution yet)", () => {
    const ctx = { ...validPortfolio, addresses: {} };
    expect(PortfolioContextSchema.parse(ctx)).toBeTruthy();
  });

  it("caps topHoldings at 30 entries (cost-control invariant)", () => {
    const tooMany = Array.from({ length: 31 }, () => validHolding);
    expect(() =>
      PortfolioContextSchema.parse({ ...validPortfolio, topHoldings: tooMany }),
    ).toThrow();
  });

  it("requires hiddenCount to be a non-negative integer", () => {
    expect(() =>
      PortfolioContextSchema.parse({ ...validPortfolio, hiddenCount: -1 }),
    ).toThrow();
    expect(() =>
      PortfolioContextSchema.parse({ ...validPortfolio, hiddenCount: 1.5 }),
    ).toThrow();
  });
});

describe("ChatMessageSchema (discriminated union)", () => {
  it("accepts a user message", () => {
    expect(
      ChatMessageSchema.parse({ role: "user", content: "hello" }),
    ).toEqual({ role: "user", content: "hello" });
  });

  it("rejects empty user content (requires min 1 char)", () => {
    expect(() => ChatMessageSchema.parse({ role: "user", content: "" })).toThrow();
  });

  it("rejects user content over 4000 chars (abuse guard)", () => {
    expect(() =>
      ChatMessageSchema.parse({
        role: "user",
        content: "x".repeat(4001),
      }),
    ).toThrow();
  });

  it("accepts an assistant message with empty content (intermediate streaming state)", () => {
    expect(
      ChatMessageSchema.parse({ role: "assistant", content: "" }),
    ).toEqual({ role: "assistant", content: "" });
  });

  it("accepts a tool-call message with arbitrary input", () => {
    const msg = {
      role: "tool-call" as const,
      id: "tool_1",
      name: "transfer",
      input: { amount: 0.001, recipient: "9xY..." },
    };
    expect(ChatMessageSchema.parse(msg)).toEqual(msg);
  });

  it("accepts a tool-result message and treats isError as optional", () => {
    expect(
      ChatMessageSchema.parse({
        role: "tool-result",
        id: "tool_1",
        name: "transfer",
        output: { signature: "abc" },
      }),
    ).toBeTruthy();
  });

  it("rejects an unknown role", () => {
    expect(() =>
      ChatMessageSchema.parse({ role: "system", content: "hi" }),
    ).toThrow();
  });
});

describe("ChatRequestSchema", () => {
  const validReq = {
    messages: [{ role: "user" as const, content: "hi" }],
    portfolio: validPortfolio,
    writeMode: false,
  };

  it("round-trips a valid request", () => {
    const parsed = ChatRequestSchema.parse(validReq);
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.writeMode).toBe(false);
  });

  it("defaults writeMode to false when omitted", () => {
    const { writeMode: _drop, ...rest } = validReq;
    const parsed = ChatRequestSchema.parse(rest);
    expect(parsed.writeMode).toBe(false);
  });

  it("rejects message arrays over 100 entries (abuse guard)", () => {
    expect(() =>
      ChatRequestSchema.parse({
        ...validReq,
        messages: Array.from({ length: 101 }, () => ({
          role: "user" as const,
          content: "spam",
        })),
      }),
    ).toThrow();
  });
});

describe("StreamEventSchema (discriminated union)", () => {
  it("accepts a token delta", () => {
    expect(
      StreamEventSchema.parse({ type: "token", delta: "Hello" }),
    ).toEqual({ type: "token", delta: "Hello" });
  });

  it("accepts a tool-call-start event", () => {
    const ev = {
      type: "tool-call-start" as const,
      id: "t1",
      name: "transfer",
      input: { amount: 0.001 },
    };
    expect(StreamEventSchema.parse(ev)).toEqual(ev);
  });

  it("requires isError on tool-call-result (callers must distinguish errors)", () => {
    expect(() =>
      StreamEventSchema.parse({
        type: "tool-call-result",
        id: "t1",
        name: "transfer",
        output: {},
      }),
    ).toThrow();
  });

  it("accepts done and error events", () => {
    expect(StreamEventSchema.parse({ type: "done" })).toEqual({ type: "done" });
    expect(
      StreamEventSchema.parse({ type: "error", message: "oops" }),
    ).toEqual({ type: "error", message: "oops" });
  });

  it("rejects unknown event types", () => {
    expect(() =>
      StreamEventSchema.parse({ type: "heartbeat" }),
    ).toThrow();
  });
});

describe("AgentWalletAddressesResponseSchema (MCP-shape)", () => {
  it("accepts the real MCP shape we observed", () => {
    const res = {
      walletId: "337d0ff7-6501-5b53-9857-b1dfa032962b",
      organizationId: "c2858af7-baf8-5e5f-8e0d-e87d39b2bc49",
      addresses: [
        {
          addressType: "Solana",
          address: "66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1",
        },
        {
          addressType: "Ethereum",
          address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        },
      ],
    };
    expect(AgentWalletAddressesResponseSchema.parse(res)).toBeTruthy();
  });

  it("treats walletId/organizationId as optional (defensive against MCP shape changes)", () => {
    expect(
      AgentWalletAddressesResponseSchema.parse({
        addresses: [{ addressType: "Solana", address: "66jnQ..." }],
      }),
    ).toBeTruthy();
  });
});

describe("DEMO_WRITE_CAPS invariants", () => {
  it("uses the actual MCP tool name (Phantom CLI exposes 'transfer', not 'transfer_tokens')", () => {
    expect(DEMO_WRITE_CAPS.tool).toBe("transfer");
  });

  it("targets Solana mainnet using CAIP-2 format", () => {
    expect(DEMO_WRITE_CAPS.networkId).toBe("solana:mainnet");
  });

  it("caps at a small SOL amount (≤ 0.1 SOL is the agreed demo bound)", () => {
    expect(DEMO_WRITE_CAPS.maxSol).toBeGreaterThan(0);
    expect(DEMO_WRITE_CAPS.maxSol).toBeLessThanOrEqual(0.1);
  });
});
