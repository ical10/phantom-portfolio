export type Chain = "solana" | "ethereum" | "polygon";

export type Token = {
  symbol: string;
  name: string;
  mint: string;
  balance: bigint;
  decimals: number;
  logoUri?: string;
  usdPrice?: number;
  usdValue?: number;
};

export type PortfolioEntry = {
  chain: Chain;
  tokens: Token[];
  nativeBalance: bigint;
};

export const AddressKind = {
  solana: "solana",
  evm: "evm",
  solName: "sol-name",
  unknown: "unknown",
} as const;

export type AddressKind = (typeof AddressKind)[keyof typeof AddressKind];
