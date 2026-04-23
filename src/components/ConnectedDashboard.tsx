import { AddressType, useAccounts } from "@phantom/react-sdk";
import { EvmPortfolio } from "@/components/EvmPortfolio";
import { SolanaPortfolio } from "@/components/SolanaPortfolio";

export function ConnectedDashboard() {
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
      {ethereumAddress && <EvmPortfolio address={ethereumAddress} />}
    </main>
  );
}
