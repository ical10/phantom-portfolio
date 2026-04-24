import { useSolanaPortfolio } from "@/hooks/useSolanaPortfolio";
import { JupiterAttribution } from "./JupiterAttribution";
import { PriceErrorBanner } from "./PriceErrorBanner";
import { TokenTable } from "./TokenTable";
import { TokenTableSkeleton } from "./TokenTableSkeleton";

type Props = {
  address: string;
};

export function SolanaPortfolio({ address }: Props) {
  const { rows, isLoading, isError, error, pricesError } =
    useSolanaPortfolio(address);

  return (
    <>
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Solana
        </h2>

        {isLoading ? (
          <TokenTableSkeleton />
        ) : isError ? (
          <div className="text-sm text-destructive">
            Failed to load balances:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : (
          <>
            {pricesError && <PriceErrorBanner source="Solana" />}
            <TokenTable tokens={rows} hideUnpriced={!pricesError} />
          </>
        )}
      </section>
      {!isLoading && !isError && !pricesError && <JupiterAttribution />}
    </>
  );
}
