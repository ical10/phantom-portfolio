import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import {
  fetchAssetMetadata,
  fetchTokenBalances,
} from "@/lib/solana";
import { detectAddressKind } from "@/lib/address";
import { AddressKind, type PortfolioEntry, type Token } from "@/types/portfolio";

const SolanaAddressSchema = z
  .string()
  .refine((v) => detectAddressKind(v) === AddressKind.solana, {
    message: "Invalid Solana address",
  });

export const fetchSolanaPortfolio = createServerFn({ method: "POST" })
  .inputValidator(SolanaAddressSchema)
  .handler(async ({ data: address }): Promise<PortfolioEntry> => {
    const owner = new PublicKey(address);
    const { lamports, tokens: rawTokens } = await fetchTokenBalances(owner);

    const mints = rawTokens.map((t) => t.mint);
    const metadata = await fetchAssetMetadata(mints);

    const tokens: Token[] = rawTokens.map((t) => {
      const meta = metadata[t.mint];
      return {
        mint: t.mint,
        balance: t.balance.toString(),
        decimals: t.decimals,
        symbol: meta?.symbol ?? t.mint.slice(0, 4),
        name: meta?.name ?? "Unknown Token",
        logoUri: meta?.logoUri,
      };
    });

    return {
      chain: "solana",
      nativeBalance: lamports.toString(),
      tokens,
    };
  });
