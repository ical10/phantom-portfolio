type EmptyStateProps = {
  hasWallet: boolean;
  onPick: (prompt: string) => void;
};

export function EmptyState({ hasWallet, onPick }: EmptyStateProps) {
  const suggestions = hasWallet
    ? [
        "What tokens do I hold?",
        "Simulate a swap of 0.1 SOL to USDC",
        "Show my Hyperliquid positions",
      ]
    : ["Tell me about Phantom MCP", "What can this chat do?"];

  return (
    <div className="flex flex-col gap-2 px-1 pt-2 text-xs">
      <p className="text-muted-foreground">
        Ask anything about{" "}
        {hasWallet ? "your portfolio" : "the portfolio dashboard"}.
      </p>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
