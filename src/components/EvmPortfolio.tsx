import { useEvmPortfolio } from "@/hooks/useEvmPortfolio";
import { NATIVE_CONFIG } from "@/lib/evm-chains";
import { EvmChainSection } from "./EvmChainSection";
import { TokenTableSkeleton } from "./TokenTableSkeleton";

type Props = {
  address: string;
};

export function EvmPortfolio({ address }: Props) {
  const { chains, isLoading, isError, error } = useEvmPortfolio(address);

  if (isLoading) {
    return (
      <>
        {(["ethereum", "polygon"] as const).map((c) => (
          <section
            key={c}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {NATIVE_CONFIG[c].label}
            </h2>
            <TokenTableSkeleton />
          </section>
        ))}
      </>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-destructive">
        Failed to load EVM balances:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return (
    <>
      {chains.map((c) => (
        <EvmChainSection key={c.chain} data={c} />
      ))}
    </>
  );
}
