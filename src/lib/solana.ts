// Server-only. Do not import from client code.
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { requireEnv } from "@/lib/env";

const HELIUS_RPC = requireEnv(process.env.HELIUS_RPC, "HELIUS_RPC");

export const connection = new Connection(HELIUS_RPC, "confirmed");

export async function resolveSolName(domainName: string): Promise<string> {
  const { getDomainKeySync, NameRegistryState } = await import(
    "@bonfida/spl-name-service"
  );
  const cleaned = domainName.replace(/\.sol$/i, "");
  const { pubkey } = getDomainKeySync(cleaned);
  const { registry } = await NameRegistryState.retrieve(connection, pubkey);
  return registry.owner.toBase58();
}

export type RawTokenBalance = {
  mint: string;
  balance: bigint;
  decimals: number;
};

export type TokenBalances = {
  lamports: bigint;
  tokens: RawTokenBalance[];
};

export async function fetchTokenBalances(
  owner: PublicKey,
): Promise<TokenBalances> {
  const [lamports, splV1, splV2022] = await Promise.all([
    connection.getBalance(owner),
    connection.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID,
    }),
    connection.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_2022_PROGRAM_ID,
    }),
  ]);

  const tokens = [...splV1.value, ...splV2022.value]
    .map((acc): RawTokenBalance => {
      const info = acc.account.data.parsed.info;
      return {
        mint: info.mint,
        balance: BigInt(info.tokenAmount.amount),
        decimals: info.tokenAmount.decimals,
      };
    })
    // Filter out dormant token accounts
    .filter((t) => t.balance > 0n);

  return {
    lamports: BigInt(lamports),
    tokens,
  };
}

export type AssetMetadata = {
  symbol?: string;
  name?: string;
  logoUri?: string;
};

type HeliusAsset = {
  id: string;
  content?: {
    metadata?: { symbol?: string; name?: string };
    links?: { image?: string };
  };
  token_info?: { symbol?: string; decimals?: number };
};

export async function fetchAssetMetadata(
  mints: string[],
): Promise<Record<string, AssetMetadata>> {
  if (mints.length === 0) return {};

  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "das",
      method: "getAssetBatch",
      params: { ids: mints },
    }),
  });

  if (!res.ok) throw new Error(`Helius DAS ${res.status}`);

  const { result } = (await res.json()) as { result: (HeliusAsset | null)[] };

  const assetMetadata: Record<string, AssetMetadata> = {};
  for (const asset of result) {
    if (!asset) continue;
    assetMetadata[asset.id] = {
      symbol: asset.token_info?.symbol ?? asset.content?.metadata?.symbol,
      name: asset.content?.metadata?.name,
      logoUri: asset.content?.links?.image,
    };
  }
  return assetMetadata;
}
