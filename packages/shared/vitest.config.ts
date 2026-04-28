import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      // chat-types.ts is purely re-exports of zod-inferred types — nothing
      // to execute, so 0% is misleading. Exclude from the denominator.
      exclude: ["src/index.ts", "src/chat-types.ts"],
    },
  },
});
