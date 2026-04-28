import { describe, expect, it } from "vitest";
import { DEMO_WRITE_CAPS, type PortfolioContext } from "@portfolio/shared";
import { buildSystemPrompt } from "../src/lib/claude";

const emptyPortfolio: PortfolioContext = {
  addresses: {},
  topHoldings: [],
  hiddenCount: 0,
  totalUsd: 0,
};

const fullPortfolio: PortfolioContext = {
  addresses: {
    solana: "66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1",
    ethereum: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  },
  topHoldings: [
    {
      chain: "solana",
      symbol: "SOL",
      mint: "native",
      balance: "1000000000",
      decimals: 9,
      usdValue: 200,
    },
    {
      chain: "ethereum",
      symbol: "USDC",
      mint: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      balance: "100000000",
      decimals: 6,
      usdValue: 100,
    },
  ],
  hiddenCount: 5,
  totalUsd: 300,
};

describe("buildSystemPrompt — write-mode branching", () => {
  it("documents writes as DISABLED when writeMode=false", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, false);
    expect(prompt).toContain("Write tools are DISABLED");
    expect(prompt).toContain("Fund button");
    expect(prompt).not.toContain("Write tools are AVAILABLE");
  });

  it("documents writes as AVAILABLE + DEMO-CAPPED when writeMode=true", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, true);
    expect(prompt).toContain("Write tools are AVAILABLE");
    expect(prompt).toContain("DEMO-CAPPED");
    expect(prompt).not.toContain("Write tools are DISABLED");
  });

  it("includes the actual demo cap values from shared config", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, true);
    expect(prompt).toContain(DEMO_WRITE_CAPS.tool);
    expect(prompt).toContain(DEMO_WRITE_CAPS.networkId);
    expect(prompt).toContain(DEMO_WRITE_CAPS.symbol);
    expect(prompt).toContain(String(DEMO_WRITE_CAPS.maxSol));
  });

  it("instructs the LLM to skip the broken simulation pre-flight", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, true);
    expect(prompt).toContain("confirmed: true");
    expect(prompt).toContain("403 invalid_request");
  });

  it("requires a Solscan link on successful transfers (proof-of-execution)", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, true);
    expect(prompt).toContain("solscan.io/tx/");
    expect(prompt).toContain("[View on Solscan]");
  });
});

describe("buildSystemPrompt — connected wallet section", () => {
  it("renders both Solana and Ethereum addresses when present", () => {
    const prompt = buildSystemPrompt(fullPortfolio, false);
    expect(prompt).toContain(
      "solana: 66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1",
    );
    expect(prompt).toContain(
      "ethereum: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    );
  });

  it("falls back to '(none connected)' when both addresses are missing", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, false);
    expect(prompt).toContain("(none connected)");
  });

  it("renders only the connected chain when partial", () => {
    const prompt = buildSystemPrompt(
      {
        ...emptyPortfolio,
        addresses: { solana: "66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1" },
      },
      false,
    );
    expect(prompt).toContain("solana:");
    expect(prompt).not.toContain("ethereum:");
  });
});

describe("buildSystemPrompt — holdings snapshot", () => {
  it("renders holdings with chain:symbol and USD values formatted to 2 decimals", () => {
    const prompt = buildSystemPrompt(fullPortfolio, false);
    expect(prompt).toContain("solana:SOL");
    expect(prompt).toContain("ethereum:USDC");
    expect(prompt).toContain("$200.00");
    expect(prompt).toContain("$100.00");
  });

  it("renders '(empty)' when topHoldings is empty", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, false);
    expect(prompt).toContain("(empty)");
  });

  it("appends a hidden-tokens note only when hiddenCount > 0", () => {
    const withHidden = buildSystemPrompt(fullPortfolio, false);
    expect(withHidden).toContain(
      "5 additional unpriced / dust tokens omitted",
    );

    const noHidden = buildSystemPrompt(emptyPortfolio, false);
    expect(noHidden).not.toContain("additional unpriced");
  });

  it("omits the USD value parenthetical when usdValue is undefined", () => {
    const prompt = buildSystemPrompt(
      {
        ...emptyPortfolio,
        topHoldings: [
          {
            chain: "solana",
            symbol: "MYSTERY",
            mint: "native",
            balance: "1",
            decimals: 0,
          },
        ],
      },
      false,
    );
    expect(prompt).toContain("solana:MYSTERY — 1");
    expect(prompt).not.toContain("solana:MYSTERY — 1 ($");
  });

  it("renders the total USD with 2 decimals", () => {
    const prompt = buildSystemPrompt(fullPortfolio, false);
    expect(prompt).toContain("total: $300.00");
  });
});

describe("buildSystemPrompt — agent wallet line", () => {
  // agentSolanaAddress is module-level state populated by getMcpClient() at
  // boot. Without the MCP boot path running, it's null in test, and the
  // prompt should advertise that fact rather than silently omitting it.
  it("explicitly notes when the agent wallet address isn't yet known", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, false);
    expect(prompt).toContain("(address unknown — MCP not yet warm)");
  });

  it("documents the user-vs-agent wallet distinction", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, false);
    expect(prompt).toContain("TWO wallets in play");
    expect(prompt).toContain("from the agent wallet");
  });
});

describe("buildSystemPrompt — invariant rules", () => {
  it("never instructs the LLM to call pay_api_access (autonomous billing safeguard)", () => {
    const enabled = buildSystemPrompt(emptyPortfolio, true);
    const disabled = buildSystemPrompt(emptyPortfolio, false);
    expect(enabled).toContain("Never call pay_api_access");
    expect(disabled).toContain("Never call pay_api_access");
  });

  it("warns about Solana rent-exempt minimum so the LLM gives useful errors", () => {
    const prompt = buildSystemPrompt(emptyPortfolio, false);
    expect(prompt).toContain("rent-exempt minimum");
    expect(prompt).toContain("0.00089 SOL");
  });
});
