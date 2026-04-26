import { createServerFn } from "@tanstack/react-start";
import { connection } from "@/lib/solana";

// Returns a recent blockhash for client-side transaction construction.
// Kept on the server so the Helius RPC URL stays out of the browser bundle.
export const getRecentBlockhash = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ blockhash: string; lastValidBlockHeight: number }> => {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    return { blockhash, lastValidBlockHeight };
  },
);
