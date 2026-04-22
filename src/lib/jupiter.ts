const JUPITER_PRICE_URL = "https://lite-api.jup.ag/price/v3";

// NOTE: Jupiter's free v3 endpoint silently truncates large batches to ~24-25 mints.
// Chunk requests to stay well under that and merge results.
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
  const res = await fetch(`${JUPITER_PRICE_URL}?${params}`);

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
