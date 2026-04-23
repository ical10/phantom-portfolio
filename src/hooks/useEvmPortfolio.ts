import { useEvmBalances } from "./useEvmBalances";
import { usePrices, useTokenPrices } from "./usePrices";
import { NATIVE_CONFIG, type EvmChain } from "@/lib/evm-chains";
import type { PortfolioEntry, Token } from "@/types/portfolio";

export type EvmChainSectionData = {
  chain: EvmChain;
  label: string;
  rows: Token[];
  total: number;
};

export type UseEvmPortfolioResult = {
  chains: EvmChainSectionData[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export function useEvmPortfolio(address: string | null): UseEvmPortfolioResult {
  const balances = useEvmBalances(address);

  const ethereumEntry = balances.data?.find((e) => e.chain === "ethereum");
  const polygonEntry = balances.data?.find((e) => e.chain === "polygon");

  const ethereumMints = ethereumEntry?.tokens.map((t) => t.mint) ?? [];
  const polygonMints = polygonEntry?.tokens.map((t) => t.mint) ?? [];

  const nativePrices = usePrices([
    NATIVE_CONFIG.ethereum.coinId,
    NATIVE_CONFIG.polygon.coinId,
  ]);
  const ethereumTokenPrices = useTokenPrices("ethereum", ethereumMints);
  const polygonTokenPrices = useTokenPrices("polygon", polygonMints);

  const pricesByChain: Record<
    EvmChain,
    { native?: number; tokens?: Record<string, number> }
  > = {
    ethereum: {
      native: nativePrices.data?.prices[NATIVE_CONFIG.ethereum.coinId],
      tokens: ethereumTokenPrices.data?.prices,
    },
    polygon: {
      native: nativePrices.data?.prices[NATIVE_CONFIG.polygon.coinId],
      tokens: polygonTokenPrices.data?.prices,
    },
  };

  const chains: EvmChainSectionData[] = balances.data
    ? balances.data.map((entry) =>
        buildChainSection(entry, pricesByChain[entry.chain as EvmChain]),
      )
    : [];

  const total = chains.reduce((s, c) => s + c.total, 0);

  return {
    chains,
    total,
    isLoading: balances.isLoading,
    isError: balances.isError,
    error: balances.error,
  };
}

function buildChainSection(
  entry: PortfolioEntry,
  prices: { native?: number; tokens?: Record<string, number> },
): EvmChainSectionData {
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
    usdPrice: prices.native,
    usdValue:
      prices.native !== undefined ? nativeAmount * prices.native : undefined,
  };

  const tokenRows: Token[] = entry.tokens.map((t) => {
    const usdPrice = prices.tokens?.[t.mint.toLowerCase()];
    const amount = Number(t.balance) / 10 ** t.decimals;
    return {
      ...t,
      usdPrice,
      usdValue: usdPrice !== undefined ? amount * usdPrice : undefined,
    };
  });

  const rows = [nativeRow, ...tokenRows];
  const total = rows.reduce((s, r) => s + (r.usdValue ?? 0), 0);

  return { chain, label: config.label, rows, total };
}
