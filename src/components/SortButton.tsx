import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  direction: SortDirection;
};

type Props<K extends string> = {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onToggle: (key: K) => void;
};

export function SortButton<K extends string>({
  label,
  sortKey,
  sort,
  onToggle,
}: Props<K>) {
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
