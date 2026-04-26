import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAgentWallet } from "@/hooks/useAgentWallet";
import { useChat } from "@/hooks/useChat";
import { useEvmPortfolio } from "@/hooks/useEvmPortfolio";
import { useSolanaPortfolio } from "@/hooks/useSolanaPortfolio";
import { SOL_MINT } from "@/lib/constants";
import type { Holding, PortfolioContext } from "@portfolio/shared";
import { AgentWalletStrip } from "./AgentWalletStrip";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { EmptyState } from "./EmptyState";

type Props = {
  open: boolean;
  solanaAddress?: string | null;
  evmAddress?: string | null;
};

export function ChatPanel({ open, solanaAddress, evmAddress }: Props) {
  // Keep these hooks live whenever the panel is open so we always have the
  // latest snapshot to send. They also dedupe with the dashboard's queries
  // via React Query's queryKey, so this is essentially free.
  const sol = useSolanaPortfolio(solanaAddress ?? null);
  const evm = useEvmPortfolio(evmAddress ?? null);

  const buildPortfolio = useCallback((): PortfolioContext => {
    const all: Holding[] = [];

    for (const t of sol.rows) {
      if (t.usdPrice === undefined) continue;
      all.push({
        chain: "solana",
        symbol: t.symbol,
        mint: t.mint === SOL_MINT ? "native" : t.mint,
        balance: t.balance,
        decimals: t.decimals,
        usdValue: t.usdValue,
      });
    }
    for (const c of evm.chains) {
      for (const t of c.rows) {
        if (t.usdPrice === undefined) continue;
        all.push({
          chain: c.chain,
          symbol: t.symbol,
          mint: t.mint.startsWith("native-") ? "native" : t.mint,
          balance: t.balance,
          decimals: t.decimals,
          usdValue: t.usdValue,
        });
      }
    }

    all.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0));
    const topHoldings = all.slice(0, 30);
    const hiddenCount = Math.max(0, all.length - topHoldings.length);
    const hiddenValueUsd = all
      .slice(30)
      .reduce((s, h) => s + (h.usdValue ?? 0), 0);

    return {
      addresses: {
        solana: solanaAddress ?? undefined,
        ethereum: evmAddress ?? undefined,
      },
      topHoldings,
      hiddenCount,
      hiddenValueUsd: hiddenValueUsd > 0 ? hiddenValueUsd : undefined,
      totalUsd: sol.total + evm.total,
    };
  }, [sol.rows, sol.total, evm.chains, evm.total, solanaAddress, evmAddress]);

  const agent = useAgentWallet(open);
  const isFundedRef = useRef(agent.isFunded);
  isFundedRef.current = agent.isFunded;

  // Persist chat history per-wallet so a refresh doesn't blow away the
  // conversation. Keyed by Solana address first, EVM second; null in
  // watcher mode (no connected wallet to scope to).
  const storageKey = solanaAddress ?? evmAddress ?? null;

  // After every tool result, invalidate caches the tool may have touched.
  // For now: a successful `transfer` mutates the agent wallet's SOL
  // balance — refetch it so the strip updates without a manual reload.
  const queryClient = useQueryClient();
  const onToolResult = useCallback(
    (e: { name: string; output: unknown; isError: boolean }) => {
      if (e.isError) return;
      if (e.name === "transfer" && agent.solanaAddress) {
        void queryClient.invalidateQueries({
          queryKey: ["solana-balances", agent.solanaAddress],
        });
      }
    },
    [queryClient, agent.solanaAddress],
  );

  const { messages, sendMessage, abort, reset, isStreaming, error } = useChat({
    buildPortfolio,
    getWriteMode: () => isFundedRef.current,
    storageKey,
    onToolResult,
  });

  // Sentinel at the end of the message list — scroll into view on append
  // to keep the conversation pinned to the bottom.
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const showEmpty = messages.length === 0 && !isStreaming;

  const placeholder = useMemo(() => {
    if (!solanaAddress && !evmAddress) {
      return "Connect a wallet first to chat about your portfolio…";
    }
    return "Ask about your portfolio…";
  }, [solanaAddress, evmAddress]);

  return (
    <div className="flex h-[560px] w-[380px] flex-col gap-3 p-3 sm:w-[420px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-foreground">Portfolio chat</h3>
          <p className="text-[11px] text-muted-foreground">
            Read-only · powered by Phantom MCP
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      <AgentWalletStrip enabled={open} />

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-w-0 flex-col gap-3 px-1 py-1">
          {showEmpty && (
            <EmptyState
              hasWallet={!!(solanaAddress || evmAddress)}
              onPick={(prompt) => sendMessage(prompt)}
            />
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div ref={endRef} aria-hidden />
        </div>
      </ScrollArea>

      <ChatInput
        onSend={sendMessage}
        onAbort={abort}
        isStreaming={isStreaming}
        placeholder={placeholder}
      />
    </div>
  );
}

