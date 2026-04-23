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
};

export function TokenTable({ tokens }: Props) {
  const [sort, setSort] = useState<SortState<SortKey>>({
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
