import { useQuery } from "@tanstack/react-query";
import { fetchSolanaPortfolio } from "@/server/solana";
import type { PortfolioEntry } from "@/types/portfolio";

export function useSolanaBalances(address: string | null) {
  return useQuery<PortfolioEntry>({
    queryKey: ["solana-balances", address],
    queryFn: () => fetchSolanaPortfolio({ data: address! }),
    enabled: !!address,
    staleTime: 30_000,
  });
}
