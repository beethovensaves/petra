import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/src/generated/**",
      "apps/server/public/**",
      ".cache/**",
      ".data/**",
    ],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["apps/workbench/**/*.ts", "apps/workbench/**/*.tsx"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "packages/contracts/*.ts",
            "packages/core/vitest.config.ts",
            "packages/postgres/vitest.config.ts",
            "packages/s3/vitest.config.ts",
            "apps/server/vitest.config.ts",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
);
