import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchEvmPortfolio as fetchEvmPortfolioImpl } from "@/lib/evm";
import type { Chain, PortfolioEntry } from "@/types/portfolio";

type EvmChain = Exclude<Chain, "solana">;

const EVM_CHAINS = ["ethereum", "polygon"] as const satisfies readonly EvmChain[];

const EvmInputSchema = z.object({
  chain: z.enum(EVM_CHAINS),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid EVM address"),
});

export const fetchEvmPortfolio = createServerFn({ method: "POST" })
  .inputValidator(EvmInputSchema)
  .handler(
    async ({ data }): Promise<PortfolioEntry> =>
      fetchEvmPortfolioImpl(data.chain, data.address),
  );
