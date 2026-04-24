import { AddressType, useAccounts, usePhantom } from "@phantom/react-sdk";
import { BackToHome } from "@/components/BackToHome";
import { EvmPortfolio } from "@/components/EvmPortfolio";
import { PortfolioTotal } from "@/components/PortfolioTotal";
import { SolanaPortfolio } from "@/components/SolanaPortfolio";
import { TokenTableSkeleton } from "@/components/TokenTableSkeleton";

export function ConnectedDashboard() {
  const { isLoading } = usePhantom();
  const accounts = useAccounts();

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-2xl lg:max-w-3xl flex-col gap-8 px-6 py-12">
        <BackToHome />
        <header className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Connected Account Mode
          </p>
          <PortfolioTotal isLoading />
        </header>
        {(["Solana", "Ethereum", "Polygon"] as const).map((label) => (
          <section
            key={label}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </h2>
            <TokenTableSkeleton />
          </section>
        ))}
      </main>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl lg:max-w-3xl flex-col gap-6 px-6 py-24">
        <BackToHome />
        <p className="text-muted-foreground">
          No address provided. Connect a wallet or use the watcher.
        </p>
      </main>
    );
  }

  const solanaAddress = accounts.find(
    (a) => a.addressType === AddressType.solana,
  )?.address;
  const ethereumAddress = accounts.find(
    (a) => a.addressType === AddressType.ethereum,
  )?.address;

  return (
    <main className="mx-auto flex w-full max-w-2xl lg:max-w-3xl flex-col gap-8 px-6 py-12">
      <BackToHome />
      <header className="flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Connected Account Mode
        </p>
        <PortfolioTotal
          solanaAddress={solanaAddress}
          evmAddress={ethereumAddress}
        />
      </header>

      {solanaAddress && <SolanaPortfolio address={solanaAddress} />}
      {ethereumAddress && <EvmPortfolio address={ethereumAddress} />}
    </main>
  );
}
