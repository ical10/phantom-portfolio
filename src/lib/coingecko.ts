// Server-only. Do not import from client code.
import { LRUCache } from "lru-cache";
import { requireEnv } from "@/lib/env";
import type { Chain } from "@/types/portfolio";

const COINGECKO_BASE = requireEnv(process.env.COINGECKO_BASE, "COINGECKO_BASE");

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

// NOTE: Module-scope cache persists across server-fn invocations in the same Node
// process (works in dev + persistent-server production, not edge functions).
// Caps CoinGecko traffic to at most one upstream request per distinct arg set
// within the TTL window, regardless of how many clients query in parallel.
const cache = new LRUCache<string, FetchPricesResult>({
  max: 500,
  ttl: 60_000,
});

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

  const cacheKey = `coinid:${[...ids].sort().join(",")}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    ids: ids.join(","),
    vs_currencies: "usd",
  });

  const res = await fetch(`${COINGECKO_BASE}/simple/price?${params}`);

  if (res.status === 429) return { prices: {}, rateLimited: true };
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const data = (await res.json()) as SimplePriceResponse;
  const result = { prices: parsePriceResponse(data), rateLimited: false };
  cache.set(cacheKey, result);
  return result;
}

// CoinGecko rejects /token_price requests with too many contract_addresses
// (400 Bad Request). Batch to stay under the limit.
const CONTRACT_BATCH_SIZE = 30;

async function fetchContractBatch(
  chain: Chain,
  addresses: string[],
): Promise<FetchPricesResult> {
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

// Response keys: EVM addresses come back lowercased; Solana mints preserve case.
// Caller must normalize EVM addresses before lookup.
export async function fetchPricesByContract(
  chain: Chain,
  addresses: string[],
): Promise<FetchPricesResult> {
  if (addresses.length === 0) return { prices: {}, rateLimited: false };

  const sorted = [...addresses].sort();
  const cacheKey = `contract:${chain}:${sorted.join(",")}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const batches: string[][] = [];
  for (let i = 0; i < sorted.length; i += CONTRACT_BATCH_SIZE) {
    batches.push(sorted.slice(i, i + CONTRACT_BATCH_SIZE));
  }

  // Serialize batches with a small delay to stay under per-IP rate limit.
  // Parallel calls trip CoinGecko's free tier at ~5 req/s.
  const perBatchResults: FetchPricesResult[] = [];
  for (const batch of batches) {
    perBatchResults.push(await fetchContractBatch(chain, batch));
    if (batches.length > 1) await new Promise((r) => setTimeout(r, 250));
  }

  const prices: Record<string, number> = {};
  let rateLimited = false;
  for (const r of perBatchResults) {
    Object.assign(prices, r.prices);
    if (r.rateLimited) rateLimited = true;
  }
  const result = { prices, rateLimited };
  // Don't cache rate-limit responses — retry on next call.
  if (!rateLimited) cache.set(cacheKey, result);
  return result;
}
