import { requireEnv } from "@/lib/env";
import type { Chain } from "@/types/portfolio";

const COINGECKO_BASE = requireEnv(
  import.meta.env.VITE_COINGECKO_BASE,
  "VITE_COINGECKO_BASE",
);

const COINGECKO_PLATFORM: Record<Chain, string> = {
  solana: "solana",
  ethereum: "ethereum",
  polygon: "polygon-pos",
};

type SimplePriceResponse = Record<string, { usd?: number }>;

export type FetchPricesResult = {
  prices: Record<string, number>;
  rateLimited: boolean;
};

function parsePriceResponse(data: SimplePriceResponse): Record<string, number> {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => typeof v.usd === "number")
      .map(([id, v]) => [id, v.usd as number]),
  );
}

export async function fetchPricesByCoinId(
  ids: string[],
): Promise<FetchPricesResult> {
  if (ids.length === 0) return { prices: {}, rateLimited: false };

  const params = new URLSearchParams({
    ids: ids.join(","),
    vs_currencies: "usd",
  });

  const res = await fetch(`${COINGECKO_BASE}/simple/price?${params}`);

  if (res.status === 429) return { prices: {}, rateLimited: true };
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const data = (await res.json()) as SimplePriceResponse;
  return { prices: parsePriceResponse(data), rateLimited: false };
}

// Response keys: EVM addresses come back lowercased; Solana mints preserve case.
// Caller must normalize EVM addresses before lookup.
export async function fetchPricesByContract(
  chain: Chain,
  addresses: string[],
): Promise<FetchPricesResult> {
  if (addresses.length === 0) return { prices: {}, rateLimited: false };

  const platform = COINGECKO_PLATFORM[chain];
  const params = new URLSearchParams({
    contract_addresses: addresses.join(","),
    vs_currencies: "usd",
  });

  const res = await fetch(
    `${COINGECKO_BASE}/simple/token_price/${platform}?${params}`,
  );

  if (res.status === 429) return { prices: {}, rateLimited: true };
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const data = (await res.json()) as SimplePriceResponse;
  return { prices: parsePriceResponse(data), rateLimited: false };
}
