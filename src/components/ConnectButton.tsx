"use client";

import { useRouter } from "next/navigation";
import { useAccounts, useModal, useDisconnect } from "@phantom/react-sdk";
import { Button } from "@/components/ui/button";

export function ConnectButton() {
  const router = useRouter();
  const accounts = useAccounts();
  const { open, isOpened } = useModal();
  const { disconnect, isDisconnecting } = useDisconnect();

  const isConnected = !!accounts && accounts.length > 0;

  if (isConnected) {
    return (
      <div className="flex gap-2">
        <Button onClick={() => router.push("/dashboard")} className="flex-1">
          View portfolio
        </Button>
        <Button
          variant="outline"
          onClick={() => disconnect()}
          disabled={isDisconnecting}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={open} disabled={isOpened} className="w-full">
      Connect wallet
    </Button>
  );
}
