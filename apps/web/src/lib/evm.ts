// Server-only. Do not import from client code.
import { createPublicClient, http } from "viem";
import { mainnet, polygon } from "viem/chains";
import { requireEnv } from "@/lib/env";
import { Chain, PortfolioEntry, Token } from "@/types/portfolio";

const ETH_RPC = requireEnv(process.env.ALCHEMY_ETH_RPC, "ALCHEMY_ETH_RPC");
const POLYGON_RPC = requireEnv(
  process.env.ALCHEMY_POLYGON_RPC,
  "ALCHEMY_POLYGON_RPC",
);

export const ethClient = createPublicClient({
  chain: mainnet,
  transport: http(ETH_RPC),
});

export const polygonClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC),
});

const DEFAULT_DECIMALS = 18;
const TRUNCATED_SYMBOL_IDX = 6;
const DEFAULT_NAME = "Unknown Token";

type EvmChain = Exclude<Chain, "solana">;

const evmConfig = {
  ethereum: { client: ethClient, rpcUrl: ETH_RPC },
  polygon: { client: polygonClient, rpcUrl: POLYGON_RPC },
} as const;

type EvmTokenBalance = {
  contractAddress: string;
  tokenBalance: string;
};

type EvmTokenBalancesResult = {
  address: string;
  tokenBalances: EvmTokenBalance[];
};

type EvmTokenMetadata = {
  decimals: number | null;
  logo: string | null;
  name: string | null;
  symbol: string | null;
};

async function alchemyRpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Alchemy ${method} ${res.status}`);
  const { result } = (await res.json()) as { result: T };
  return result;
}

export async function fetchEvmPortfolio(
  chain: EvmChain,
  address: string,
): Promise<PortfolioEntry> {
  const { client, rpcUrl } = evmConfig[chain];
  const addr = address as `0x${string}`;

  const [nativeBalance, balancesResult] = await Promise.all([
    client.getBalance({ address: addr }),
    alchemyRpc<EvmTokenBalancesResult>(rpcUrl, "alchemy_getTokenBalances", [
      addr,
      "erc20",
    ]),
  ]);

  const nonZero = balancesResult.tokenBalances.filter(
    (t) => t.tokenBalance !== "0x" && BigInt(t.tokenBalance) > 0n,
  );

  const metadata = await Promise.all(
    nonZero.map((t) =>
      alchemyRpc<EvmTokenMetadata>(rpcUrl, "alchemy_getTokenMetadata", [
        t.contractAddress,
      ]),
    ),
  );

  const tokens: Token[] = nonZero.map((t, i) => {
    const meta = metadata[i];
    return {
      mint: t.contractAddress,
      balance: BigInt(t.tokenBalance).toString(),
      decimals: meta.decimals ?? DEFAULT_DECIMALS,
      symbol: meta.symbol ?? t.contractAddress.slice(0, TRUNCATED_SYMBOL_IDX),
      name: meta.name ?? DEFAULT_NAME,
      logoUri: meta.logo ?? undefined,
    };
  });

  return { chain, nativeBalance: nativeBalance.toString(), tokens };
}
