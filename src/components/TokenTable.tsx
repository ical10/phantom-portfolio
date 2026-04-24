import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortButton, type SortState } from "./SortButton";
import { TokenTableRow, getAmount } from "./TokenTableRow";
import type { Token } from "@/types/portfolio";

type SortKey = "token" | "price" | "amount" | "value";

type Props = {
  tokens: Token[];
  hideUnpriced?: boolean;
};

const DEFAULT_VISIBLE = 20;

export function TokenTable({ tokens, hideUnpriced = true }: Props) {
  const [sort, setSort] = useState<SortState<SortKey>>({
    key: "value",
    direction: "desc",
  });
  const [expanded, setExpanded] = useState(false);

  const priced = useMemo(
    () =>
      hideUnpriced ? tokens.filter((t) => t.usdPrice !== undefined) : tokens,
    [tokens, hideUnpriced],
  );
  const hiddenCount = tokens.length - priced.length;

  const sorted = useMemo(() => {
    const copy = [...priced];
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
  }, [priced, sort]);

  const visible = expanded ? sorted : sorted.slice(0, DEFAULT_VISIBLE);
  const overflow = sorted.length - visible.length;

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "token" ? "asc" : "desc" },
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
          {visible.map((token) => (
            <TokenTableRow key={token.mint} token={token} />
          ))}
        </TableBody>
      </Table>
      {(overflow > 0 || expanded || hiddenCount > 0) && (
        <div className="flex items-center justify-between gap-3 px-2 text-xs text-muted-foreground">
          {overflow > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="font-medium text-foreground underline decoration-dotted underline-offset-2 hover:text-primary"
            >
              Show {overflow} more
            </button>
          ) : expanded && sorted.length > DEFAULT_VISIBLE ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="font-medium text-foreground underline decoration-dotted underline-offset-2 hover:text-primary"
            >
              Show less
            </button>
          ) : (
            <span />
          )}
          {hiddenCount > 0 && (
            <span>
              {hiddenCount} unpriced {hiddenCount === 1 ? "token" : "tokens"}{" "}
              hidden
            </span>
          )}
        </div>
      )}
    </div>
  );
}
