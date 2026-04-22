import { useQuery } from "@tanstack/react-query";
import { fetchSolanaPrices } from "@/server/jupiter";

export function useSolanaPrices(mints: string[]) {
  const sortedMints = [...mints].sort();

  return useQuery<Record<string, number>>({
    queryKey: ["solana-prices", sortedMints],
    queryFn: () => fetchSolanaPrices({ data: sortedMints }),
    staleTime: 30_000,
    enabled: sortedMints.length > 0,
  });
}
