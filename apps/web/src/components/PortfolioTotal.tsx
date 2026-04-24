import { Skeleton } from "@/components/ui/skeleton";
import { useEvmPortfolio } from "@/hooks/useEvmPortfolio";
import { useSolanaPortfolio } from "@/hooks/useSolanaPortfolio";

type Props = {
  solanaAddress?: string | null;
  evmAddress?: string | null;
  isLoading?: boolean;
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function PortfolioTotal({
  solanaAddress,
  evmAddress,
  isLoading,
}: Props) {
  const sol = useSolanaPortfolio(solanaAddress ?? null);
  const evm = useEvmPortfolio(evmAddress ?? null);

  const loading =
    isLoading === true ||
    (!!solanaAddress && sol.isLoading) ||
    (!!evmAddress && evm.isLoading);

  const total = sol.total + evm.total;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Total Value
      </p>
      {loading ? (
        <Skeleton className="h-9 w-40" />
      ) : (
        <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
          {usdFormatter.format(total)}
        </p>
      )}
    </div>
  );
}
