import { createServer } from "vite";
import { resolve } from "node:path";
import { startPetraServer } from "../../apps/server/src/server.ts";
import { createProjectShellPersistenceFromEnvironment } from "../../apps/server/src/project-shell-persistence.ts";
const root = resolve(import.meta.dirname, "../..");
const persistence = await createProjectShellPersistenceFromEnvironment();
const server = await startPetraServer({
  port: Number(process.env.PETRA_A1_READINESS_SERVER_PORT ?? 4314),
  authToken: process.env.PETRA_AUTH_TOKEN ?? "petra-local-development",
  projectShellPersistence: persistence,
});
const vite = await createServer({
  root: resolve(root, "apps/workbench"),
  configFile: resolve(root, "apps/workbench/vite.config.ts"),
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PETRA_A1_READINESS_BROWSER_PORT ?? 4315),
    strictPort: true,
    proxy: { "/api": server.url, "/health": server.url },
  },
});
await vite.listen();
process.stdout.write(
  "The production readiness preview is serving with no eligible model provider.\n",
);
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await vite.close();
  await server.shutdown();
  process.exit(0);
};
process.on("SIGINT", () => void close());
process.on("SIGTERM", () => void close());
