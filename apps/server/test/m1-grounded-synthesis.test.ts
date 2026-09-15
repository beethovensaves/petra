import { readFileSync } from "node:fs";

import { PetraInteractionClient } from "@petra/adapters";
import type {
  CodexAccountSummary,
  CodexManagedLoginResult,
  CodexModelSummary,
  CodexProviderDiagnostics,
  CodexProviderEvent,
  CodexSubscriptionProviderPort,
  CodexThreadStartRequest,
  CodexThreadSummary,
  CodexTurnStartRequest,
  CodexTurnSummary,
} from "@petra/adapters/server";
import type { PetraModelSynthesistOutput } from "@petra/contracts";
import { describe, expect, it } from "vitest";

import {
  M1_GROUNDED_SYNTHESIS_QUESTION,
  createM1GroundedSynthesisRuntime,
} from "../src/m1-grounded-synthesis.js";
import { startPetraServer } from "../src/server.js";

const TOKEN = "petra-m1-grounded-token";
const WORKSPACE_ROOT = new URL("../../..", import.meta.url).pathname.replace(
  /\/$/,
  "",
);
const CODEX_VERSION = "codex-cli 0.154.0";

const output = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/model-synthesist-output.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraModelSynthesistOutput;

const certifiedModel: CodexModelSummary = {
  id: "gpt-5.6-terra",
  model: "gpt-5.6-terra",
  displayName: "GPT-5.6-Terra",
  hidden: false,
  isDefault: false,
  defaultReasoningEffort: "medium",
  supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max", "ultra"],
  inputModalities: ["text", "image"],
  supportsPersonality: false,
};

const terminalPersistence = {
  persist: () =>
    Promise.resolve({
      grounded_response_id: "grounded_response_01ARZ3NDEKTSV4RRFFQ69G5FEA",
      grounded_response_revision: 1,
      grounded_response_hash: `sha256:${"1".repeat(64)}`,
      response_artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FEB",
      response_artifact_hash: `sha256:${"2".repeat(64)}`,
      interaction_run_id: "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FEC",
      interaction_run_revision: 2,
      interaction_run_hash: `sha256:${"3".repeat(64)}`,
      work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FED",
      work_unit_revision: 4,
      work_unit_spec_hash: `sha256:${"4".repeat(64)}`,
      persisted_at: "2026-09-04T01:00:01.000Z",
    }),
};

class FakeCertifiedCodexProvider implements CodexSubscriptionProviderPort {
  readonly threadRequests: CodexThreadStartRequest[] = [];
  readonly turnRequests: CodexTurnStartRequest[] = [];
  readonly listeners = new Set<(event: CodexProviderEvent) => void>();
  accountReads = 0;
  catalog: readonly CodexModelSummary[] = [certifiedModel];

  diagnostics(): CodexProviderDiagnostics {
    return {
      providerKind: "codex_app_server",
      initialized: true,
      transport: "stdio_jsonl",
      stableApiOnly: true,
      managedChatgptAuthOnly: true,
      pendingRequests: 0,
      pendingServerRequests: 0,
      scientificExtractionEligible: false,
    };
  }

  readAccount(): Promise<CodexAccountSummary> {
    this.accountReads += 1;
    return Promise.resolve({
      authenticated: true,
      authMode: "chatgpt",
      planType: "prolite",
      requiresOpenaiAuth: true,
    });
  }

  listModels(): Promise<readonly CodexModelSummary[]> {
    return Promise.resolve(this.catalog);
  }

  startManagedLogin(): Promise<CodexManagedLoginResult> {
    throw new Error("Not used by the grounded synthesis test.");
  }

  cancelManagedLogin(): Promise<void> {
    return Promise.resolve();
  }

  startThread(request: CodexThreadStartRequest): Promise<CodexThreadSummary> {
    this.threadRequests.push(request);
    return Promise.resolve({
      threadId: "thr_m1_grounded",
      model: request.model ?? null,
      modelProvider: "openai",
      cwd: request.cwd,
    });
  }

  startTurn(request: CodexTurnStartRequest): Promise<CodexTurnSummary> {
    this.turnRequests.push(request);
    queueMicrotask(() => {
      this.emit({
        kind: "notification",
        method: "item/completed",
        params: {
          threadId: request.threadId,
          turnId: "turn_m1_grounded",
          item: {
            id: "message_m1_grounded",
            type: "agentMessage",
            phase: "final_answer",
            text: JSON.stringify(output),
          },
        },
      });
      this.emit({
        kind: "notification",
        method: "turn/completed",
        params: {
          threadId: request.threadId,
          turn: {
            id: "turn_m1_grounded",
            status: "completed",
            error: null,
          },
        },
      });
    });
    return Promise.resolve({
      threadId: request.threadId,
      turnId: "turn_m1_grounded",
      status: "inProgress",
    });
  }

  interruptTurn(): Promise<void> {
    return Promise.resolve();
  }

  resolveApproval(): Promise<void> {
    return Promise.resolve();
  }

