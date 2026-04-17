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

export type AddressType = "solana" | "evm" | "sol-name" | "unknown";
