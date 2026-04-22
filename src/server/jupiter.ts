import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchJupiterPrices } from "@/lib/jupiter";
import { detectAddressKind } from "@/lib/address";
import { AddressKind } from "@/types/portfolio";

const MAX_MINTS = 100;

const SolanaMintsSchema = z
  .array(
    z.string().refine((v) => detectAddressKind(v) === AddressKind.solana, {
      message: "Invalid Solana mint",
    }),
  )
  .max(MAX_MINTS);

export const fetchSolanaPrices = createServerFn({ method: "POST" })
  .inputValidator(SolanaMintsSchema)
  .handler(
    async ({ data: mints }): Promise<Record<string, number>> =>
      fetchJupiterPrices(mints),
  );
