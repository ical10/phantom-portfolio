import { describe, expect, it } from "vitest";
import { DEMO_WRITE_CAPS } from "@portfolio/shared";
import { checkWriteCap } from "../src/lib/claude";

const TOOL = DEMO_WRITE_CAPS.tool;
const NETWORK = DEMO_WRITE_CAPS.networkId;
const SYM = DEMO_WRITE_CAPS.symbol;
const MAX = DEMO_WRITE_CAPS.maxSol;

describe("checkWriteCap — tool allowlist", () => {
  it("rejects an unknown tool by name", () => {
    expect(checkWriteCap("buy", { networkId: NETWORK, amount: 0.001 })).toMatch(
      /not enabled in this demo/i,
    );
  });

  it("accepts the configured demo tool when args are valid", () => {
    expect(
      checkWriteCap(TOOL, { networkId: NETWORK, amount: MAX / 2 }),
    ).toBeNull();
  });
});

describe("checkWriteCap — networkId guard", () => {
  it("rejects EVM transfers", () => {
    expect(
      checkWriteCap(TOOL, { networkId: "eip155:1", amount: 0.001 }),
    ).toMatch(/only solana:mainnet transfers allowed/i);
  });

  it("rejects Solana devnet", () => {
    expect(
      checkWriteCap(TOOL, { networkId: "solana:devnet", amount: 0.001 }),
    ).toMatch(/only solana:mainnet transfers allowed/i);
  });

  it("is case-insensitive on networkId (LLMs sometimes uppercase CAIPs)", () => {
    expect(
      checkWriteCap(TOOL, { networkId: NETWORK.toUpperCase(), amount: 0.001 }),
    ).toBeNull();
  });

  it("accepts a missing networkId (some LLM payloads omit it)", () => {
    // The current behavior treats missing networkId as 'permissive', relying
    // on Phantom MCP's default. Documented here so a future tightening is
    // an intentional choice, not an accident.
    expect(checkWriteCap(TOOL, { amount: 0.001 })).toBeNull();
  });
});

describe("checkWriteCap — token guard", () => {
  it("rejects any tokenMint (SPL transfers disabled)", () => {
    expect(
      checkWriteCap(TOOL, {
        networkId: NETWORK,
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: 0.001,
      }),
    ).toMatch(/spl token transfers are disabled/i);
  });

  it("treats empty-string tokenMint as native (defensive)", () => {
    expect(
      checkWriteCap(TOOL, {
        networkId: NETWORK,
        tokenMint: "",
        amount: 0.001,
      }),
    ).toBeNull();
  });
});

describe("checkWriteCap — amount validation", () => {
  it("rejects non-numeric amount", () => {
    expect(
      checkWriteCap(TOOL, { networkId: NETWORK, amount: "abc" }),
    ).toMatch(/amount must be a positive number/i);
  });

  it("rejects zero", () => {
    expect(checkWriteCap(TOOL, { networkId: NETWORK, amount: 0 })).toMatch(
      /positive number/i,
    );
  });

  it("rejects negative amounts", () => {
    expect(
      checkWriteCap(TOOL, { networkId: NETWORK, amount: -0.001 }),
    ).toMatch(/positive number/i);
  });

  it("rejects amounts above the cap (UI units)", () => {
    expect(
      checkWriteCap(TOOL, { networkId: NETWORK, amount: MAX + 0.001 }),
    ).toMatch(/max .* per transfer/i);
  });

  it("accepts amounts at the cap exactly", () => {
    expect(
      checkWriteCap(TOOL, { networkId: NETWORK, amount: MAX }),
    ).toBeNull();
  });

  it("accepts string-encoded amounts under the cap", () => {
    expect(
      checkWriteCap(TOOL, { networkId: NETWORK, amount: "0.001" }),
    ).toBeNull();
  });
});

describe("checkWriteCap — amountUnit (UI vs base/lamports)", () => {
  it("converts base units to SOL before applying the cap", () => {
    // 1e7 lamports = 0.01 SOL, exactly at MAX. Should pass.
    expect(
      checkWriteCap(TOOL, {
        networkId: NETWORK,
        amount: 10_000_000,
        amountUnit: "base",
      }),
    ).toBeNull();
  });

  it("rejects base-unit amounts that exceed the cap once converted", () => {
    // 1e9 lamports = 1 SOL → 100x over the cap.
    expect(
      checkWriteCap(TOOL, {
        networkId: NETWORK,
        amount: 1_000_000_000,
        amountUnit: "base",
      }),
    ).toMatch(/max .* per transfer/i);
  });

  it("treats unknown amountUnit values as 'ui' (lenient default)", () => {
    expect(
      checkWriteCap(TOOL, {
        networkId: NETWORK,
        amount: 0.001,
        amountUnit: "garbage",
      }),
    ).toBeNull();
  });
});

describe("checkWriteCap — defense against malformed input", () => {
  it("handles undefined input", () => {
    expect(checkWriteCap(TOOL, undefined)).toMatch(/positive number/i);
  });

  it("handles null input", () => {
    expect(checkWriteCap(TOOL, null)).toMatch(/positive number/i);
  });

  it("handles input that isn't an object", () => {
    expect(checkWriteCap(TOOL, "not-an-object")).toMatch(/positive number/i);
  });
});

describe("checkWriteCap — error message contents", () => {
  it("over-cap error includes the actual amount and the cap value", () => {
    const reason = checkWriteCap(TOOL, { networkId: NETWORK, amount: 0.5 });
    expect(reason).toContain("0.5");
    expect(reason).toContain(String(MAX));
    expect(reason).toContain(SYM);
  });
});
