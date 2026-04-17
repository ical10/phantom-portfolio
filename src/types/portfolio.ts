type Chain = "solana" | "ethereum" | "polygon";

type Token = {
  symbol: string;
  name: string;
  mint: string;
  balance: bigint;
  decimals: number;
  logoUri?: string;
  usdPrice?: number;
  usdValue?: number;
};

type PortfolioEntry = {
  chain: Chain;
  tokens: Token[];
  nativeBalance: bigint;
};

type AddressType = "solana" | "evm" | "sol-name" | "unknown";