  onEvent(listener: (event: CodexProviderEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  private emit(event: CodexProviderEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

describe("M1.6-W18 certified grounded server composition", () => {
  it("refuses to expose the live model route without a terminal boundary", async () => {
    await expect(
      startPetraServer({
        port: 0,
        authToken: TOKEN,
        codexProvider: new FakeCertifiedCodexProvider(),
        codexWorkspaceRoot: WORKSPACE_ROOT,
        codexGroundedSynthesis: {
          codexRuntimeVersion: CODEX_VERSION,
          now: () => "2026-09-04T01:00:00.000Z",
        },
      }),
    ).rejects.toThrow("requires a terminal persistence boundary");
  });

  it("loads the recorded certification and executes it through Petra's AG-UI client", async () => {
    const provider = new FakeCertifiedCodexProvider();
    const server = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      codexProvider: provider,
      codexWorkspaceRoot: WORKSPACE_ROOT,
      codexGroundedSynthesis: {
        codexRuntimeVersion: CODEX_VERSION,
        now: () => "2026-09-04T01:00:00.000Z",
      },
      groundedSynthesisTerminal: terminalPersistence,
    });
    try {
      const client = new PetraInteractionClient({
        endpoint: `${server.url}/api/interactions/run`,
        token: TOKEN,
        traceId: "trace_m1_grounded",
      });
      const result = await client.run({
        threadId: "thread_m1_grounded",
        runId: "run_m1_grounded",
        prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
        workflow: "grounded_synthesis",
      });
      expect(result.messages.at(-1)?.content).toContain(
        "H01 — The selected study reports a measurable improvement on its evaluation task",
      );
      expect(
        result.events
          .filter((event) => event.type === "ACTIVITY_SNAPSHOT")
          .map((event) => event.payload.activityType),
      ).toEqual([
        "petra.retrieval.status",
        "petra.retrieval.status",
        "petra.evidence_packet.status",
        "petra.model.status",
        "petra.model.status",
        "petra.validation.status",
        "petra.work_unit.status",
        "petra.work_unit.status",
        "petra.work_unit.status",
      ]);
      const terminal = result.events.find(
        (event) => event.type === "RUN_FINISHED",
      );
      expect(terminal?.payload.result).toMatchObject({
        contextPacketRef: {
          context_packet_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
        },
        evidencePacketRef: {
          evidence_packet_id: "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FCG",
        },
        snapshotId: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
        modelDeploymentId: "model_deployment_1WKCAZEM2G2CQ4NZAAB2G68XGW",
        roleCertificationId: "role_certification_2QNNWEG32XSDY4HWQW209N9T86",
        authorityEffect: "none",
        terminalBinding: {
          grounded_response_id: "grounded_response_01ARZ3NDEKTSV4RRFFQ69G5FEA",
          interaction_run_revision: 2,
          work_unit_revision: 4,
        },
      });
      expect(provider.threadRequests).toHaveLength(1);
      expect(provider.threadRequests[0]).toMatchObject({
        model: "gpt-5.6-terra",
        approvalPolicy: "never",
        sandbox: "read-only",
        ephemeral: true,
      });
      expect(provider.turnRequests[0]).toMatchObject({
        model: "gpt-5.6-terra",
        effort: "low",
      });
      expect(JSON.stringify(provider.turnRequests)).not.toContain("apiKey");
    } finally {
      await server.shutdown();
    }
  });

  it("refuses unsupported questions before a provider turn", async () => {
    const provider = new FakeCertifiedCodexProvider();
    const runtime = await createM1GroundedSynthesisRuntime({
      provider,
      workspaceRoot: WORKSPACE_ROOT,
      codexRuntimeVersion: CODEX_VERSION,
      now: () => "2026-09-04T01:00:00.000Z",
    });

    await expect(
      runtime.executor.execute({
        prompt: "Does this result generalize to an unrelated domain?",
        onProgress: () => undefined,
      }),
    ).rejects.toThrow(M1_GROUNDED_SYNTHESIS_QUESTION);
    expect(provider.accountReads).toBe(0);
    expect(provider.threadRequests).toHaveLength(0);
  });

  it("invalidates execution when the runtime or entitlement snapshot drifts", async () => {
    const versionDriftProvider = new FakeCertifiedCodexProvider();
    await expect(
      createM1GroundedSynthesisRuntime({
        provider: versionDriftProvider,
        workspaceRoot: WORKSPACE_ROOT,
        codexRuntimeVersion: "codex-cli 0.152.0",
      }),
    ).rejects.toThrow("runtime or structured-output schema has drifted");

    const catalogDriftProvider = new FakeCertifiedCodexProvider();
    catalogDriftProvider.catalog = [
      { ...certifiedModel, displayName: "Changed deployment label" },
    ];
    const runtime = await createM1GroundedSynthesisRuntime({
      provider: catalogDriftProvider,
      workspaceRoot: WORKSPACE_ROOT,
      codexRuntimeVersion: CODEX_VERSION,
      now: () => "2026-09-04T01:00:00.000Z",
    });
    await expect(
      runtime.executor.execute({
        prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
        onProgress: () => undefined,
      }),
    ).rejects.toThrow("entitlement catalog has drifted");
    expect(catalogDriftProvider.threadRequests).toHaveLength(0);
  });
});
