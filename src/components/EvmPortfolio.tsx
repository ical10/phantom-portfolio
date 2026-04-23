import { useEvmBalances } from "@/hooks/useEvmBalances";
import { usePrices, useTokenPrices } from "@/hooks/usePrices";
import { NATIVE_CONFIG, type EvmChain } from "@/lib/evm-chains";
import { EvmChainSection } from "./EvmChainSection";

type Props = {
  address: string;
};

export function EvmPortfolio({ address }: Props) {
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

  if (balances.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading EVM balances...
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

  return (
    <>
      {balances.data.map((entry) => {
        const chain = entry.chain as EvmChain;
        return (
          <EvmChainSection
            key={entry.chain}
            entry={entry}
            nativePrice={pricesByChain[chain].native}
            tokenPrices={pricesByChain[chain].tokens}
          />
        );
      })}
    </>
  );
}
