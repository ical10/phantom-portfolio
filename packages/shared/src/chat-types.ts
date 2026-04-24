import type { z } from "zod";
import type {
  AgentWalletAddressSchema,
  AgentWalletAddressesResponseSchema,
  ChatMessageSchema,
  ChatRequestSchema,
  HoldingSchema,
  PortfolioContextSchema,
  StreamEventSchema,
} from "./chat-schemas";

// Types are inferred from the Zod schemas so there's a single source of truth.
export type Holding = z.infer<typeof HoldingSchema>;
export type PortfolioContext = z.infer<typeof PortfolioContextSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
export type AgentWalletAddress = z.infer<typeof AgentWalletAddressSchema>;
export type AgentWalletAddressesResponse = z.infer<
  typeof AgentWalletAddressesResponseSchema
>;
