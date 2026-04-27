import { createRequire } from "node:module";
import * as path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  ContentBlockParam,
  Tool,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  ChatMessage,
  PortfolioContext,
  StreamEvent,
} from "@portfolio/shared";
import { DEMO_WRITE_CAPS, requireEnv } from "@portfolio/shared";

// Resolve the bin at module load — npx-on-demand spawns are too slow
// for the MCP SDK's protocol handshake on cold containers.
const _require = createRequire(import.meta.url);
const PHANTOM_MCP_BIN = path.join(
  path.dirname(_require.resolve("@phantom/mcp-server/package.json")),
  "dist/bin.js",
);

const ANTHROPIC_API_KEY = requireEnv(
  process.env.ANTHROPIC_API_KEY,
  "ANTHROPIC_API_KEY",
);
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

// Read-only MCP tools - not gated and always available.
const ALLOWED_READ_TOOLS = new Set([
  "wallet_addresses",
  "wallet_status",
  "simulate",
  "evm_allowance",
  "perps_markets",
  "perps_account",
  "perps_positions",
  "perps_orders",
  "perps_history",
]);

// Write tools — gated behind `writeMode` (set after the user funds the
// agent wallet). For this proof-of-concept demo, only `transfer_tokens`
// is exposed, and the per-call guard below caps it at a small SOL amount.
const ALLOWED_WRITE_TOOLS = new Set([DEMO_WRITE_CAPS.tool]);

const MAX_TURNS = 5;
const MAX_TOKENS = 4096;
const TOOL_CALL_TIMEOUT_MS = 30_000;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Module-level singleton. The MCP subprocess cold-start is ~40s (npx
// download + device-code auth + tool listing), so spawning per-request
// is not viable; we share one across the lifetime of the Node process.
// `mcpClientPromise` guards against concurrent first-callers all racing
// to spawn their own subprocess.
let mcpClient: Client | null = null;
let mcpClientPromise: Promise<Client> | null = null;
// All filtered tools (read + write). The per-request tool list is
// derived from this by `writeMode`.
let mcpTools: Tool[] = [];
// The Solana address of the agent wallet — Phantom MCP's `transfer` tool
// signs FROM this wallet, not the user's connected dashboard wallet.
// Cached at boot so it can be surfaced in the system prompt.
let agentSolanaAddress: string | null = null;

async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;
  if (mcpClientPromise) return mcpClientPromise;
  const promise = (async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [PHANTOM_MCP_BIN],
      env: process.env as Record<string, string>,
    });
    const client = new Client(
      { name: "phantom-portfolio-chat", version: "0.1.0" },
      { capabilities: {} },
    );
    await client.connect(transport);
    const { tools } = await client.listTools();
    mcpTools = tools
      .filter(
        (t) =>
          ALLOWED_READ_TOOLS.has(t.name) || ALLOWED_WRITE_TOOLS.has(t.name),
      )
      .map((t) => ({
        name: t.name,
        description: t.description ?? "",
        input_schema: t.inputSchema as Tool.InputSchema,
      }));
    // Best-effort cache of the agent wallet's Solana address. If MCP
    // returns an unexpected shape we just leave it null — the system
    // prompt falls back to a generic "agent wallet" reference.
    try {
      const addrResult = await client.callTool({
        name: "wallet_addresses",
        arguments: {},
      });
      const blocks = (addrResult.content ?? []) as Array<{
        type: string;
        text?: string;
      }>;
      const text = blocks.find((b) => b.type === "text")?.text;
      if (text) {
        const parsed = JSON.parse(text) as {
          addresses?: Array<{ addressType?: string; address?: string }>;
        };
        const sol = parsed.addresses?.find((a) => a.addressType === "Solana");
        if (sol?.address) agentSolanaAddress = sol.address;
      }
    } catch (e) {
      console.warn("[mcp] agent wallet address lookup failed:", e);
    }
    mcpClient = client;
    return client;
  })();
  // If the bootstrap fails, clear the cached promise so the next caller
  // can retry from scratch. Without this, a transient connect/listTools
  // failure poisons the singleton until the server restarts.
  mcpClientPromise = promise.catch((e) => {
    mcpClientPromise = null;
    throw e;
  });
  return mcpClientPromise;
}

