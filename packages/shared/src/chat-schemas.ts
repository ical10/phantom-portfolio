import { z } from "zod";

// A single holding projected from the dashboard's portfolio hooks.
// Compact on purpose — we only send the top-N by USD value to Claude.
export const HoldingSchema = z.object({
  chain: z.enum(["solana", "ethereum", "polygon"]),
  symbol: z.string(),
  // SPL mint (Solana) or contract address (EVM). "native" for gas tokens.
  mint: z.string(),
  balance: z.string(),
  decimals: z.number().int().min(0).max(36),
  usdValue: z.number().optional(),
});

export const PortfolioContextSchema = z.object({
  addresses: z.object({
    solana: z.string().optional(),
    ethereum: z.string().optional(),
  }),
  topHoldings: z.array(HoldingSchema).max(30),
  hiddenCount: z.number().int().min(0),
  hiddenValueUsd: z.number().optional(),
  totalUsd: z.number(),
});

// Persisted message history. Tool calls and results are first-class entries
// so scrollback shows the full MCP trail.
export const ChatMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().min(1).max(4000) }),
  z.object({ role: z.literal("assistant"), content: z.string() }),
  z.object({
    role: z.literal("tool-call"),
    id: z.string(),
    name: z.string(),
    input: z.unknown(),
  }),
  z.object({
    role: z.literal("tool-result"),
    id: z.string(),
    name: z.string(),
    output: z.unknown(),
    isError: z.boolean().optional(),
  }),
]);

// POST /chat request body. Schema max 100 is an abuse guard; the server
// additionally trims to the last 20 turns before calling Claude (cost cap).
export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).max(100),
  portfolio: PortfolioContextSchema,
});

// SSE payload from /chat.
export const StreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("token"), delta: z.string() }),
  z.object({
    type: z.literal("tool-call-start"),
    id: z.string(),
    name: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal("tool-call-result"),
    id: z.string(),
    name: z.string(),
    output: z.unknown(),
    isError: z.boolean(),
  }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

// Generic pass-through of MCP's get_wallet_addresses response.
// Shape unverified — tighten after first live MCP call.
export const AgentWalletAddressSchema = z.object({
  type: z.string(),
  address: z.string(),
});

export const AgentWalletAddressesResponseSchema = z.object({
  addresses: z.array(AgentWalletAddressSchema),
});
