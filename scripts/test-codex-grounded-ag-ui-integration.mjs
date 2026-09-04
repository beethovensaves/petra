import { PetraInteractionClient } from "@petra/adapters";
import {
  M1_GROUNDED_SYNTHESIS_QUESTION,
  startPetraServer,
} from "@petra/server";

const workspaceRoot = process.cwd();
const token = "petra-codex-grounded-integration";
const server = await startPetraServer({
  port: 0,
  authToken: token,
  codexWorkspaceRoot: workspaceRoot,
  codexSidecar: { cwd: workspaceRoot, requestTimeoutMs: 30_000 },
  codexGroundedSynthesis: { timeoutMs: 120_000 },
});

try {
  const account = await server.codexProvider?.readAccount();
  if (!account?.authenticated || account.authMode !== "chatgpt") {
    throw new Error(
      "The W18 integration requires Codex-managed ChatGPT OAuth; no API-key fallback is allowed.",
    );
  }
  const client = new PetraInteractionClient({
    endpoint: `${server.url}/api/interactions/run`,
    token,
    traceId: "trace_codex_grounded_ag_ui",
  });
  const result = await client.run({
    threadId: "thread_codex_grounded_ag_ui",
    runId: `run_codex_grounded_ag_ui_${Date.now()}`,
    prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
    workflow: "grounded_synthesis",
  });
  const terminal = result.events.find((event) => event.type === "RUN_FINISHED")
    ?.payload.result;
  const answer = result.messages.at(-1)?.content;
  if (
    typeof answer !== "string" ||
    answer.length === 0 ||
    terminal?.modelDeploymentId !==
      "model_deployment_2GQKKQBMKS7BTZ6CCES42FNHV8" ||
    terminal?.roleCertificationId !==
      "role_certification_2Y0M9BRCDNMBMK55DXEMV31Q8Y" ||
    terminal?.authorityEffect !== "none"
  ) {
    throw new Error(
      "The certified OAuth run did not reach a complete, non-authoritative AG-UI terminal result.",
    );
  }
  const activities = result.events
    .filter((event) => event.type === "ACTIVITY_SNAPSHOT")
    .map((event) => event.payload.activityType);
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        authentication: {
          auth_mode: account.authMode,
          plan_type: account.planType,
          api_key_used: false,
        },
        question: M1_GROUNDED_SYNTHESIS_QUESTION,
        activities,
        terminal: {
          context_packet_id: terminal.contextPacketRef.context_packet_id,
          evidence_packet_id: terminal.evidencePacketRef.evidence_packet_id,
          snapshot_id: terminal.snapshotId,
          model_request_id: terminal.modelRequestId,
          model_call_id: terminal.modelCallId,
          model_deployment_id: terminal.modelDeploymentId,
          role_certification_id: terminal.roleCertificationId,
          statement_origins: terminal.statementOrigins,
          authority_effect: terminal.authorityEffect,
          cost_accounting: terminal.cost.accounting,
        },
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await server.shutdown();
}
