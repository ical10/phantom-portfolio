import { fetchEvmPortfolio } from "@/lib/evm";
import type { PortfolioEntry } from "@/types/portfolio";
import { useQuery } from "@tanstack/react-query";

export function useEvmBalances(address: string | null) {
  return useQuery<PortfolioEntry[]>({
    queryKey: ["evm-balances", address],
    queryFn: () =>
      Promise.all([
        fetchEvmPortfolio("ethereum", address!),
        fetchEvmPortfolio("polygon", address!),
      ]),
    enabled: !!address,
    staleTime: 30_000,
  });
}
