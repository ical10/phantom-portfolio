import { requireEnv } from "@/lib/env";

const JUPITER_PRICE_BASE = requireEnv(
  process.env.JUPITER_PRICE_BASE,
  "JUPITER_PRICE_BASE",
);
const JUPITER_API_KEY = requireEnv(
  process.env.JUPITER_API_KEY,
  "JUPITER_API_KEY",
);

// NOTE: Free tier silently truncates to ~24-25 mints per request; Pro does not
// have this limit but 20 is a safe ceiling and parallelizes fine.
const BATCH_SIZE = 20;

type JupiterPriceEntry = {
  usdPrice: number;
  decimals?: number;
  priceChange24h?: number;
};

type JupiterPriceResponse = Record<string, JupiterPriceEntry | null>;

async function fetchOneBatch(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {};

  const params = new URLSearchParams({ ids: mints.join(",") });
  const res = await fetch(`${JUPITER_PRICE_BASE}?${params}`, {
    headers: { "x-api-key": JUPITER_API_KEY },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jupiter ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as JupiterPriceResponse;

  const prices: Record<string, number> = {};
  for (const [mint, entry] of Object.entries(data)) {
    if (!entry) continue;
    if (Number.isFinite(entry.usdPrice)) prices[mint] = entry.usdPrice;
  }
  return prices;
}

export async function fetchJupiterPrices(
  mints: string[],
): Promise<Record<string, number>> {
  if (mints.length === 0) return {};

  const batches: string[][] = [];
  for (let i = 0; i < mints.length; i += BATCH_SIZE) {
    batches.push(mints.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(batches.map(fetchOneBatch));

  return Object.assign({}, ...results);
}
