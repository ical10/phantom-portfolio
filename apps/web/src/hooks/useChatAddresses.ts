import { useLocation } from "@tanstack/react-router";
import { AddressType, useAccounts } from "@phantom/react-sdk";
import { useSolanaName } from "@/hooks/useSolanaName";
import { detectAddressKind } from "@/lib/address";
import { AddressKind } from "@/types/portfolio";

// Pull addresses for the chat to use as portfolio context. Three cases:
// 1. On /dashboard?address=<solana|evm>, the user is in watcher mode — use
//    that address directly.
// 2. On /dashboard?address=<.sol>, resolve via SNS (same hook
//    WatcherDashboard uses) and use the resolved pubkey.
// 3. Otherwise, fall back to the connected Phantom wallet (if any).
export function useChatAddresses(): {
  solanaAddress: string | null;
  evmAddress: string | null;
} {
  const location = useLocation();
  const accounts = useAccounts();

  // Decide what the watcher input is, if any. Hooks must be called
  // unconditionally, so determine these synchronously and let the SNS
  // hook receive null when there's no .sol name to resolve.
  let watcherRaw: string | null = null;
  let watcherKind: AddressKind = AddressKind.unknown;
  if (location.pathname === "/dashboard") {
    const search = location.search as { address?: string };
    if (typeof search.address === "string" && search.address.length > 0) {
      watcherRaw = search.address;
      watcherKind = detectAddressKind(search.address);
    }
  }

  const sns = useSolanaName(
    watcherKind === AddressKind.solName ? watcherRaw : null,
  );

  if (watcherKind === AddressKind.solana) {
    return { solanaAddress: watcherRaw, evmAddress: null };
  }
  if (watcherKind === AddressKind.evm) {
    return { solanaAddress: null, evmAddress: watcherRaw };
  }
  if (watcherKind === AddressKind.solName) {
    // While SNS resolves, solanaAddress stays null and ChatPanel shows
    // its empty-snapshot state. Once resolved, the chat uses the pubkey.
    return { solanaAddress: sns.data ?? null, evmAddress: null };
  }

  const solanaAddress =
    accounts?.find((a) => a.addressType === AddressType.solana)?.address ??
    null;
  const evmAddress =
    accounts?.find((a) => a.addressType === AddressType.ethereum)?.address ??
    null;

  return { solanaAddress, evmAddress };
}
