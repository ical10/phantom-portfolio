import { Hono } from "hono";
import { AgentWalletAddressesResponseSchema } from "@portfolio/shared";
import { getAgentWalletAddresses } from "../lib/claude";

export const agentWalletRoute = new Hono();

// Rate limiting applied at mount time in index.ts.
agentWalletRoute.get("/addresses", async (c) => {
  try {
    const result = await getAgentWalletAddresses();
    // MCP callTool returns { content: [...], isError?: boolean }. Phantom's
    // get_wallet_addresses wraps the real payload in the first text block.
    // Shape unverified; best-effort parse + pass-through.
    const extracted = extractWalletAddresses(result);
    const parsed = AgentWalletAddressesResponseSchema.safeParse(extracted);
    if (!parsed.success) {
      return c.json(
        {
          error: "unexpected-mcp-response",
          raw: result,
          issues: parsed.error.issues.slice(0, 5),
        },
        502,
      );
    }
    return c.json(parsed.data);
  } catch (e) {
    console.error("[agent-wallet]", e);
    return c.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

export function extractWalletAddresses(mcpResult: unknown): unknown {
  // Best effort: pull first text block, try JSON-parse, otherwise return
  // raw so AgentWalletAddressesResponseSchema parse fails loud with context.
  const r = mcpResult as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = r?.content?.find((b) => b.type === "text")?.text;
  if (!text) return mcpResult;
  try {
    return JSON.parse(text);
  } catch {
    return mcpResult;
  }
}
