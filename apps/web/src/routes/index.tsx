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
      {/* Dot-grid field, masked to fade where the content lives */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--muted-foreground) 35%, transparent) 1.2px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at center, transparent 0%, black 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at center, transparent 0%, black 85%)",
        }}
      />

      {/* Three drifting orbs on the background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-125 w-175 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
        style={{ animation: "orb-float-1 22s ease-in-out infinite" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-12%] top-[28%] h-95 w-95 rounded-full bg-chart-2/25 blur-3xl"
        style={{ animation: "orb-float-2 18s ease-in-out infinite" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[8%] left-[-10%] h-75 w-75 rounded-full bg-chart-3/20 blur-3xl"
        style={{ animation: "orb-float-1 28s ease-in-out infinite" }}
      />

      <div className="relative flex w-full max-w-xl flex-col gap-10">
        <header className="flex flex-col items-start gap-5">
          {/* Icon tile — gradient + glow, scales on hover */}
          <div className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-chart-3 text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/30 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-primary/50">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-white/25 to-transparent" />
            <Wallet className="relative h-7 w-7" strokeWidth={2.25} />
          </div>

          <div className="flex flex-col gap-2.5">
            <h1 className="bg-linear-to-br from-foreground via-foreground to-primary bg-clip-text text-5xl font-semibold tracking-tight text-transparent">
              Smart Portfolio
            </h1>
            <p className="text-lg text-muted-foreground">
              Any portfolio, clearly explained. Ask what tokens you own, how
              much the balance, what to swap — across Solana, Ethereum, and
              Polygon. Connect your wallet or paste any address.
            </p>
          </div>
        </header>

        {/* Action card */}
        <div className="group relative overflow-hidden rounded-2xl shadow-xl shadow-primary/5 transition-shadow duration-500 hover:shadow-2xl hover:shadow-primary/10">
          {/* Rotating border line */}
          <div
            aria-hidden
            className="pointer-events-none absolute h-24999.5 w-24999.5"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background:
                "conic-gradient(transparent, var(--primary), transparent 25%)",
              animation: "card-rotate 4s linear infinite",
            }}
          />

          {/* Inner card body  */}
          <div className="relative m-0.5 flex flex-col gap-8 rounded-[calc(var(--radius-2xl)-2px)] bg-card p-6">
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <LiveDot />
                Connect
              </h2>
              <ConnectButton />
            </section>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-linear-to-r from-transparent to-border" />
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                or
              </span>
              <div className="h-px flex-1 bg-linear-to-l from-transparent to-border" />
            </div>

            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <LiveDot />
                Watch any address
              </h2>
              <WatcherInput />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
    </span>
  );
}
