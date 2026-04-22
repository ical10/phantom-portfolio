export function TokenListHeader() {
  return (
    <div className="flex items-center gap-4 border-b border-zinc-200 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
      <span className="min-w-0 flex-1">Token</span>
      <span className="w-24 text-right">Price</span>
      <span className="w-28 text-right">Amount</span>
      <span className="w-24 text-right">Value</span>
    </div>
  );
}
