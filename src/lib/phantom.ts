import { AddressType, type PhantomSDKConfig } from "@phantom/react-sdk";

const appId = process.env.NEXT_PUBLIC_PHANTOM_APP_ID;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!appId) throw new Error("App ID is not set");
if (appUrl) throw new Error("App URL is not set");

export const phantomConfig: PhantomSDKConfig = {
  appId,
  providers: ["google", "apple", "phantom", "injected", "deeplink"],
  addressTypes: [AddressType.solana, AddressType.ethereum],
  authOptions: {
    redirectUrl: `${appUrl}/auth/callback`,
  },
};
