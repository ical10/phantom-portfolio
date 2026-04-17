import { Connection } from "@solana/web3.js";
import { getDomainKeySync, NameRegistryState } from "@bonfida/spl-name-service";

const HELIUS_RPC = process.env.NEXT_PUBLIC_HELIUS_RPC;
if (!HELIUS_RPC) throw new Error("Helius RPC is not set");

export const connection = new Connection(HELIUS_RPC, "confirmed");

export async function resolveSolName(domainName: string): Promise<string> {
  const cleaned = domainName.replace(/\.sol$/i, "");
  const { pubkey } = getDomainKeySync(cleaned);
  const { registry } = await NameRegistryState.retrieve(connection, pubkey);
  return registry.owner.toBase58();
}
