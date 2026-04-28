import { describe, expect, it } from "vitest";
import { requireEnv } from "../src/env";

describe("requireEnv", () => {
  it("returns the value when defined", () => {
    expect(requireEnv("hello", "FOO")).toBe("hello");
  });

  it("returns the value even when it's the empty string... wait, no — empty is falsy", () => {
    // Documents the actual behavior: an empty string is treated as missing.
    // This is intentional — empty env vars almost always mean a config bug.
    expect(() => requireEnv("", "FOO")).toThrow(/FOO is not set/);
  });

  it("throws when the value is undefined", () => {
    expect(() => requireEnv(undefined, "BAR")).toThrow(/BAR is not set/);
  });

  it("includes the variable name in the error so callers can diagnose missing config", () => {
    try {
      requireEnv(undefined, "ANTHROPIC_API_KEY");
      expect.fail("expected requireEnv to throw");
    } catch (e) {
      expect((e as Error).message).toContain("ANTHROPIC_API_KEY");
    }
  });
});
