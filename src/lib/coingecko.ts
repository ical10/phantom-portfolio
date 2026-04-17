const COINGECKO_BASE = process.env.NEXT_PUBLIC_COINGECKO_BASE;
if (!COINGECKO_BASE) throw new Error("CoinGecko is not set");

type SimplePriceResponse = Record<string, { usd?: number }>;

export type FetchPricesResult = {
  prices: Record<string, number>;
  rateLimited: boolean;
};

export async function fetchPrices(ids: string[]): Promise<FetchPricesResult> {
  if (ids.length === 0)
    return {
      prices: {},
      rateLimited: false,
    };

  const params = new URLSearchParams({
    ids: ids.join(","),
    vs_currencies: "usd",
  });

  const res = await fetch(`${COINGECKO_BASE}/simple/price?${params}`);

  if (res.status === 429)
    return {
      prices: {},
      rateLimited: true,
    };
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const data = (await res.json()) as SimplePriceResponse;

  const prices = Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => typeof v.usd === "number")
      .map(([id, v]) => [id, v.usd as number]),
  );

  return {
    prices,
    rateLimited: false,
  };
}
