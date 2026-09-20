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
  SuggestedActionInvocationCoordinator,
  derivePetraId,
  type GroundedSynthesisTerminalPort,
} from "@petra/core";

import { createPetraApp, type PetraAppOptions } from "./app.js";
import type { GroundedSynthesisPersistence } from "./grounded-synthesis-persistence.js";
import type { ProjectShellPersistence } from "./project-shell-persistence.js";
import { ProjectModelReadinessService } from "./project-model-readiness.js";
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
    const projectModelReadiness =
      options.projectModelReadiness ??
      (grounded === undefined || options.projectShellPersistence === undefined
        ? undefined
        : new ProjectModelReadinessService({
            authority: options.projectShellPersistence.modelContexts,
            runtime: grounded,
          }));
    const suggestedActionInvocations =
      options.projectShellPersistence === undefined ||
      runtime === undefined ||
      grounded === undefined
        ? undefined
        : new SuggestedActionInvocationCoordinator(
            options.projectShellPersistence.suggestedActionInvocations,
            {
              startSuggestedActionWork: async ({ invocation, prompt }) => {
                const correlation = invocation.content.interaction;
                const request = {
                  threadId: correlation.protocol_thread_id,
                  runId: correlation.protocol_run_id,
                  prompt,
                  requestId: derivePetraId(
                    "request",
                    invocation.content.command_ref.command_id,
                  ),
                  traceId: invocation.content.command_ref.correlation_id,
                  workflow: "grounded_synthesis" as const,
                  suggestedActionInvocation: invocation,
                };
                const restored = await runtime.restoreInteraction(
                  correlation.protocol_thread_id,
                  correlation.protocol_run_id,
                  prompt,
                );
                if (restored === undefined) {
                  runtime.startInteraction(request);
                }
                try {
                  await runtime.awaitWorkRegistration(
                    correlation.protocol_run_id,
                  );
                } catch (error) {
                  if (restored?.status !== "failed") throw error;
                  runtime.retryFailedWorkRegistration(request);
                  await runtime.awaitWorkRegistration(
                    correlation.protocol_run_id,
                  );
                }
              },
            },
          );
    petra = createPetraApp({
      ...options,
      ...(runtime === undefined ? {} : { runtime }),
      ...(codexProvider === undefined ? {} : { codexProvider }),
      ...(codexWorkspaceRoot === undefined ? {} : { codexWorkspaceRoot }),
      ...(projectModelReadiness === undefined ? {} : { projectModelReadiness }),
      ...((options.communicationPlans ??
        options.projectShellPersistence?.communicationPlans) === undefined
        ? {}
        : {
            communicationPlans: (options.communicationPlans ??
              options.projectShellPersistence?.communicationPlans)!,
          }),
      ...(options.projectBriefViews !== undefined
        ? { projectBriefViews: options.projectBriefViews }
        : options.projectShellPersistence === undefined
          ? {}
          : { projectBriefViews: options.projectShellPersistence.briefViews }),
      ...(options.projectProfileReads !== undefined
        ? { projectProfileReads: options.projectProfileReads }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectProfileReads: options.projectShellPersistence.profileReads,
            }),
      ...(options.projectProfileCommands !== undefined
        ? { projectProfileCommands: options.projectProfileCommands }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectProfileCommands:
                options.projectShellPersistence.profileCommands,
            }),
      ...(options.projectProfileRecovery !== undefined
        ? { projectProfileRecovery: options.projectProfileRecovery }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectProfileRecovery:
                options.projectShellPersistence.profileRecovery,
            }),
      ...(options.projectImportCommands !== undefined
        ? { projectImportCommands: options.projectImportCommands }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectImportCommands:
                options.projectShellPersistence.importCommands,
            }),
      ...(options.projectImportRecovery !== undefined
        ? { projectImportRecovery: options.projectImportRecovery }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectImportRecovery:
                options.projectShellPersistence.importRecovery,
            }),
      ...(options.projectImportAncestry !== undefined
        ? { projectImportAncestry: options.projectImportAncestry }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectImportAncestry:
                options.projectShellPersistence.importAncestry,
            }),
      ...(options.projectObjectiveCommands !== undefined
        ? { projectObjectiveCommands: options.projectObjectiveCommands }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectObjectiveCommands:
                options.projectShellPersistence.objectiveCommands,
            }),
      ...(options.projectSourceRegistrationAuthority !== undefined
        ? {
            projectSourceRegistrationAuthority:
              options.projectSourceRegistrationAuthority,
          }
        : options.groundedSynthesisPersistence === undefined
          ? {}
          : {
              projectSourceRegistrationAuthority:
                options.groundedSynthesisPersistence.sourceRegistrations,
            }),
      ...(options.projectSourceRevisionAuthority !== undefined
        ? {
            projectSourceRevisionAuthority:
              options.projectSourceRevisionAuthority,
          }
        : options.groundedSynthesisPersistence === undefined
          ? {}
          : {
              projectSourceRevisionAuthority:
                options.groundedSynthesisPersistence.sourceRevisions,
            }),
      ...(options.projectSourceReuseAuthority !== undefined
        ? {
            projectSourceReuseAuthority: options.projectSourceReuseAuthority,
          }
        : options.groundedSynthesisPersistence === undefined
          ? {}
          : {
              projectSourceReuseAuthority:
                options.groundedSynthesisPersistence.sourceReuses,
            }),
      ...(options.projectSourceReuseOptions !== undefined
        ? { projectSourceReuseOptions: options.projectSourceReuseOptions }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceReuseOptions:
                options.projectShellPersistence.sourceReuseOptions,
            }),
      ...(options.projectSourceProcessingAuthority !== undefined
        ? {
            projectSourceProcessingAuthority:
              options.projectSourceProcessingAuthority,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceProcessingAuthority:
                options.projectShellPersistence.sourceProcessingAuthority,
            }),
      ...(options.projectSourceProcessingViews !== undefined
        ? { projectSourceProcessingViews: options.projectSourceProcessingViews }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceProcessingViews:
                options.projectShellPersistence.sourceProcessingViews,
            }),
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
      ...(options.projectHistoryViews !== undefined
        ? { projectHistoryViews: options.projectHistoryViews }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectHistoryViews: options.projectShellPersistence.historyViews,
            }),
      ...(options.projectHistoryCompensationExecution !== undefined
        ? {
            projectHistoryCompensationExecution:
              options.projectHistoryCompensationExecution,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectHistoryCompensationExecution:
                options.projectShellPersistence.historyCompensationExecution,
            }),
      ...(options.projectSourceViews !== undefined
        ? { projectSourceViews: options.projectSourceViews }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceViews: options.projectShellPersistence.sourceViews,
            }),
      ...(options.projectSourceLifecycleViews !== undefined
        ? {
            projectSourceLifecycleViews: options.projectSourceLifecycleViews,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceLifecycleViews:
                options.projectShellPersistence.sourceLifecycleViews,
            }),
      ...(options.projectSourceLinkRemovalPreviews !== undefined
        ? {
            projectSourceLinkRemovalPreviews:
              options.projectSourceLinkRemovalPreviews,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceLinkRemovalPreviews:
                options.projectShellPersistence.sourceLinkRemovalPreviews,
            }),
      ...(options.projectSourceLocalCopyDeletionPreviews !== undefined
        ? {
            projectSourceLocalCopyDeletionPreviews:
              options.projectSourceLocalCopyDeletionPreviews,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceLocalCopyDeletionPreviews:
                options.projectShellPersistence.sourceLocalCopyDeletionPreviews,
            }),
      ...(options.commandPrincipalResolver !== undefined
        ? { commandPrincipalResolver: options.commandPrincipalResolver }
        : options.projectShellPersistence?.commandPrincipalResolver ===
            undefined
          ? {}
          : {
              commandPrincipalResolver:
                options.projectShellPersistence.commandPrincipalResolver,
            }),
      ...(options.projectSourceLifecycleAuthority !== undefined
        ? {
            projectSourceLifecycleAuthority:
              options.projectSourceLifecycleAuthority,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceLifecycleAuthority:
                options.projectShellPersistence.sourceLifecycleAuthority,
            }),
      ...(options.projectSourceLinkRemovals !== undefined
        ? { projectSourceLinkRemovals: options.projectSourceLinkRemovals }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceLinkRemovals:
                options.projectShellPersistence.sourceLinkRemovals,
            }),
      ...(options.projectSourceLocalCopyDeletions !== undefined
        ? {
            projectSourceLocalCopyDeletions:
              options.projectSourceLocalCopyDeletions,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceLocalCopyDeletions:
                options.projectShellPersistence.sourceLocalCopyDeletions,
            }),
      ...(options.projectSourceReplacementAuthority !== undefined
        ? {
            projectSourceReplacementAuthority:
              options.projectSourceReplacementAuthority,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectSourceReplacementAuthority:
                options.projectShellPersistence.sourceReplacementAuthority,
            }),
      ...(options.reviewRecoveryAssessments !== undefined
        ? { reviewRecoveryAssessments: options.reviewRecoveryAssessments }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              reviewRecoveryAssessments:
                options.projectShellPersistence.reviewRecoveryAssessments,
            }),
      ...(options.projectReviewViews !== undefined
        ? { projectReviewViews: options.projectReviewViews }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectReviewViews: options.projectShellPersistence.reviewViews,
            }),
      ...(options.reviewSessionLifecycleAuthority !== undefined
        ? {
            reviewSessionLifecycleAuthority:
              options.reviewSessionLifecycleAuthority,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              reviewSessionLifecycleAuthority:
                options.projectShellPersistence.reviewSessionLifecycleAuthority,
            }),
      ...(options.reviewSessionApply !== undefined
        ? { reviewSessionApply: options.reviewSessionApply }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              reviewSessionApply:
                options.projectShellPersistence.reviewSessionApply,
            }),
      ...(options.reviewSessionReject !== undefined
        ? { reviewSessionReject: options.reviewSessionReject }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              reviewSessionReject:
                options.projectShellPersistence.reviewSessionReject,
            }),
      ...(options.reviewSessionRefreshAuthority !== undefined
        ? {
            reviewSessionRefreshAuthority:
              options.reviewSessionRefreshAuthority,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              reviewSessionRefreshAuthority:
                options.projectShellPersistence.reviewSessionRefreshAuthority,
            }),
      ...(options.reviewCandidateCorrectionAuthority !== undefined
        ? {
            reviewCandidateCorrectionAuthority:
              options.reviewCandidateCorrectionAuthority,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              reviewCandidateCorrectionAuthority:
                options.projectShellPersistence
                  .reviewCandidateCorrectionAuthority,
            }),
      ...(options.reviewCandidateBasisRevisionAuthority !== undefined
        ? {
            reviewCandidateBasisRevisionAuthority:
              options.reviewCandidateBasisRevisionAuthority,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              reviewCandidateBasisRevisionAuthority:
                options.projectShellPersistence
                  .reviewCandidateBasisRevisionAuthority,
            }),
      ...(options.reviewSessionSeparationAuthority !== undefined
        ? {
            reviewSessionSeparationAuthority:
              options.reviewSessionSeparationAuthority,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              reviewSessionSeparationAuthority:
                options.projectShellPersistence
                  .reviewSessionSeparationAuthority,
            }),
      ...(options.projectWorkingStateSnapshots !== undefined
        ? {
            projectWorkingStateSnapshots: options.projectWorkingStateSnapshots,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectWorkingStateSnapshots:
                options.projectShellPersistence.workingStateSnapshots,
            }),
      ...(options.projectRelationshipViews !== undefined
        ? { projectRelationshipViews: options.projectRelationshipViews }
        : options.projectShellPersistence?.relationshipViews === undefined
          ? {}
          : {
              projectRelationshipViews:
                options.projectShellPersistence.relationshipViews,
            }),
      ...(options.focusedGraphViews !== undefined
        ? { focusedGraphViews: options.focusedGraphViews }
        : options.projectShellPersistence?.focusedGraphViews === undefined
          ? {}
          : {
              focusedGraphViews:
                options.projectShellPersistence.focusedGraphViews,
            }),
      ...(options.focusedGraphActionPreviewViews !== undefined
        ? {
            focusedGraphActionPreviewViews:
              options.focusedGraphActionPreviewViews,
          }
        : options.projectShellPersistence?.focusedGraphActionPreviewViews ===
            undefined
          ? {}
          : {
              focusedGraphActionPreviewViews:
                options.projectShellPersistence.focusedGraphActionPreviewViews,
            }),
      ...(options.focusedGraphAnalysisViews !== undefined
        ? { focusedGraphAnalysisViews: options.focusedGraphAnalysisViews }
        : options.projectShellPersistence?.focusedGraphAnalysisViews ===
            undefined
          ? {}
          : {
              focusedGraphAnalysisViews:
                options.projectShellPersistence.focusedGraphAnalysisViews,
            }),
      ...(options.projectRelationshipOverlayViews !== undefined
        ? {
            projectRelationshipOverlayViews:
              options.projectRelationshipOverlayViews,
          }
        : options.projectShellPersistence?.relationshipOverlayViews ===
            undefined
          ? {}
          : {
              projectRelationshipOverlayViews:
                options.projectShellPersistence.relationshipOverlayViews,
            }),
      ...(options.projectObjectLocations !== undefined
        ? { projectObjectLocations: options.projectObjectLocations }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectObjectLocations:
                options.projectShellPersistence.objectLocations,
            }),
      ...(options.projectWorkViews !== undefined
        ? { projectWorkViews: options.projectWorkViews }
        : options.projectShellPersistence === undefined
          ? {}
          : { projectWorkViews: options.projectShellPersistence.workViews }),
      ...(options.projectWorkerOutputManifests !== undefined
        ? {
            projectWorkerOutputManifests: options.projectWorkerOutputManifests,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectWorkerOutputManifests:
                options.projectShellPersistence.workerOutputManifests,
            }),
      ...(options.projectWorkOperations !== undefined
        ? { projectWorkOperations: options.projectWorkOperations }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectWorkOperations:
                options.projectShellPersistence.workOperations,
            }),
      ...(options.projectWorkOperationAuthority !== undefined
        ? {
            projectWorkOperationAuthority:
              options.projectWorkOperationAuthority,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectWorkOperationAuthority:
                options.projectShellPersistence.workOperationAuthority,
            }),
      ...(options.projectThreadViews !== undefined
        ? { projectThreadViews: options.projectThreadViews }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectThreadViews: options.projectShellPersistence.threadViews,
            }),
      ...(options.projectInquiryViews !== undefined
        ? { projectInquiryViews: options.projectInquiryViews }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              projectInquiryViews: options.projectShellPersistence.inquiryViews,
            }),
      ...(options.projectInquirySaveAuthority !== undefined
        ? {
            projectInquirySaveAuthority: options.projectInquirySaveAuthority,
          }
        : options.projectShellPersistence?.inquirySaveAuthority === undefined
          ? {}
          : {
              projectInquirySaveAuthority:
                options.projectShellPersistence.inquirySaveAuthority,
            }),
      ...(options.suggestedActionViews !== undefined
        ? { suggestedActionViews: options.suggestedActionViews }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              suggestedActionViews:
                options.projectShellPersistence.suggestedActionViews,
            }),
      ...(options.suggestedActionInvocations !== undefined
        ? {
            suggestedActionInvocations: options.suggestedActionInvocations,
          }
        : suggestedActionInvocations === undefined
          ? {}
          : { suggestedActionInvocations }),
      ...(options.suggestedActionInvocationViews !== undefined
        ? {
            suggestedActionInvocationViews:
              options.suggestedActionInvocationViews,
          }
        : options.projectShellPersistence === undefined
          ? {}
          : {
              suggestedActionInvocationViews:
                options.projectShellPersistence.suggestedActionInvocations,
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
