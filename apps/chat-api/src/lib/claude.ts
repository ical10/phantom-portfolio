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
import { requireEnv } from "@portfolio/shared";

const ANTHROPIC_API_KEY = requireEnv(
  process.env.ANTHROPIC_API_KEY,
  "ANTHROPIC_API_KEY",
);
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

// Read-only MCP tools.
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

const MAX_TURNS = 5;
const MAX_TOKENS = 4096;
const TOOL_CALL_TIMEOUT_MS = 30_000;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Module-level MCP client + tool list. One subprocess per server process,
// not per request. Simulating Claude Code on a backend server.
let mcpClient: Client | null = null;
let mcpClientPromise: Promise<Client> | null = null;
let mcpTools: Tool[] = [];

async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;
  if (mcpClientPromise) return mcpClientPromise;
  mcpClientPromise = (async () => {
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@phantom/mcp-server@latest"],
      env: process.env as Record<string, string>,
    });
    const client = new Client(
      { name: "phantom-portfolio-chat", version: "0.1.0" },
      { capabilities: {} },
    );
    await client.connect(transport);
    const { tools } = await client.listTools();
    mcpTools = tools
      .filter((t) => ALLOWED_READ_TOOLS.has(t.name))
      .map((t) => ({
        name: t.name,
        description: t.description ?? "",
        input_schema: t.inputSchema as Tool.InputSchema,
      }));
    mcpClient = client;
    return client;
  })();
  return mcpClientPromise;
}

export async function getAgentWalletAddresses(): Promise<unknown> {
  const client = await getMcpClient();
  const result = await client.callTool({
    name: "wallet_addresses",
    arguments: {},
  });
  return result;
}

export function buildSystemPrompt(portfolio: PortfolioContext): string {
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

  const toolNames = mcpTools.map((t) => t.name).join(", ") || "(none yet)";

  return `You are an assistant embedded in a multi-chain portfolio dashboard.

Connected user wallet:
${addrs || "  (none connected)"}

User's portfolio snapshot (use THIS for holdings questions — do NOT call any balance tool for it):
${holdings}${hidden}
  total: $${portfolio.totalUsd.toFixed(2)}

Available Phantom MCP tools: ${toolNames}

Rules:
- For questions about the user's holdings, use the snapshot above. Don't call balance tools.
- For transaction simulation, token allowances, and Hyperliquid perp reads, call the MCP tools.
- Write tools (transfer, swap, perp open/close) are DISABLED in v1.
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

  const pushAssistantBlock = (block: ContentBlockParam) => {
    const last = out[out.length - 1];
    if (last?.role === "assistant") {
      if (typeof last.content === "string") {
        last.content = [
          { type: "text", text: last.content },
          block,
        ] as ContentBlockParam[];
      } else {
        (last.content as ContentBlockParam[]).push(block);
      }
    } else {
      out.push({ role: "assistant", content: [block] });
    }
  };

  const pushUserBlock = (block: ContentBlockParam) => {
    const last = out[out.length - 1];
    if (last?.role === "user" && Array.isArray(last.content)) {
      (last.content as ContentBlockParam[]).push(block);
    } else {
      out.push({ role: "user", content: [block] });
    }
  };

  for (const m of msgs) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      if (m.content) pushAssistantBlock({ type: "text", text: m.content });
    } else if (m.role === "tool-call") {
      pushAssistantBlock({
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
      pushUserBlock(block);
    }
  }

  return out;
}

export async function streamChat(
  messages: ChatMessage[],
  portfolio: PortfolioContext,
  emit: (event: StreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  try {
    const client = await getMcpClient();
    const systemPrompt = buildSystemPrompt(portfolio);
    const history = translateHistory(messages);

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (signal.aborted) return;

      const stream = anthropic.messages.stream(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          tools: mcpTools,
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
    emit({
      type: "error",
      message: e instanceof Error ? e.message : "Unknown error",
    });
  }
}
