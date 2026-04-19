import { fetchAssetMetadata, fetchTokenBalances } from "@/lib/solana";
import { PortfolioEntry, Token } from "@/types/portfolio";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

async function fetchSolanaPortfolio(address: string): Promise<PortfolioEntry> {
  const owner = new PublicKey(address);
  const { lamports, tokens: rawTokens } = await fetchTokenBalances(owner);

  const mints = rawTokens.map((t) => t.mint);
  const metadata = await fetchAssetMetadata(mints);

  const tokens: Token[] = rawTokens.map((t) => {
    const meta = metadata[t.mint];
    return {
      mint: t.mint,
      balance: t.balance,
      decimals: t.decimals,
      symbol: meta?.symbol ?? t.mint.slice(0, 4),
      name: meta?.name ?? "Unknown Token",
      logoUri: meta?.logoUri,
    };
  });

  return { chain: "solana", nativeBalance: lamports, tokens };
}

export function useSolanaBalances(address: string | null) {
  return useQuery({
    queryKey: ["solana-balances", address],
    queryFn: () => fetchSolanaPortfolio(address!),
    enabled: !!address,
    staleTime: 30_000,
  });
}
