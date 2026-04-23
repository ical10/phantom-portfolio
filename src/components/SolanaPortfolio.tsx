import { useSolanaBalances } from "@/hooks/useSolanaBalances";
import { useSolanaPrices } from "@/hooks/useSolanaPrices";
import type { Token } from "@/types/portfolio";
import { TokenTable } from "./TokenTable";

type Props = {
  address: string;
};

const SOL_MINT = "So11111111111111111111111111111111111111112";

export function SolanaPortfolio({ address }: Props) {
  const balances = useSolanaBalances(address);

  const mints = balances.data
    ? [SOL_MINT, ...balances.data.tokens.map((t) => t.mint)]
    : [];

  const prices = useSolanaPrices(mints);

  if (balances.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading Solana balances...
      </div>
    );
  }

  if (balances.isError) {
    return (
      <div className="text-sm text-destructive">
        Failed to load balances:{" "}
        {balances.error instanceof Error
          ? balances.error.message
          : "Unknown error"}
      </div>
    );
  }

  if (!balances.data) return null;

  const nativeSol: Token = {
    mint: SOL_MINT,
    symbol: "SOL",
    name: "Solana",
    balance: balances.data.nativeBalance,
    decimals: 9,
    logoUri:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  };

  const rows: Token[] = [nativeSol, ...balances.data.tokens].map((t) => {
    const usdPrice = prices.data?.[t.mint];
    const amount = Number(t.balance) / 10 ** t.decimals;
    return {
      ...t,
      usdPrice,
      usdValue: usdPrice !== undefined ? amount * usdPrice : undefined,
    };
  });

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Solana
      </h2>

      <TokenTable tokens={rows} />
    </section>
  );
}
