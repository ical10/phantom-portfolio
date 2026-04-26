import { useState } from "react";
import { useSolana } from "@phantom/react-sdk";
import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRecentBlockhash } from "@/server/solanaTransfer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromAddress: string;
  agentAddress: string;
  onFunded: () => void;
};

const DEFAULT_AMOUNT = "0.05";

export function FundAgentDialog({
  open,
  onOpenChange,
  fromAddress,
  agentAddress,
  onFunded,
}: Props) {
  const { solana } = useSolana();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const reset = () => {
    setAmount(DEFAULT_AMOUNT);
    setIsSending(false);
    setError(null);
    setSignature(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sol = Number(amount);
    if (!Number.isFinite(sol) || sol <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    const lamports = Math.round(sol * 1e9);

    setIsSending(true);
    try {
      const { blockhash } = await getRecentBlockhash();
      const message = new TransactionMessage({
        payerKey: new PublicKey(fromAddress),
        recentBlockhash: blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: new PublicKey(fromAddress),
            toPubkey: new PublicKey(agentAddress),
            lamports,
          }),
        ],
      }).compileToV0Message();
      const tx = new VersionedTransaction(message);

      const result = await solana.signAndSendTransaction(tx);
      setSignature(result.signature);
      // Give the network a beat to surface the new balance, then refetch.
      setTimeout(() => onFunded(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fund agent wallet</DialogTitle>
          <DialogDescription>
            Send SOL from your connected wallet to the agent wallet to unlock
            on-chain actions in chat. The agent wallet is custodied by Phantom
            MCP and only signs after you approve each action.
          </DialogDescription>
        </DialogHeader>

        {signature ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground">
              Sent {amount} SOL to{" "}
              <span className="font-mono">
                {agentAddress.slice(0, 4)}…{agentAddress.slice(-4)}
              </span>
              .
            </p>
            <a
              href={`https://solscan.io/tx/${signature}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View on Solscan
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="mt-2"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="fund-amount"
                className="text-xs font-medium text-foreground"
              >
                Amount (SOL)
              </label>
              <Input
                id="fund-amount"
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSending}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Recipient:{" "}
                <span className="font-mono">
                  {agentAddress.slice(0, 4)}…{agentAddress.slice(-4)}
                </span>
              </p>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {isSending ? "Sending…" : "Send"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
