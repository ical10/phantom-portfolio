import { createFileRoute } from "@tanstack/react-router";
import { AddressType, useAccounts } from "@phantom/react-sdk";
import { SolanaPortfolio } from "@/components/SolanaPortfolio";
import { detectAddressKind } from "@/lib/address";
import { AddressKind } from "@/types/portfolio";

type DashboardSearch = {
  address?: string;
};

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    address: typeof search.address === "string" ? search.address : undefined,
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { address } = Route.useSearch();

  if (address) return <WatcherDashboard address={address} />;
  return <ConnectedDashboard />;
}

function WatcherDashboard({ address }: { address: string }) {
  const kind = detectAddressKind(address);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="break-all font-mono text-xs text-zinc-500">{address}</p>
      </header>

      {kind === AddressKind.solana && <SolanaPortfolio address={address} />}
      {kind === AddressKind.evm && (
        <p className="text-sm text-zinc-500">EVM portfolio not yet wired.</p>
      )}
      {kind === AddressKind.solName && (
        <p className="text-sm text-zinc-500">SNS resolution not yet wired.</p>
      )}
      {kind === AddressKind.unknown && (
        <p className="text-sm text-red-500">Invalid address format.</p>
      )}
    </main>
  );
}

function ConnectedDashboard() {
  const accounts = useAccounts();

  if (!accounts || accounts.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-24">
        <p className="text-zinc-500">
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
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-sm text-zinc-500">Connected wallet</p>
      </header>

      {solanaAddress && <SolanaPortfolio address={solanaAddress} />}
      {ethereumAddress && (
        <p className="text-sm text-zinc-500">
          EVM portfolio not yet wired for{" "}
          <span className="font-mono">{ethereumAddress.slice(0, 8)}…</span>
        </p>
      )}
    </main>
  );
}
