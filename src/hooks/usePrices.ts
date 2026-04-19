import { useQuery } from "@tanstack/react-query";
import {
  fetchPricesByCoinId,
  fetchPricesByContract,
  type FetchPricesResult,
} from "@/lib/coingecko";
import { Chain } from "@/types/portfolio";

export function usePrices(ids: string[]) {
  const sortedIds = [...ids].sort();

  return useQuery<FetchPricesResult>({
    queryKey: ["prices", sortedIds],
    queryFn: () => fetchPricesByCoinId(sortedIds),
    staleTime: 60_000,
    enabled: sortedIds.length > 0,
  });
}

export function useTokenPrices(chain: Chain, addresses: string[]) {
  const normalized =
    chain === "solana"
      ? [...addresses].sort()
      : [...addresses].map((a) => a.toLowerCase()).sort();

  return useQuery<FetchPricesResult>({
    queryKey: ["token-prices", chain, normalized],
    queryFn: () => fetchPricesByContract(chain, normalized),
    staleTime: 60_000,
    enabled: normalized.length > 0,
  });
}
