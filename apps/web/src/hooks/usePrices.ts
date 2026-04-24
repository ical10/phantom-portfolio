import { useQuery } from "@tanstack/react-query";
import {
  fetchCoinIdPrices,
  fetchContractPrices,
} from "@/server/coingecko";
import type { FetchPricesResult } from "@/lib/coingecko";
import type { Chain } from "@/types/portfolio";

type EvmChain = Exclude<Chain, "solana">;

export function usePrices(ids: string[]) {
  const sortedIds = [...ids].sort();

  return useQuery<FetchPricesResult>({
    queryKey: ["prices", sortedIds],
    queryFn: () => fetchCoinIdPrices({ data: sortedIds }),
    staleTime: 60_000,
    enabled: sortedIds.length > 0,
  });
}

export function useTokenPrices(chain: EvmChain, addresses: string[]) {
  const normalized = [...addresses].map((a) => a.toLowerCase()).sort();

  return useQuery<FetchPricesResult>({
    queryKey: ["token-prices", chain, normalized],
    queryFn: () =>
      fetchContractPrices({ data: { chain, addresses: normalized } }),
    staleTime: 60_000,
    enabled: normalized.length > 0,
  });
}
