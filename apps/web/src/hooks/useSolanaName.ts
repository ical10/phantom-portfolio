import { useQuery } from "@tanstack/react-query";
import { resolveSolanaName } from "@/server/solana";

export function useSolanaName(name: string | null) {
  return useQuery<string>({
    queryKey: ["solana-name", name],
    queryFn: () => resolveSolanaName({ data: name! }),
    enabled: !!name,
    staleTime: 5 * 60_000,
  });
}
