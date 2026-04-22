// Server-only. Do not import from client code.

const JUPITER_PRICE_URL = "https://lite-api.jup.ag/price/v3";

type JupiterPriceEntry = {
  usdPrice: number;
  decimals?: number;
  priceChange24h?: number;
};

type JupiterPriceResponse = Record<string, JupiterPriceEntry | null>;

export async function fetchJupiterPrices(
  mints: string[],
): Promise<Record<string, number>> {
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
