import { useSolanaBalances } from "./useSolanaBalances";
import { useSolanaPrices } from "./useSolanaPrices";
import type { Token } from "@/types/portfolio";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const SOL_LOGO =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

export type UseSolanaPortfolioResult = {
  rows: Token[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  pricesError: boolean;
};

export function useSolanaPortfolio(
  address: string | null,
): UseSolanaPortfolioResult {
  const balances = useSolanaBalances(address);

  const mints = balances.data
    ? [SOL_MINT, ...balances.data.tokens.map((t) => t.mint)]
    : [];

  const prices = useSolanaPrices(mints);

  const rows: Token[] = balances.data
    ? [
        {
          mint: SOL_MINT,
          symbol: "SOL",
          name: "Solana",
          balance: balances.data.nativeBalance,
          decimals: 9,
          logoUri: SOL_LOGO,
        },
        ...balances.data.tokens,
      ].map((t) => {
        const usdPrice = prices.data?.[t.mint];
        const amount = Number(t.balance) / 10 ** t.decimals;
        return {
          ...t,
          usdPrice,
          usdValue: usdPrice !== undefined ? amount * usdPrice : undefined,
        };
      })
    : [];

  const total = rows.reduce((sum, r) => sum + (r.usdValue ?? 0), 0);

  return {
    rows,
    total,
    isLoading: balances.isLoading || prices.isLoading,
    isError: balances.isError,
    error: balances.error,
    pricesError: prices.isError,
  };
}
