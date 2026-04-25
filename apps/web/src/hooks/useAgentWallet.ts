import { useQuery } from "@tanstack/react-query";
import {
  AgentWalletAddressesResponseSchema,
  type AgentWalletAddressesResponse,
} from "@portfolio/shared";
import { useSolanaBalances } from "./useSolanaBalances";

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL ?? "";

// Fetches the agent wallet addresses from chat-api. Gated by `enabled` so we
// don't hit MCP until the chat panel actually opens.
export function useAgentWallet(enabled: boolean) {
  const addresses = useQuery<AgentWalletAddressesResponse>({
    queryKey: ["agent-wallet-addresses"],
    queryFn: async () => {
      if (!CHAT_API_URL) throw new Error("VITE_CHAT_API_URL is not set");
      const res = await fetch(`${CHAT_API_URL}/agent-wallet/addresses`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      return AgentWalletAddressesResponseSchema.parse(json);
    },
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const solanaAddr = addresses.data?.addresses.find(
    (a) => a.addressType === "Solana",
  )?.address;

  // Reuse existing Solana balance hook — surface the agent wallet's SOL
  // balance for the "Fund agent wallet" affordance.
  const balance = useSolanaBalances(solanaAddr ?? null);

  return {
    addresses: addresses.data?.addresses ?? [],
    isLoading: addresses.isLoading,
    isError: addresses.isError,
    error: addresses.error,
    solanaAddress: solanaAddr,
    solanaBalanceLamports: balance.data?.nativeBalance,
  };
}
