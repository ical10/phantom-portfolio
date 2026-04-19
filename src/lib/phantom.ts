import { AddressType, type PhantomSDKConfig } from "@phantom/react-sdk";
import { requireEnv } from "@/lib/env";

const appId = requireEnv(
  process.env.NEXT_PUBLIC_PHANTOM_APP_ID,
  "NEXT_PUBLIC_PHANTOM_APP_ID",
);
const appUrl = requireEnv(
  process.env.NEXT_PUBLIC_APP_URL,
  "NEXT_PUBLIC_APP_URL",
);

export const phantomConfig: PhantomSDKConfig = {
  appId,
  providers: ["google", "apple", "phantom", "injected", "deeplink"],
  addressTypes: [AddressType.solana, AddressType.ethereum],
  authOptions: {
    redirectUrl: `${appUrl}/auth/callback`,
  },
};
