import { useState } from "react";
import { AddressType, useAccounts } from "@phantom/react-sdk";
import { Bot, Loader2, Wallet } from "lucide-react";
import { DEMO_WRITE_CAPS } from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { useAgentWallet } from "@/hooks/useAgentWallet";
import { FundAgentDialog } from "./FundAgentDialog";

type Props = {
  enabled: boolean;
};

export function AgentWalletStrip({ enabled }: Props) {
  const {
    solanaAddress,
    solanaBalanceLamports,
    isLoading,
    isError,
    error,
    isFunded,
    refetchBalance,
  } = useAgentWallet(enabled);

  // Fund flow needs a connected Solana wallet to sign the transfer. In
  // watcher mode (no Phantom connection) the button is hidden.
  const accounts = useAccounts();
  const connectedSolana =
    accounts?.find((a) => a.addressType === AddressType.solana)?.address ??
    null;

  const [fundOpen, setFundOpen] = useState(false);

  const sol =
    solanaBalanceLamports !== undefined
      ? Number(solanaBalanceLamports) / 1e9
      : undefined;

  const canFund = !!connectedSolana && !!solanaAddress;

  const capLabel = `Demo: ${DEMO_WRITE_CAPS.tool} ≤ ${DEMO_WRITE_CAPS.maxSol} ${DEMO_WRITE_CAPS.symbol}`;

  return (
    <>
      <div className="flex flex-col gap-1">
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
        {!canFund ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Read-only
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            {isFunded && (
              <span
                title={capLabel}
                className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary"
              >
                Write enabled
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFundOpen(true)}
              className="h-6 px-2 text-[10px]"
            >
              <Wallet className="mr-1 h-3 w-3" />
              {isFunded ? "Top up" : "Fund"}
            </Button>
          </div>
        )}
      </div>
        {isFunded && (
          <p className="px-0.5 text-[10px] leading-tight text-muted-foreground">
            {capLabel} · this is a demo build, not production.
          </p>
        )}
      </div>

      {canFund && (
        <FundAgentDialog
          open={fundOpen}
          onOpenChange={setFundOpen}
          fromAddress={connectedSolana}
          agentAddress={solanaAddress}
          onFunded={() => {
            void refetchBalance();
          }}
        />
      )}
    </>
  );
}
