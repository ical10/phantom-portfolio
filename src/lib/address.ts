import { AddressKind } from "@/types/portfolio";

export function detectAddressKind(value: string): AddressKind {
  const trimmed = value.trim();
  if (!trimmed) return AddressKind.unknown;
  if (/\.sol$/i.test(trimmed)) return AddressKind.solName;
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return AddressKind.evm;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return AddressKind.solana;
  return AddressKind.unknown;
}
