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

// Jupiter Pro demo-tier gateway 429s aggressively on bursts. Keep concurrency
// low and add a real gap between waves. 2 concurrent × 500ms delay on an
// 800-mint wallet is ~21 waves × ~750ms ≈ 16s worst case. Slow but reliable.
const CONCURRENCY = 2;
const WAVE_DELAY_MS = 500;

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

  // NOTE: Serialized waves of CONCURRENCY parallel batches with a small delay
  // between waves. allSettled within each wave so one 429/5xx doesn't
  // nuke the rest. If every batch fails, bubble up the first rejection.
  const results: PromiseSettledResult<Record<string, number>>[] = [];
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const wave = batches.slice(i, i + CONCURRENCY);
    const waveResults = await Promise.allSettled(wave.map(fetchOneBatch));
    results.push(...waveResults);
    if (i + CONCURRENCY < batches.length) {
      await new Promise((r) => setTimeout(r, WAVE_DELAY_MS));
    }
  }

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
