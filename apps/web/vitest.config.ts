import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      // Only count the units we currently test. Excluding the rest avoids
      // misleadingly low overall coverage numbers — e.g. routes/components
      // would need integration tests that aren't in scope yet.
      include: ["src/lib/address.ts"],
    },
  },
});
