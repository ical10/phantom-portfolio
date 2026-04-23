import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchPricesByCoinId,
  fetchPricesByContract,
  type FetchPricesResult,
} from "@/lib/coingecko";
import type { Chain } from "@/types/portfolio";

type EvmChain = Exclude<Chain, "solana">;
const EVM_CHAINS = ["ethereum", "polygon"] as const satisfies readonly EvmChain[];

const CoinIdsSchema = z.array(z.string().min(1).max(100)).max(50);

const ContractPricesSchema = z.object({
  chain: z.enum(EVM_CHAINS),
  addresses: z
    .array(z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid EVM address"))
    .max(500),
});

export const fetchCoinIdPrices = createServerFn({ method: "POST" })
  .inputValidator(CoinIdsSchema)
  .handler(
    async ({ data }): Promise<FetchPricesResult> => fetchPricesByCoinId(data),
  );

export const fetchContractPrices = createServerFn({ method: "POST" })
  .inputValidator(ContractPricesSchema)
  .handler(
    async ({ data }): Promise<FetchPricesResult> =>
      fetchPricesByContract(data.chain, data.addresses),
  );
