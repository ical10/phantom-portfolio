import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

// `cn` is the standard shadcn/ui pattern: clsx for conditionals + twMerge
// for Tailwind class deduplication.
describe("cn — class name composer", () => {
  it("joins multiple plain class names", () => {
    expect(cn("p-4", "rounded")).toBe("p-4 rounded");
  });

  it("filters out falsy values from clsx", () => {
    expect(cn("p-4", false && "hidden", null, undefined, "rounded")).toBe(
      "p-4 rounded",
    );
  });

  it("dedupes conflicting Tailwind utilities (last one wins)", () => {
    // p-2 and p-4 both target padding; tailwind-merge collapses to p-4.
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("preserves non-conflicting utilities side by side", () => {
    expect(cn("text-sm", "text-red-500")).toBe("text-sm text-red-500");
  });

  it("supports object syntax via clsx", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("supports nested arrays", () => {
    expect(cn(["a", ["b", ["c"]]])).toBe("a b c");
  });

  it("returns an empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});
