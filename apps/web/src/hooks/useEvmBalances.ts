import { useQuery } from "@tanstack/react-query";
import { fetchEvmPortfolio } from "@/server/evm";
import type { PortfolioEntry } from "@/types/portfolio";

export function useEvmBalances(address: string | null) {
  return useQuery<PortfolioEntry[]>({
    queryKey: ["evm-balances", address],
    queryFn: () =>
      Promise.all([
        fetchEvmPortfolio({ data: { chain: "ethereum", address: address! } }),
        fetchEvmPortfolio({ data: { chain: "polygon", address: address! } }),
      ]),
    enabled: !!address,
    staleTime: 30_000,
  });
}
