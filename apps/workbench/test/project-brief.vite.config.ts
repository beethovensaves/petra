import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** Browser-only aliases keep the focused Brief harness out of server-only Node exports. */
export default defineConfig({
  root,
  appType: "spa",
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@petra/contracts/validator",
        replacement: resolve(root, "src/product/browser-contract-registry.ts"),
      },
      {
        find: /^@petra\/core$/u,
        replacement: resolve(root, "test/wave5-browser-core-shim.ts"),
      },
      {
        find: /^@petra\/adapters$/u,
        replacement: resolve(root, "test/wave5-browser-adapters-live.mjs"),
      },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 4314,
    strictPort: true,
  },
});
