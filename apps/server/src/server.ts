import type { ServerType } from "@hono/node-server";
import { serve } from "@hono/node-server";

import { createPetraApp, type PetraAppOptions } from "./app.js";

export interface PetraServer {
  port: number;
  url: string;
  shutdown: () => Promise<void>;
  runtime: ReturnType<typeof createPetraApp>["runtime"];
  server: ServerType;
}

export const startPetraServer = async (
  options: PetraAppOptions & { port?: number; hostname?: string } = {},
): Promise<PetraServer> => {
  const host = options.hostname ?? "127.0.0.1";
  const petra = createPetraApp(options);
  const server = serve({
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

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Petra server did not bind to a TCP port.");
  }
  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (): Promise<void> => {
    shutdownPromise ??= (async () => {
      petra.runtime.stopAdmission();
      petra.closeInteractionStreams();
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error: Error | undefined) =>
          error === undefined ? resolveClose() : rejectClose(error),
        );
        if ("closeIdleConnections" in server) server.closeIdleConnections();
        if ("closeAllConnections" in server) server.closeAllConnections();
      });
      await petra.runtime.drain();
    })();
    return shutdownPromise;
  };

  return {
    port: address.port,
    url: `http://${host}:${address.port}`,
    shutdown,
    runtime: petra.runtime,
    server,
  };
};
