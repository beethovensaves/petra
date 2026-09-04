import type { ServerType } from "@hono/node-server";
import { serve } from "@hono/node-server";

import {
  CodexSubscriptionProvider,
  type CodexSidecarOptions,
  type CodexSubscriptionProviderPort,
} from "@petra/adapters/server";
import { PetraInteractionRuntime } from "@petra/core";

import { createPetraApp, type PetraAppOptions } from "./app.js";
import {
  createM1GroundedSynthesisRuntime,
  type M1GroundedSynthesisOptions,
} from "./m1-grounded-synthesis.js";

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
  codexGroundedSynthesis?: Omit<
    M1GroundedSynthesisOptions,
    "provider" | "workspaceRoot"
  >;
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
  const codexWorkspaceRoot =
    options.codexWorkspaceRoot ?? options.codexSidecar?.cwd;
  let petra: ReturnType<typeof createPetraApp>;
  let server: ServerType;
  try {
    if (
      options.codexGroundedSynthesis !== undefined &&
      options.runtime !== undefined
    ) {
      throw new Error(
        "codexGroundedSynthesis cannot replace an explicitly supplied interaction runtime.",
      );
    }
    if (
      options.codexGroundedSynthesis !== undefined &&
      (codexProvider === undefined || codexWorkspaceRoot === undefined)
    ) {
      throw new Error(
        "codexGroundedSynthesis requires a Codex provider and server-owned workspace root.",
      );
    }
    const grounded =
      options.codexGroundedSynthesis === undefined ||
      codexProvider === undefined ||
      codexWorkspaceRoot === undefined
        ? undefined
        : await createM1GroundedSynthesisRuntime({
            ...options.codexGroundedSynthesis,
            provider: codexProvider,
            workspaceRoot: codexWorkspaceRoot,
          });
    const runtime =
      grounded === undefined
        ? options.runtime
        : new PetraInteractionRuntime({
            ...(options.reviewBoundary === undefined
              ? {}
              : { reviewBoundary: options.reviewBoundary }),
            groundedSynthesisExecutor: grounded.executor,
          });
    petra = createPetraApp({
      ...options,
      ...(runtime === undefined ? {} : { runtime }),
      ...(codexProvider === undefined ? {} : { codexProvider }),
      ...(codexWorkspaceRoot === undefined ? {} : { codexWorkspaceRoot }),
    });
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
