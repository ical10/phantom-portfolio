import { AddressType, type PhantomSDKConfig } from "@phantom/react-sdk";
import { requireEnv } from "@/lib/env";

const appId = requireEnv(
  import.meta.env.VITE_PHANTOM_APP_ID,
  "VITE_PHANTOM_APP_ID",
);
const appUrl = requireEnv(import.meta.env.VITE_APP_URL, "VITE_APP_URL");

export const phantomConfig: PhantomSDKConfig = {
  appId,
  providers: ["google", "apple", "phantom", "injected", "deeplink"],
  addressTypes: [AddressType.solana, AddressType.ethereum],
  authOptions: {
    redirectUrl: `${appUrl}/auth/callback`,
  },
};
