import { TableCell, TableRow } from "@/components/ui/table";
import type { Token } from "@/types/portfolio";

const usdLargeFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const usdSmallFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumSignificantDigits: 4,
});

function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  const abs = Math.abs(value);
  if (abs >= 0.01) return usdLargeFormatter.format(value);
  if (abs >= 1e-8) return usdSmallFormatter.format(value);
  return `$${value.toExponential(2)}`;
}

const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
});

export function getAmount(token: Token): number {
  return Number(token.balance) / 10 ** token.decimals;
}

type Props = {
  token: Token;
};

export function TokenTableRow({ token }: Props) {
  const displaySymbol = token.symbol || token.mint.slice(0, 4);
  const amount = getAmount(token);

  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <div className="flex items-center gap-3">
          {token.logoUri ? (
            <img
              src={token.logoUri}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {displaySymbol.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{displaySymbol}</span>
            <span className="truncate text-xs text-zinc-500">{token.name}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono text-sm text-zinc-500">
        {token.usdPrice !== undefined ? formatUsd(token.usdPrice) : "—"}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {amountFormatter.format(amount)}
      </TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">
        {token.usdValue !== undefined ? formatUsd(token.usdValue) : "—"}
      </TableCell>
    </TableRow>
  );
}
