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
      // Limit to pure utility modules under src/lib — routes, components,
      // hooks, and server fns need integration tests we haven't written.
      include: ["src/lib/address.ts", "src/lib/utils.ts"],
    },
  },
});
