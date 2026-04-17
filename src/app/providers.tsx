"use client";

import { PhantomProvider } from "@phantom/react-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { phantomConfig } from "@/lib/phantom";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PhantomProvider config={phantomConfig} appName="Smart Portfolio">
        {children}
      </PhantomProvider>
    </QueryClientProvider>
  );
}
