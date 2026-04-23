import { AddressType, useAccounts } from "@phantom/react-sdk";
import { BackToHome } from "@/components/BackToHome";
import { EvmPortfolio } from "@/components/EvmPortfolio";
import { SolanaPortfolio } from "@/components/SolanaPortfolio";

export function ConnectedDashboard() {
  const accounts = useAccounts();

  if (!accounts || accounts.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-24">
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <BackToHome />
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Connected Account Mode
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Portfolio
        </h1>
      </header>

      {solanaAddress && <SolanaPortfolio address={solanaAddress} />}
      {ethereumAddress && <EvmPortfolio address={ethereumAddress} />}
    </main>
  );
}
