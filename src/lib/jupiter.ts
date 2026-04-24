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

  // allSettled so one 429/5xx batch doesn't nuke all prices. If every
  // batch fails, bubble up the first rejection so the UI can surface an error.
  const results = await Promise.allSettled(batches.map(fetchOneBatch));

  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<Record<string, number>> =>
      r.status === "fulfilled",
  );

  if (fulfilled.length === 0) {
    const firstRejection = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    throw firstRejection?.reason ?? new Error("All Jupiter batches failed");
  }

  return Object.assign({}, ...fulfilled.map((r) => r.value));
}
