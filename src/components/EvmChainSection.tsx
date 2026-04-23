import { NATIVE_CONFIG, type EvmChain } from "@/lib/evm-chains";
import type { PortfolioEntry, Token } from "@/types/portfolio";
import { TokenTable } from "./TokenTable";

type Props = {
  entry: PortfolioEntry;
  nativePrice: number | undefined;
  tokenPrices: Record<string, number> | undefined;
};

export function EvmChainSection({ entry, nativePrice, tokenPrices }: Props) {
  const chain = entry.chain as EvmChain;
  const config = NATIVE_CONFIG[chain];

  const nativeAmount = Number(entry.nativeBalance) / 1e18;
  const nativeRow: Token = {
    mint: `native-${chain}`,
    symbol: config.symbol,
    name: config.name,
    balance: entry.nativeBalance,
    decimals: 18,
    logoUri: config.logoUri,
    usdPrice: nativePrice,
    usdValue:
      nativePrice !== undefined ? nativeAmount * nativePrice : undefined,
  };

  const tokenRows: Token[] = entry.tokens.map((t) => {
    const usdPrice = tokenPrices?.[t.mint.toLowerCase()];
    const amount = Number(t.balance) / 10 ** t.decimals;
    return {
      ...t,
      usdPrice,
      usdValue: usdPrice !== undefined ? amount * usdPrice : undefined,
    };
  });

  const rows: Token[] = [nativeRow, ...tokenRows];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {config.label}
      </h2>

      <TokenTable tokens={rows} />
    </section>
  );
}
