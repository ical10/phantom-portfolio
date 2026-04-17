import { useQuery } from "@tanstack/react-query";
import { fetchPrices, type FetchPricesResult } from "@/lib/coingecko";

export function usePrices(ids: string[]) {
  const sortedIds = [...ids].sort();

  return useQuery<FetchPricesResult>({
    queryKey: ["prices", sortedIds],
    queryFn: () => fetchPrices(sortedIds),
    staleTime: 60_000,
    enabled: sortedIds.length > 0,
  });
}
