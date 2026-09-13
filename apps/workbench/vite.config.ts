import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@petra/contracts/validator": resolve(
        root,
        "src/product/browser-contract-registry.ts",
      ),
    },
  },
  build: {
    outDir: resolve(root, "../server/public"),
    emptyOutDir: true,
  },
  server: {
    port: 4311,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:4310",
      "/health": "http://127.0.0.1:4310",
      "/diagnostics": "http://127.0.0.1:4310",
    },
  },
});
