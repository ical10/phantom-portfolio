import {
  ClientOnly,
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PhantomProvider } from "@phantom/react-sdk";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { phantomConfig } from "@/lib/phantom";
import appCss from "@/styles.css?url";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Smart Portfolio" },
      {
        name: "description",
        content:
          "Multi-chain token balances for Solana, Ethereum, and Polygon. Built on top of Phantom.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full flex flex-col">
        <QueryClientProvider client={queryClient}>
          <ClientOnly fallback={null}>
            <PhantomProvider config={phantomConfig} appName="Smart Portfolio">
              <Outlet />
              <ChatBubble />
            </PhantomProvider>
          </ClientOnly>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
