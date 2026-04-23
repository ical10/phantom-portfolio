import type { Chain } from "@/types/portfolio";

export type EvmChain = Exclude<Chain, "solana">;

export type EvmChainConfig = {
  symbol: string;
  name: string;
  label: string;
  logoUri: string;
  coinId: string;
};

export const NATIVE_CONFIG: Record<EvmChain, EvmChainConfig> = {
  ethereum: {
    symbol: "ETH",
    name: "Ethereum",
    label: "Ethereum",
    logoUri:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
    coinId: "ethereum",
  },
  polygon: {
    symbol: "MATIC",
    name: "Polygon",
    label: "Polygon",
    logoUri:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
    coinId: "matic-network",
  },
};
