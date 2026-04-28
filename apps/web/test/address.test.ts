import { describe, expect, it } from "vitest";
import { detectAddressKind } from "@/lib/address";
import { AddressKind } from "@/types/portfolio";

describe("detectAddressKind — Solana addresses", () => {
  it("classifies a real Solana base58 pubkey", () => {
    expect(
      detectAddressKind("66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1"),
    ).toBe(AddressKind.solana);
  });

  it("classifies the SOL native mint pseudo-address", () => {
    expect(
      detectAddressKind("So11111111111111111111111111111111111111112"),
    ).toBe(AddressKind.solana);
  });

  it("rejects base58 strings shorter than 32 chars", () => {
    expect(detectAddressKind("66jnQDjpjYyt464Yb7r")).toBe(AddressKind.unknown);
  });

  it("rejects strings with characters outside the base58 alphabet (0, O, I, l)", () => {
    expect(
      detectAddressKind("66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gL00"),
    ).toBe(AddressKind.unknown);
    expect(
      detectAddressKind("66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLll"),
    ).toBe(AddressKind.unknown);
  });
});

describe("detectAddressKind — EVM addresses", () => {
  it("classifies a checksummed Ethereum address", () => {
    expect(
      detectAddressKind("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
    ).toBe(AddressKind.evm);
  });

  it("classifies an all-lowercase EVM address", () => {
    expect(
      detectAddressKind("0xd8da6bf26964af9d7eed9e03e53415d37aa96045"),
    ).toBe(AddressKind.evm);
  });

  it("classifies an all-uppercase EVM address", () => {
    expect(
      detectAddressKind("0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045"),
    ).toBe(AddressKind.evm);
  });

  it("rejects 0x-prefixed strings of wrong length", () => {
    expect(detectAddressKind("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA960")).toBe(
      AddressKind.unknown,
    );
    expect(
      detectAddressKind("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA9604500"),
    ).toBe(AddressKind.unknown);
  });

  it("rejects 0x prefix with non-hex characters", () => {
    expect(
      detectAddressKind("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA9604g"),
    ).toBe(AddressKind.unknown);
  });
});

describe("detectAddressKind — .sol names", () => {
  it("classifies a basic .sol name", () => {
    expect(detectAddressKind("toly.sol")).toBe(AddressKind.solName);
  });

  it("classifies a .sol name case-insensitively", () => {
    expect(detectAddressKind("TOLY.SOL")).toBe(AddressKind.solName);
    expect(detectAddressKind("Toly.Sol")).toBe(AddressKind.solName);
  });

  it("classifies a .sol name with hyphens / numbers", () => {
    expect(detectAddressKind("multi-chain-2026.sol")).toBe(
      AddressKind.solName,
    );
  });
});

describe("detectAddressKind — unknown / edge cases", () => {
  it("returns unknown for empty input", () => {
    expect(detectAddressKind("")).toBe(AddressKind.unknown);
  });

  it("returns unknown for whitespace-only input", () => {
    expect(detectAddressKind("   ")).toBe(AddressKind.unknown);
  });

  it("trims whitespace before classifying (paste hygiene)", () => {
    expect(
      detectAddressKind("  0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045  "),
    ).toBe(AddressKind.evm);
    expect(
      detectAddressKind("\t66jnQDjpjYyt464Yb7rVdeqLuz7mbtqSW3PHjDp3gLT1\n"),
    ).toBe(AddressKind.solana);
  });

  it("returns unknown for a free-form string", () => {
    expect(detectAddressKind("not an address")).toBe(AddressKind.unknown);
  });

  it("returns unknown for an ENS-like name (we don't resolve those yet)", () => {
    expect(detectAddressKind("vitalik.eth")).toBe(AddressKind.unknown);
  });
});
