import { defineConfig, globalIgnores } from "eslint/config";
import pluginRouter from "@tanstack/eslint-plugin-router";

const eslintConfig = defineConfig([
  ...pluginRouter.configs["flat/recommended"],
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  globalIgnores([
    "**/.output/**",
    "**/.nitro/**",
    "**/.tanstack/**",
    "**/dist/**",
    "**/build/**",
    "**/node_modules/**",
    "apps/web/src/routeTree.gen.ts",
  ]),
]);

export default eslintConfig;
