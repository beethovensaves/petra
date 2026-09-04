import { PetraInteractionClient } from "@petra/adapters";
import {
  M1_GROUNDED_SYNTHESIS_QUESTION,
  createGroundedSynthesisPersistenceFromEnvironment,
  startPetraServer,
} from "@petra/server";

const workspaceRoot = process.cwd();
const token = "petra-codex-grounded-integration";
const persistence = await createGroundedSynthesisPersistenceFromEnvironment();
const server = await startPetraServer({
  port: 0,
  authToken: token,
  codexWorkspaceRoot: workspaceRoot,
  codexSidecar: { cwd: workspaceRoot, requestTimeoutMs: 30_000 },
  codexGroundedSynthesis: { timeoutMs: 120_000 },
  groundedSynthesisPersistence: persistence,
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
  const expectedExecutionSource = process.env.PETRA_EXPECT_EXECUTION_SOURCE;
  const persistenceComplete = result.events.findIndex(
    (event) =>
      event.type === "ACTIVITY_SNAPSHOT" &&
      event.payload.activityType === "petra.work_unit.status" &&
      event.payload.content?.stage === "persistence" &&
      event.payload.content?.status === "completed",
  );
  const textStart = result.events.findIndex(
    (event) => event.type === "TEXT_MESSAGE_START",
  );
  if (
    typeof answer !== "string" ||
    answer.length === 0 ||
    terminal?.modelDeploymentId !==
      "model_deployment_2GQKKQBMKS7BTZ6CCES42FNHV8" ||
    terminal?.roleCertificationId !==
      "role_certification_2Y0M9BRCDNMBMK55DXEMV31Q8Y" ||
    terminal?.authorityEffect !== "none" ||
    !["provider", "memory_cache", "durable_cache"].includes(
      terminal?.executionSource,
    ) ||
    (expectedExecutionSource !== undefined &&
      terminal.executionSource !== expectedExecutionSource) ||
    typeof terminal?.terminalBinding?.grounded_response_id !== "string" ||
    terminal.terminalBinding.grounded_response_revision !== 1 ||
    terminal.terminalBinding.interaction_run_revision !== 2 ||
    terminal.terminalBinding.work_unit_revision !== 4 ||
    persistenceComplete < 0 ||
    textStart <= persistenceComplete
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
          execution_source: terminal.executionSource,
          terminal_binding: terminal.terminalBinding,
        },
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await server.shutdown();
}
