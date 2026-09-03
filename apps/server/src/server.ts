import type { ServerType } from "@hono/node-server";
import { serve } from "@hono/node-server";

import {
  CodexSubscriptionProvider,
  type CodexSidecarOptions,
  type CodexSubscriptionProviderPort,
} from "@petra/adapters/server";

import { createPetraApp, type PetraAppOptions } from "./app.js";

export interface PetraServer {
  port: number;
  url: string;
  shutdown: () => Promise<void>;
  runtime: ReturnType<typeof createPetraApp>["runtime"];
  server: ServerType;
  codexProvider?: CodexSubscriptionProviderPort;
}

export interface PetraServerOptions extends PetraAppOptions {
  port?: number;
  hostname?: string;
  codexSidecar?: CodexSidecarOptions;
}

export const startPetraServer = async (
  options: PetraServerOptions = {},
): Promise<PetraServer> => {
  const host = options.hostname ?? "127.0.0.1";
  const ownedCodexProvider =
    options.codexProvider === undefined && options.codexSidecar !== undefined
      ? await CodexSubscriptionProvider.startSidecar(options.codexSidecar)
      : undefined;
  const codexProvider = options.codexProvider ?? ownedCodexProvider;
  const petra = createPetraApp({
    ...options,
    ...(codexProvider === undefined ? {} : { codexProvider }),
    ...(options.codexWorkspaceRoot !== undefined
      ? {}
      : options.codexSidecar?.cwd === undefined
        ? {}
        : { codexWorkspaceRoot: options.codexSidecar.cwd }),
  });
  let server: ServerType;
  try {
    server = serve({
      fetch: petra.app.fetch,
      hostname: host,
      port: options.port ?? 4310,
    });

    await new Promise<void>((resolve, reject) => {
      const onListening = (): void => {
        server.removeListener("error", onError);
        resolve();
      };
      const onError = (error: Error): void => {
        server.removeListener("listening", onListening);
        reject(error);
      };
      server.once("listening", onListening);
      server.once("error", onError);
    });
  } catch (error) {
    await ownedCodexProvider?.close();
    throw error;
  }

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Petra server did not bind to a TCP port.");
  }
  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (): Promise<void> => {
    shutdownPromise ??= (async () => {
      petra.runtime.stopAdmission();
      petra.closeInteractionStreams();
      try {
        await new Promise<void>((resolveClose, rejectClose) => {
          server.close((error: Error | undefined) =>
            error === undefined ? resolveClose() : rejectClose(error),
          );
          if ("closeIdleConnections" in server) server.closeIdleConnections();
          if ("closeAllConnections" in server) server.closeAllConnections();
        });
        await petra.runtime.drain();
      } finally {
        await ownedCodexProvider?.close();
      }
    })();
    return shutdownPromise;
  };

  return {
    port: address.port,
    url: `http://${host}:${address.port}`,
    shutdown,
    runtime: petra.runtime,
    server,
    ...(codexProvider === undefined ? {} : { codexProvider }),
  };
};
