import { createPublicClient, http } from "viem";
import { mainnet, polygon } from "viem/chains";

const ETH_RPC = process.env.NEXT_PUBLIC_ALCHEMY_ETH_RPC;
const POLYGON_RPC = process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_RPC;

if (!ETH_RPC) throw new Error("ETH RPC is not set");
if (!POLYGON_RPC) throw new Error("Polygon RPC is not set");

export const ethClient = createPublicClient({
  chain: mainnet,
  transport: http(ETH_RPC),
});

export const polygonClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC),
});