// Inspect a write-tool invocation against the demo caps. Returns null if
// the call is allowed, or a human-readable rejection reason otherwise.
// Matches the Phantom MCP `transfer` schema: networkId (CAIP-2), tokenMint
// (omit for native), amount (number|string), amountUnit ("ui" | "base").
function checkWriteCap(name: string, input: unknown): string | null {
  if (name !== DEMO_WRITE_CAPS.tool) {
    return `Tool "${name}" is not enabled in this demo build.`;
  }
  const args = (input ?? {}) as Record<string, unknown>;
  const networkId = String(args.networkId ?? "").toLowerCase();
  const tokenMint = args.tokenMint ? String(args.tokenMint) : "";
  const rawAmount = args.amount;
  const amountUnit =
    String(args.amountUnit ?? "ui").toLowerCase() === "base" ? "base" : "ui";

  if (networkId && networkId !== DEMO_WRITE_CAPS.networkId) {
    return `Demo cap: only ${DEMO_WRITE_CAPS.networkId} transfers allowed (got "${networkId}").`;
  }
  if (tokenMint) {
    return `Demo cap: only native ${DEMO_WRITE_CAPS.symbol} transfers allowed; SPL token transfers are disabled.`;
  }

  // Normalize to SOL (UI units) regardless of how the LLM formatted it.
  const amount =
    typeof rawAmount === "number" ? rawAmount : Number(String(rawAmount ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return `Demo cap: transfer amount must be a positive number.`;
  }
  const sol = amountUnit === "base" ? amount / 1e9 : amount;
  if (sol > DEMO_WRITE_CAPS.maxSol) {
    return `Demo cap: max ${DEMO_WRITE_CAPS.maxSol} ${DEMO_WRITE_CAPS.symbol} per transfer (got ${sol} ${DEMO_WRITE_CAPS.symbol}).`;
  }
  return null;
}

export async function getAgentWalletAddresses(): Promise<unknown> {
  const client = await getMcpClient();
  const result = await client.callTool({
    name: "wallet_addresses",
    arguments: {},
  });
  return result;
}

export function buildSystemPrompt(
  portfolio: PortfolioContext,
  writeMode: boolean,
): string {
  const addrs = [
    portfolio.addresses.solana ? `  solana: ${portfolio.addresses.solana}` : "",
    portfolio.addresses.ethereum
      ? `  ethereum: ${portfolio.addresses.ethereum}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const holdings = portfolio.topHoldings.length
    ? portfolio.topHoldings
        .map(
          (h) =>
            `  ${h.chain}:${h.symbol} — ${h.balance}${h.usdValue !== undefined ? ` ($${h.usdValue.toFixed(2)})` : ""}`,
        )
        .join("\n")
    : "  (empty)";

  const hidden =
    portfolio.hiddenCount > 0
      ? `\n  (${portfolio.hiddenCount} additional unpriced / dust tokens omitted from snapshot)`
      : "";

  const exposed = mcpTools.filter(
    (t) =>
      ALLOWED_READ_TOOLS.has(t.name) ||
      (writeMode && ALLOWED_WRITE_TOOLS.has(t.name)),
  );
  const toolNames = exposed.map((t) => t.name).join(", ") || "(none yet)";

  const writeRule = writeMode
    ? `- Write tools are AVAILABLE but DEMO-CAPPED. The only write tool exposed is
  "${DEMO_WRITE_CAPS.tool}", restricted to native ${DEMO_WRITE_CAPS.symbol}
  on ${DEMO_WRITE_CAPS.networkId} (omit tokenMint), max ${DEMO_WRITE_CAPS.maxSol}
  ${DEMO_WRITE_CAPS.symbol} per call.
- IMPORTANT — skip the two-step "confirmed" flow. Phantom MCP's simulation
  pre-flight (https://api.phantom.app/simulation/v1) currently returns
  "403 invalid_request" for the agent wallet's tier, so calling transfer
  WITHOUT confirmed always fails. Always call "${DEMO_WRITE_CAPS.tool}" ONCE
  with confirmed: true. To make up for the missing simulation, BEFORE the
  tool call write a short plain-language preview ("I'll transfer X
  ${DEMO_WRITE_CAPS.symbol} from the agent wallet to <recipient> on
  ${DEMO_WRITE_CAPS.networkId}") so the user can verify the intent from
  scrollback.
- ALWAYS post a Solana explorer link on success. After any successful
  ${DEMO_WRITE_CAPS.tool} call, the tool result returns a "signature"
  field. You MUST include a Solscan markdown link in your reply, formatted
  exactly as: [View on Solscan](https://solscan.io/tx/<signature>). This is
  non-negotiable — the user relies on the link as proof of execution.
  Do not abbreviate the signature in the URL.
- If the user asks for a larger transfer, a different network, an SPL
  token, or a different action (swap, perp, sign), explain that the demo
  only permits the capped ${DEMO_WRITE_CAPS.symbol} transfer.`
    : `- Write tools are DISABLED until the user funds the agent wallet. If asked to
  transfer, swap, or take a perp action, explain that they need to fund the
  agent wallet first using the Fund button in the chat header. Once funded,
  only a capped "${DEMO_WRITE_CAPS.tool}" (max ${DEMO_WRITE_CAPS.maxSol}
  ${DEMO_WRITE_CAPS.symbol} on ${DEMO_WRITE_CAPS.networkId}) will be available
  — this is a demo build.`;

  const agentLine = agentSolanaAddress
    ? `  solana: ${agentSolanaAddress}`
    : "  (address unknown — MCP not yet warm)";

  return `You are an assistant embedded in a multi-chain portfolio dashboard.

There are TWO wallets in play. Do not conflate them.

User's connected wallet (the dashboard's owner; you READ from this):
${addrs || "  (none connected)"}

Agent wallet (Phantom MCP signs from this; ALL on-chain writes originate here):
${agentLine}

User's portfolio snapshot — these are the USER'S CONNECTED wallet holdings, not the agent wallet's. Use THIS for holdings questions; do NOT call any balance tool:
${holdings}${hidden}
  total: $${portfolio.totalUsd.toFixed(2)}

Available Phantom MCP tools: ${toolNames}

Rules:
- For questions about the user's holdings, use the snapshot above. Don't call balance tools.
- For transaction simulation, token allowances, and Hyperliquid perp reads, call the MCP tools.
- When narrating any write action, ALWAYS say "from the agent wallet" — never claim the user's connected wallet is the sender. The agent wallet must hold enough SOL to cover amount + fees AND remain above Solana's rent-exempt minimum of ~0.00089 SOL (890,880 lamports) — otherwise Phantom's simulator returns a 403 "invalid_request". If the user reports that error and the agent balance is low, recommend topping up to at least 0.01 SOL.
${writeRule}
- Never call pay_api_access.
- Be concise. If a tool returns data, summarize it — don't dump raw JSON.`;
}

/**
 * Translate our persisted ChatMessage[] to Anthropic's MessageParam[].
 * Our history has role-tagged tool-call / tool-result entries; Anthropic
 * groups them as content blocks within assistant / user messages.
 */
function translateHistory(msgs: ChatMessage[]): MessageParam[] {
  const out: MessageParam[] = [];

  // Helpers always treat content as ContentBlockParam[]. We never mix
  // string and array forms — assistant and user messages built here are
  // always arrays, which keeps the merging logic uniform.
  const pushBlock = (role: "assistant" | "user", block: ContentBlockParam) => {
    const last = out[out.length - 1];
    if (last?.role === role && Array.isArray(last.content)) {
      last.content.push(block);
    } else {
      out.push({ role, content: [block] });
    }
  };

  for (const m of msgs) {
    if (m.role === "user") {
      pushBlock("user", { type: "text", text: m.content });
    } else if (m.role === "assistant") {
      if (m.content) pushBlock("assistant", { type: "text", text: m.content });
    } else if (m.role === "tool-call") {
      pushBlock("assistant", {
        type: "tool_use",
        id: m.id,
        name: m.name,
        input: (m.input ?? {}) as Record<string, unknown>,
      });
    } else {
      const block: ToolResultBlockParam = {
        type: "tool_result",
        tool_use_id: m.id,
        content:
          typeof m.output === "string" ? m.output : JSON.stringify(m.output),
        is_error: m.isError ?? false,
      };
      pushBlock("user", block);
    }
  }

  return out;
}

export async function streamChat(
  messages: ChatMessage[],
  portfolio: PortfolioContext,
  writeMode: boolean,
  emit: (event: StreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  try {
    const client = await getMcpClient();
    const systemPrompt = buildSystemPrompt(portfolio, writeMode);
    const history = translateHistory(messages);
    const tools = mcpTools.filter(
      (t) =>
        ALLOWED_READ_TOOLS.has(t.name) ||
        (writeMode && ALLOWED_WRITE_TOOLS.has(t.name)),
    );

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (signal.aborted) return;

      const stream = anthropic.messages.stream(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          tools,
          messages: history,
        },
        { signal },
      );

      for await (const event of stream) {
        if (signal.aborted) return;
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          emit({ type: "token", delta: event.delta.text });
        }
      }

      const final = await stream.finalMessage();
      history.push({ role: "assistant", content: final.content });

      const toolUseBlocks = final.content.filter(
        (b): b is Extract<typeof b, { type: "tool_use" }> =>
          b.type === "tool_use",
      );

      if (final.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        emit({ type: "done" });
        return;
      }

      const toolResults: ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        if (signal.aborted) return;
        emit({
          type: "tool-call-start",
          id: block.id,
          name: block.name,
          input: block.input,
        });
        // Defense in depth: even if the LLM ignores the prompt and the
        // tool list filtering, refuse write tools when writeMode is off.
        if (ALLOWED_WRITE_TOOLS.has(block.name) && !writeMode) {
          const msg =
            "Write mode is disabled. Ask the user to fund the agent wallet first.";
          emit({
            type: "tool-call-result",
            id: block.id,
            name: block.name,
            output: { error: msg },
            isError: true,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: ${msg}`,
            is_error: true,
          });
          continue;
        }
        // Demo cap: enforce the per-tool spending bound on top of writeMode.
        // Even a fully prompt-injected LLM can't send more than the cap.
        if (ALLOWED_WRITE_TOOLS.has(block.name)) {
          const reason = checkWriteCap(block.name, block.input);
          if (reason) {
            emit({
              type: "tool-call-result",
              id: block.id,
              name: block.name,
              output: { error: reason },
              isError: true,
            });
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: `Error: ${reason}`,
              is_error: true,
            });
            continue;
          }
        }
        try {
          const result = await client.callTool(
            {
              name: block.name,
              arguments: block.input as Record<string, unknown>,
            },
            undefined,
            { timeout: TOOL_CALL_TIMEOUT_MS },
          );
          const isError = !!result.isError;
          emit({
            type: "tool-call-result",
            id: block.id,
            name: block.name,
            output: result.content,
            isError,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result.content),
            is_error: isError,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown tool error";
          emit({
            type: "tool-call-result",
            id: block.id,
            name: block.name,
            output: { error: msg },
            isError: true,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: ${msg}`,
            is_error: true,
          });
        }
      }

      history.push({ role: "user", content: toolResults });
    }

    emit({
      type: "error",
      message: `Exceeded max turns (${MAX_TURNS}) — conversation halted.`,
    });
  } catch (e) {
    console.error("[streamChat]", e);
    emit({
      type: "error",
      message: e instanceof Error ? e.message : "Unknown error",
    });
  }
}
