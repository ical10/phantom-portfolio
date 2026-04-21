"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { detectAddressKind } from "@/lib/address";
import { AddressKind } from "@/types/portfolio";

const KIND_LABEL: Record<AddressKind, string> = {
  solana: "Solana address",
  evm: "Ethereum / Polygon address",
  "sol-name": "SNS name",
  unknown: "Invalid address format",
};

export function WatcherInput() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const trimmed = value.trim();
  const kind = detectAddressKind(trimmed);
  const isValid = kind !== AddressKind.unknown;
  const showHint = trimmed.length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    router.push(`/dashboard?address=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Paste address or SNS name..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-sm"
        />
        <Button type="submit" disabled={!isValid}>
          View
        </Button>
      </div>
      {showHint && (
        <p className={`text-xs ${isValid ? "text-zinc-500" : "text-red-500"}`}>
          {KIND_LABEL[kind]}
        </p>
      )}
    </form>
  );
}
