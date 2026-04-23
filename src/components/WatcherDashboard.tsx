import { BackToHome } from "@/components/BackToHome";
import { EvmPortfolio } from "@/components/EvmPortfolio";
import { PortfolioTotal } from "@/components/PortfolioTotal";
import { SolanaPortfolio } from "@/components/SolanaPortfolio";
import { useSolanaName } from "@/hooks/useSolanaName";
import { detectAddressKind } from "@/lib/address";
import { AddressKind } from "@/types/portfolio";

type Props = {
  address: string;
};

export function WatcherDashboard({ address }: Props) {
  const kind = detectAddressKind(address);
  const name = useSolanaName(kind === AddressKind.solName ? address : null);

  const solanaAddress =
    kind === AddressKind.solana
      ? address
      : kind === AddressKind.solName
        ? (name.data ?? null)
        : null;
  const evmAddress = kind === AddressKind.evm ? address : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <BackToHome />
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Watch-only Mode
          </p>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {address}
            {name.data && (
              <span className="text-foreground"> → {name.data}</span>
            )}
          </p>
        </div>
        <PortfolioTotal
          solanaAddress={solanaAddress}
          evmAddress={evmAddress}
        />
      </header>

      {kind === AddressKind.solName && name.isLoading && (
        <p className="text-sm text-muted-foreground">
          Resolving .sol name...
        </p>
      )}
      {kind === AddressKind.solName && name.isError && (
        <p className="text-sm text-destructive">
          Failed to resolve .sol name:{" "}
          {name.error instanceof Error ? name.error.message : "Unknown error"}
        </p>
      )}
      {solanaAddress && <SolanaPortfolio address={solanaAddress} />}
      {evmAddress && <EvmPortfolio address={evmAddress} />}
      {kind === AddressKind.unknown && (
        <p className="text-sm text-destructive">Invalid address format.</p>
      )}
    </main>
  );
}
