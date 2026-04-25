import { Bot, Loader2 } from "lucide-react";
import { useAgentWallet } from "@/hooks/useAgentWallet";

type Props = {
  enabled: boolean;
};

export function AgentWalletStrip({ enabled }: Props) {
  const { solanaAddress, solanaBalanceLamports, isLoading, isError, error } =
    useAgentWallet(enabled);

  const sol =
    solanaBalanceLamports !== undefined
      ? Number(solanaBalanceLamports) / 1e9
      : undefined;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs">
      <Bot className="h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Agent wallet
        </span>
        {isLoading ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            connecting MCP…
          </span>
        ) : isError ? (
          <span className="truncate text-destructive">
            {error instanceof Error ? error.message : "MCP unavailable"}
          </span>
        ) : solanaAddress ? (
          <span className="truncate font-mono text-foreground">
            {solanaAddress.slice(0, 4)}…{solanaAddress.slice(-4)}
            {sol !== undefined && (
              <span className="ml-1.5 text-muted-foreground">
                · {sol.toFixed(3)} SOL
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Read-only
      </span>
    </div>
  );
}
