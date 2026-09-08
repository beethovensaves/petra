import type { ServerType } from "@hono/node-server";
import { serve } from "@hono/node-server";

import {
  CodexSubscriptionProvider,
  type CodexSidecarOptions,
  type CodexSubscriptionProviderPort,
} from "@petra/adapters/server";
import {
  DurableInteractionHistory,
  GroundedSynthesisTerminalRecorder,
  PetraInteractionRuntime,
  type GroundedSynthesisTerminalPort,
} from "@petra/core";

import { createPetraApp, type PetraAppOptions } from "./app.js";
import type { GroundedSynthesisPersistence } from "./grounded-synthesis-persistence.js";
import type { ProjectShellPersistence } from "./project-shell-persistence.js";
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
    "provider" | "workspaceRoot" | "executionRepository"
  >;
  groundedSynthesisTerminal?: GroundedSynthesisTerminalPort;
  groundedSynthesisPersistence?: GroundedSynthesisPersistence;
  projectShellPersistence?: ProjectShellPersistence;
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
            ...(options.groundedSynthesisPersistence === undefined
              ? {}
              : {
                  executionRepository:
                    options.groundedSynthesisPersistence.executions,
                }),
          });
    if (
      (options.groundedSynthesisPersistence !== undefined ||
        options.groundedSynthesisTerminal !== undefined) &&
      grounded === undefined
    ) {
      throw new Error(
        "A grounded-synthesis terminal requires the server-owned Codex grounded-synthesis runtime.",
      );
    }
    if (
      options.groundedSynthesisPersistence !== undefined &&
      options.groundedSynthesisTerminal !== undefined
    ) {
      throw new Error(
        "Supply either groundedSynthesisPersistence or a groundedSynthesisTerminal, not both.",
      );
    }
    if (
      grounded !== undefined &&
      options.groundedSynthesisPersistence === undefined &&
      options.groundedSynthesisTerminal === undefined
    ) {
      throw new Error(
        "The server-owned Codex grounded-synthesis runtime requires a terminal persistence boundary.",
      );
    }
    const interactionHistory =
      grounded === undefined ||
      options.groundedSynthesisPersistence === undefined
        ? undefined
        : new DurableInteractionHistory({
            serviceActor: grounded.terminalContext.serviceActor,
            artifactStore: options.groundedSynthesisPersistence.artifactStore,
            artifacts: options.groundedSynthesisPersistence.artifacts,
            interactions: options.groundedSynthesisPersistence.interactions,
            workUnits: options.groundedSynthesisPersistence.workUnits,
          });
    const groundedSynthesisTerminal =
      options.groundedSynthesisTerminal ??
      (options.groundedSynthesisPersistence === undefined ||
      grounded === undefined
        ? undefined
        : new GroundedSynthesisTerminalRecorder({
            ...grounded.terminalContext,
            ...options.groundedSynthesisPersistence,
            groundedResponses:
              options.groundedSynthesisPersistence.groundedResponses(
                grounded.terminalContext.packets,
              ),
            ...(interactionHistory === undefined ? {} : { interactionHistory }),
          }));
    const runtime =
      grounded === undefined
        ? options.runtime
        : new PetraInteractionRuntime({
            ...(options.reviewBoundary === undefined
              ? {}
              : { reviewBoundary: options.reviewBoundary }),
            groundedSynthesisExecutor: grounded.executor,
            ...(groundedSynthesisTerminal === undefined
              ? {}
              : { groundedSynthesisTerminal }),
            ...(interactionHistory === undefined ? {} : { interactionHistory }),
          });
    petra = createPetraApp({
      ...options,
      ...(runtime === undefined ? {} : { runtime }),
      ...(codexProvider === undefined ? {} : { codexProvider }),
      ...(codexWorkspaceRoot === undefined ? {} : { codexWorkspaceRoot }),
      ...(options.projectShellViews !== undefined
        ? { projectShellViews: options.projectShellViews }
        : options.projectShellPersistence === undefined
          ? {}
          : { projectShellViews: options.projectShellPersistence.views }),
      ...(options.projectEffectiveControls !== undefined
        ? { projectEffectiveControls: options.projectEffectiveControls }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectEffectiveControls:
                options.projectShellPersistence.effectiveControls,
            }),
      ...(options.projectSourceViews !== undefined
        ? { projectSourceViews: options.projectSourceViews }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceViews: options.projectShellPersistence.sourceViews,
            }),
      ...(options.projectReviewViews !== undefined
        ? { projectReviewViews: options.projectReviewViews }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectReviewViews: options.projectShellPersistence.reviewViews,
            }),
      ...(options.projectRelationshipViews !== undefined
        ? { projectRelationshipViews: options.projectRelationshipViews }
        : options.projectShellPersistence?.relationshipViews === undefined
          ? {}
          : {
              projectRelationshipViews:
                options.projectShellPersistence.relationshipViews,
            }),
      ...(options.projectObjectLocations !== undefined
        ? { projectObjectLocations: options.projectObjectLocations }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectObjectLocations:
                options.projectShellPersistence.objectLocations,
            }),
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
    await Promise.all([
      ownedCodexProvider?.close(),
      options.groundedSynthesisPersistence?.close?.(),
      options.projectShellPersistence?.close(),
    ]);
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
        await Promise.all([
          ownedCodexProvider?.close(),
          options.groundedSynthesisPersistence?.close?.(),
          options.projectShellPersistence?.close(),
        ]);
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
