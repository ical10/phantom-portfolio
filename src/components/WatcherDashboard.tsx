import { EvmPortfolio } from "@/components/EvmPortfolio";
import { SolanaPortfolio } from "@/components/SolanaPortfolio";
import { detectAddressKind } from "@/lib/address";
import { AddressKind } from "@/types/portfolio";

type Props = {
  address: string;
};

export function WatcherDashboard({ address }: Props) {
  const kind = detectAddressKind(address);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="break-all font-mono text-xs text-zinc-500">{address}</p>
      </header>

      {kind === AddressKind.solana && <SolanaPortfolio address={address} />}
      {kind === AddressKind.evm && <EvmPortfolio address={address} />}
      {kind === AddressKind.solName && (
        <p className="text-sm text-zinc-500">SNS resolution not yet wired.</p>
      )}
      {kind === AddressKind.unknown && (
        <p className="text-sm text-red-500">Invalid address format.</p>
      )}
    </main>
  );
}
