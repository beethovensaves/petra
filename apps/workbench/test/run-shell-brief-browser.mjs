import { once } from "node:events";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

import { createServer as createViteServer } from "vite";

import { startChrome } from "./cumulative-production-browser-driver.mjs";

const root = resolve(import.meta.dirname, "..");
const vite = await createViteServer({
  configFile: resolve(import.meta.dirname, "project-brief.vite.config.ts"),
  root,
  logLevel: "error",
  server: { port: 0, strictPort: false },
});
let chrome;
try {
  await vite.listen();
  const address = vite.httpServer?.address();
  if (address === null || typeof address !== "object")
    throw new Error("The shell/Brief browser server did not expose a port.");
  chrome = await startChrome({ profilePrefix: "petra-shell-brief-browser-" });
  process.env.PETRA_SHELL_BRIEF_WORKBENCH_URL = `http://127.0.0.1:${address.port}`;
  process.env.PETRA_SHELL_BRIEF_CHROME_SOCKET = chrome.socketUrl;
  await import("./shell-brief-browser.mjs");
} finally {
  await vite.close();
  if (chrome !== undefined) {
    if (chrome.child.exitCode === null) {
      chrome.child.kill("SIGTERM");
      await Promise.race([
        once(chrome.child, "exit"),
        new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
      ]);
    }
    await rm(chrome.profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    }).catch(() => undefined);
  }
}
