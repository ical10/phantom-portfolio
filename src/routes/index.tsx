import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ConnectButton } from "@/components/ConnectButton";
import { WatcherInput } from "@/components/WatcherInput";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-24">
      {/* Brand glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />

      <div className="relative flex w-full max-w-xl flex-col gap-10">
        <header className="flex flex-col items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Wallet className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Smart Portfolio
            </h1>
            <p className="text-lg text-muted-foreground">
              View token balances across Solana, Ethereum, and Polygon. Connect
              a wallet or paste any address to watch.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connect
            </h2>
            <ConnectButton />
          </section>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Watch any address
            </h2>
            <WatcherInput />
          </section>
        </div>
      </div>
    </main>
  );
}
