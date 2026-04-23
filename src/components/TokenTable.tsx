import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Token } from "@/types/portfolio";

type SortKey = "token" | "price" | "amount" | "value";
type SortDirection = "asc" | "desc";
type SortState = { key: SortKey; direction: SortDirection };

type Props = {
  tokens: Token[];
};

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

function getAmount(token: Token): number {
  return Number(token.balance) / 10 ** token.decimals;
}

export function TokenTable({ tokens }: Props) {
  const [sort, setSort] = useState<SortState>({
    key: "value",
    direction: "desc",
  });

  const sorted = useMemo(() => {
    const copy = [...tokens];
    const dir = sort.direction === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sort.key) {
        case "token":
          return (a.symbol || "").localeCompare(b.symbol || "") * dir;
        case "price":
          return ((a.usdPrice ?? -Infinity) - (b.usdPrice ?? -Infinity)) * dir;
        case "amount":
          return (getAmount(a) - getAmount(b)) * dir;
        case "value":
          return ((a.usdValue ?? -Infinity) - (b.usdValue ?? -Infinity)) * dir;
      }
    });
    return copy;
  }, [tokens, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "token" ? "asc" : "desc" },
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <SortButton
              label="Token"
              sortKey="token"
              sort={sort}
              onToggle={toggleSort}
            />
          </TableHead>
          <TableHead className="w-28 text-right">
            <SortButton
              label="Price"
              sortKey="price"
              sort={sort}
              onToggle={toggleSort}
            />
          </TableHead>
          <TableHead className="w-32 text-right">
            <SortButton
              label="Amount"
              sortKey="amount"
              sort={sort}
              onToggle={toggleSort}
            />
          </TableHead>
          <TableHead className="w-28 text-right">
            <SortButton
              label="Value"
              sortKey="value"
              sort={sort}
              onToggle={toggleSort}
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((token) => (
          <TokenTableRow key={token.mint} token={token} />
        ))}
      </TableBody>
    </Table>
  );
}

function SortButton({
  label,
  sortKey,
  sort,
  onToggle,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onToggle: (key: SortKey) => void;
}) {
  const isActive = sort.key === sortKey;
  const Icon = !isActive
    ? ArrowUpDown
    : sort.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
        isActive ? "text-foreground" : "text-zinc-500 hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <Icon className="h-3 w-3" />
    </button>
  );
}

function TokenTableRow({ token }: { token: Token }) {
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
              className="h-8 w-8 flex-shrink-0 rounded-full"
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
