import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PetraInteractionClient } from "@petra/adapters";
import { derivePetraId } from "@petra/core";
import {
  PostgresCapabilityGrantAuthorityRepository,
  PostgresProjectDefinitionAuthorityRepository,
  PostgresProjectInquiryAuthorityRepository,
  projectInquiryRoleRef,
} from "@petra/postgres";
import {
  M1_GROUNDED_SYNTHESIS_QUESTION,
  createGroundedSynthesisPersistenceFromEnvironment,
  createProjectShellPersistenceFromEnvironment,
  startPetraServer,
} from "@petra/server";
import { canonicalize } from "json-canonicalize";
import pg from "pg";

const { Pool } = pg;
const root = resolve(import.meta.dirname, "..");
const composeFile = resolve(root, "infra/recovery/integration.compose.yaml");
const projectName = `petra-wave3-cumulative-${process.pid}-${Date.now()}`;
const token = "petra-wave3-cumulative-token";
const postgresPassword = "petra-recovery-only";
const humanActorId = "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV";
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readAccepted = (name) =>
  readJson(
    resolve(root, "packages/contracts/fixtures/accepted", `${name}.json`),
  );
const certification = readJson(
  resolve(
    root,
    "config/model-certifications/codex-terra-synthesist-1.1.0.json",
  ),
);
const synthesistOutput = readAccepted("model-synthesist-output");

const hashRecord = (value) =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const clone = (value) => structuredClone(value);
const progress = (message) =>
  process.stderr.write(`[wave3-cumulative] ${message}\n`);

const deferred = () => {
  let resolvePromise;
  const promise = new Promise((resolveDeferred) => {
    resolvePromise = resolveDeferred;
  });
  return { promise, resolve: resolvePromise };
};

class DeterministicCertifiedProvider {
  constructor({ pauseAccountRead } = {}) {
    this.pauseAccountRead = pauseAccountRead;
    this.accountReads = 0;
    this.threadRequests = [];
    this.turnRequests = [];
    this.listeners = new Set();
    this.actionPlan = deferred();
    this.actionPlanRelease = deferred();
  }

  diagnostics() {
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

  async readAccount() {
    this.accountReads += 1;
    if (this.accountReads === this.pauseAccountRead) {
      this.actionPlan.resolve();
      await this.actionPlanRelease.promise;
    }
    return {
      authenticated: true,
      authMode: "chatgpt",
      planType: "deterministic-integration",
      requiresOpenaiAuth: true,
    };
  }

  listModels() {
    return Promise.resolve([clone(certification.runtime.model_catalog_entry)]);
  }

  startManagedLogin() {
    throw new Error("Managed login is outside the cumulative proof.");
  }

  cancelManagedLogin() {
    return Promise.resolve();
  }

  startThread(request) {
    this.threadRequests.push(clone(request));
    return Promise.resolve({
      threadId: `thr_wave3_${this.threadRequests.length}`,
      model: request.model ?? null,
      modelProvider: "openai",
      cwd: request.cwd,
    });
  }

  startTurn(request) {
    this.turnRequests.push(clone(request));
    const turnId = `turn_wave3_${this.turnRequests.length}`;
    queueMicrotask(() => {
      this.emit({
        kind: "notification",
        method: "item/completed",
        params: {
          threadId: request.threadId,
          turnId,
          item: {
            id: `message_wave3_${this.turnRequests.length}`,
            type: "agentMessage",
            phase: "final_answer",
            text: JSON.stringify(synthesistOutput),
          },
        },
      });
      this.emit({
        kind: "notification",
        method: "turn/completed",
        params: {
          threadId: request.threadId,
          turn: { id: turnId, status: "completed", error: null },
        },
      });
    });
    return Promise.resolve({
      threadId: request.threadId,
      turnId,
      status: "inProgress",
    });
  }

  interruptTurn() {
    return Promise.resolve();
  }

  resolveApproval() {
    return Promise.resolve();
  }

  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    return Promise.resolve();
  }

  releaseActionPlan() {
    this.actionPlanRelease.resolve();
  }

  emit(event) {
    for (const listener of this.listeners) listener(event);
  }
}

const run = (program, args, options = {}) =>
  new Promise((resolveRun) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveRun(result);
    };
    const child = spawn(program, args, {
      cwd: root,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) =>
      finish({ code: 1, stdout, stderr: error.message }),
    );
    child.on("close", (code, signal) =>
      finish({ code: code ?? 1, signal, stdout, stderr }),
    );
  });

const requireRun = async (program, args, options) => {
  const result = await run(program, args, options);
  if (result.code !== 0) {
    throw new Error(
      `${program} ${args.join(" ")} failed (${result.code}):\n${result.stderr || result.stdout}`,
    );
  }
  return result;
};

const composeArgs = (...args) => [
  "compose",
  "--project-name",
  projectName,
  "--file",
  composeFile,
  ...args,
];

const servicePort = async (service, containerPort) => {
  const result = await requireRun(
    "docker",
    composeArgs("port", service, containerPort),
  );
  const port = /:(\d+)\s*$/u.exec(result.stdout)?.[1];
  if (port === undefined) {
    throw new Error(`Could not resolve ${service}:${containerPort}.`);
  }
  return port;
};

const resourceCount = async () => {
  const filter = `label=com.docker.compose.project=${projectName}`;
  const results = await Promise.all([
    run("docker", ["ps", "--all", "--quiet", "--filter", filter]),
    run("docker", ["network", "ls", "--quiet", "--filter", filter]),
    run("docker", ["volume", "ls", "--quiet", "--filter", filter]),
  ]);
  return results.reduce(
    (count, result) =>
      count + result.stdout.split("\n").filter((line) => line !== "").length,
    0,
  );
};

const waitFor = async (description, read, accept, timeoutMs = 15_000) => {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await read();
    if (accept(last)) return last;
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  throw new Error(`${description} did not converge: ${JSON.stringify(last)}`);
};

const authorizedHeaders = {
  authorization: `Bearer ${token}`,
  accept: "application/json",
};

const readHttpJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${url} failed (${response.status}): ${JSON.stringify(body)}`,
    );
  }
  return { body, status: response.status };
};

const seedActionAuthority = async (pool, terminal) => {
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const inquiries = new PostgresProjectInquiryAuthorityRepository(pool);
  const grants = new PostgresCapabilityGrantAuthorityRepository(pool);
  const definition = readAccepted("project-definition-scientific");
  const objective = readAccepted("project-objective");
  const role = readAccepted("project-inquiry-role");
  const link = readAccepted("project-inquiry-result-link");

  await definitions.registerDefinitionRevision(definition);
  await definitions.registerObjectiveRevision(objective);
  await inquiries.registerProjectInquiryRoleRevision(role);

  const responseRow = await pool.query(
    `SELECT payload, record_hash
       FROM petra.grounded_response_revisions
      WHERE grounded_response_id = $1 AND revision = $2`,
    [terminal.grounded_response_id, terminal.grounded_response_revision],
  );
  const workRow = await pool.query(
    `SELECT payload, record_hash
       FROM petra.work_unit_revisions
      WHERE work_unit_id = $1 AND revision = $2`,
    [terminal.work_unit_id, terminal.work_unit_revision],
  );
  const response = responseRow.rows[0];
  const work = workRow.rows[0];
  assert(
    response !== undefined,
    "The source GroundedResponse was not durable.",
  );
  assert(work !== undefined, "The source WorkUnit terminal was not durable.");

  link.content.inquiry_role_ref = projectInquiryRoleRef(role);
  link.content.inquiry_anchor.objective_ref = {
    objective_id: objective.objective_id,
    revision: objective.revision,
    content_hash: objective.content_hash,
    record_hash: hashRecord(objective),
  };
  link.content.target.result_ref = {
    schema_name: response.payload.schema_name,
    schema_version: response.payload.schema_version,
    record_id: response.payload.grounded_response_id,
    revision: response.payload.revision,
    content_hash: response.payload.content_hash,
    record_hash: response.record_hash,
  };
  link.content.target.produced_by_work_ref = {
    work_unit_id: work.payload.work_unit_id,
    revision: work.payload.revision,
    spec_hash: work.payload.spec_hash,
    record_hash: work.record_hash,
  };
  link.content_hash = hashRecord(link.content);
  await inquiries.registerProjectInquiryLink(link);

  const grantContent = {
    scope_kind: "project_commands",
    allowed_commands: ["InvokeSuggestedAction"],
    valid_from: "2026-09-10T00:00:00.000Z",
    reason:
      "Authorize the exact bounded SuggestedAction used by the Wave 3 proof.",
  };
  const grant = {
    schema_name: "petra.capability-grant",
    schema_version: "1.2.0",
    capability_grant_id: derivePetraId(
      "capability_grant",
      "wave3-cumulative-invoke-suggested-action",
    ),
    revision: 1,
    project_id: projectId,
    grantee: { actor_id: humanActorId, actor_kind: "human" },
    content: grantContent,
    content_hash: hashRecord(grantContent),
    issued_by: { actor_id: humanActorId, actor_kind: "human" },
    issued_at: "2026-09-10T00:00:00.000Z",
  };
  await grants.registerCapabilityGrant(grant);
  return { grant, link, objective };
};

const invocationPath = (serverUrl, actionId) =>
  `${serverUrl}/api/commands/projects/${projectId}/suggested-actions/${actionId}/invoke`;

const invokeFromPresentation = async (
  presentation,
  serverUrl,
  actionId,
  request,
) => {
  const result = await readHttpJson(invocationPath(serverUrl, actionId), {
    method: "POST",
    headers: {
      ...authorizedHeaders,
      "content-type": "application/json",
      "x-petra-trace-id": `wave3-${presentation}`,
    },
    body: JSON.stringify(request),
  });
  return { presentation, ...result };
};

const invocationRead = (serverUrl, commandId) =>
  readHttpJson(
    `${serverUrl}/api/queries/projects/${projectId}/suggested-action-invocations/${commandId}`,
    { headers: authorizedHeaders },
  ).then(({ body }) => body);

const actionProof = async (environment, seedPool) => {
  const provider = new DeterministicCertifiedProvider({
    // The initial source run checks the account once while planning and once
    // inside the provider adapter. The action's third read is therefore the
    // first safe point after its Work has been registered durably.
    pauseAccountRead: 3,
  });
  let active;

  const launch = async (launchProvider) => {
    const grounded =
      await createGroundedSynthesisPersistenceFromEnvironment(environment);
    const projectShell =
      await createProjectShellPersistenceFromEnvironment(environment);
    try {
      const server = await startPetraServer({
        port: 0,
        authToken: token,
        codexProvider: launchProvider,
        codexWorkspaceRoot: root,
        codexGroundedSynthesis: {
          codexRuntimeVersion: certification.runtime.codex_version,
          timeoutMs: 120_000,
        },
        groundedSynthesisPersistence: grounded,
        projectShellPersistence: projectShell,
      });
      return { grounded, projectShell, server };
    } catch (error) {
      await Promise.all([grounded.close?.(), projectShell.close()]);
      throw error;
    }
  };

  try {
    active = await launch(provider);
    progress("server started on clean migrated stores");
    const sourceClient = new PetraInteractionClient({
      endpoint: `${active.server.url}/api/interactions/run`,
      token,
      traceId: "trace_wave3_source_result",
    });
    const source = await sourceClient.run({
      threadId: "thread_wave3_source_result",
      runId: "run_wave3_source_result",
      prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
      workflow: "grounded_synthesis",
      connectionId: derivePetraId(
        "interaction_connection",
        "wave3-source-result",
      ),
    });
    progress("source GroundedResponse completed");
    const sourceTerminal = source.events.find(
      (event) => event.type === "RUN_FINISHED",
    )?.payload.result?.terminalBinding;
    assert(sourceTerminal !== undefined, "The source run did not persist.");
    assert(
      sourceTerminal.work_unit_revision === 4,
      "The source Work did not reach its canonical terminal revision.",
    );

    const seeded = await seedActionAuthority(seedPool, sourceTerminal);
    progress("Project definition, inquiry result, and grant registered");
    const previewUrl = new URL(
      `/api/queries/projects/${projectId}/suggested-actions`,
      active.server.url,
    );
    previewUrl.searchParams.set(
      "inquiry_result_link_id",
      seeded.link.project_inquiry_link_id,
    );
    previewUrl.searchParams.set("action_kind", "run_grounded_synthesis");
    const unauthorizedPreview = await fetch(previewUrl);
    assert(
      unauthorizedPreview.status === 401,
      "The Work-starting preview was readable without authentication.",
    );
    const { body: preview } = await readHttpJson(previewUrl, {
      headers: authorizedHeaders,
    });
    progress("authenticated SuggestedAction 1.1 preview read");
    assert(
      preview.schema_name === "petra.suggested-action-view" &&
        preview.schema_version === "1.1.0" &&
        preview.project_id === projectId &&
        preview.content.readiness.state === "ready" &&
        preview.content.readiness.grant_ref.capability_grant_id ===
          seeded.grant.capability_grant_id,
      "The authenticated 1.1 preview did not carry exact server readiness.",
    );

    const actionId = preview.content.action_ref.suggested_action_id;
    const commandId = derivePetraId(
      "command",
      "wave3-cumulative-invoke-suggested-action",
    );
    const request = {
      schema_name: "petra.suggested-action-invocation-request",
      schema_version: "1.0.0",
      command_id: commandId,
      idempotency_key: `wave3-suggested-action:${commandId}`,
      inquiry_result_link_id: seeded.link.project_inquiry_link_id,
      expected_action_ref: clone(preview.content.action_ref),
      response_depth: "current_graph",
      submitted_at: "2026-09-11T20:00:00.000Z",
    };

    const direct = await invokeFromPresentation(
      "direct",
      active.server.url,
      actionId,
      request,
    );
    progress("direct invocation accepted with durable Work registration");
    await provider.actionPlan.promise;
    progress("action execution paused after durable Work registration");
    const conversational = await invokeFromPresentation(
      "conversational",
      active.server.url,
      actionId,
      request,
    );
    progress("conversational invocation converged on the exact command");
    assert(
      canonicalize(direct.body.content.invocation) ===
        canonicalize(conversational.body.content.invocation),
      "Direct and conversational invocation did not converge on one receipt.",
    );
    assert(
      direct.body.content.invocation.content.path_convergence ===
        "direct_and_conversational_same_command" &&
        direct.body.content.invocation.content.command_ref.command_name ===
          "InvokeSuggestedAction",
      "The accepted receipt lost its exact shared-command declaration.",
    );

    const running = await invocationRead(active.server.url, commandId);
    const runningRecovery = Object.fromEntries(
      running.content.recovery.actions.map((action) => [
        action.operation,
        action.eligibility,
      ]),
    );
    assert(
      running.content.operation_state === "running" &&
        running.content.work.execution_state === "running" &&
        canonicalize(
          running.content.history.work_revisions.map(
            (revision) => revision.state,
          ),
        ) === canonicalize(["requested", "queued", "running"]) &&
        runningRecovery.reconnect_delivery === "eligible" &&
        runningRecovery.cancel_work === "eligible" &&
        runningRecovery.inspect_result === "ineligible",
      "The running invocation did not expose canonical Work and current recovery.",
    );

    const correlation = running.content.invocation.content.interaction;
    const interruptedConnectionId = derivePetraId(
      "interaction_connection",
      `${commandId}|aborted-delivery`,
    );
    const abortController = new AbortController();
    const interruptedClient = new PetraInteractionClient({
      endpoint: `${active.server.url}/api/interactions/run`,
      token,
      traceId: "trace_wave3_interrupted_delivery",
    });
    const interruptedRun = interruptedClient.run({
      threadId: correlation.protocol_thread_id,
      runId: correlation.protocol_run_id,
      prompt: preview.content.action.execution.prompt,
      workflow: "grounded_synthesis",
      connectionId: interruptedConnectionId,
      abortController,
    });
    setTimeout(() => abortController.abort(), 50);
    await interruptedRun.catch((error) => {
      if (!abortController.signal.aborted) throw error;
    });
    progress("active delivery aborted without a Work cancellation command");
    assert(
      abortController.signal.aborted,
      "The delivery interruption was not exercised.",
    );
    const retainedWhileInterrupted = await invocationRead(
      active.server.url,
      commandId,
    );
    assert(
      retainedWhileInterrupted.content.operation_state === "running" &&
        retainedWhileInterrupted.content.recovery.actions.find(
          (action) => action.operation === "cancel_work",
        )?.eligibility === "eligible",
      "Aborting delivery cancelled or obscured the running Work.",
    );

    provider.releaseActionPlan();
    const completed = await waitFor(
      "SuggestedAction terminal result",
      () => invocationRead(active.server.url, commandId),
      (view) => view.content.operation_state === "completed",
    );
    progress("terminal invocation view reached completed Work");
    const completedRecovery = Object.fromEntries(
      completed.content.recovery.actions.map((action) => [
        action.operation,
        action.eligibility,
      ]),
    );
    assert(
      completed.content.result.state === "available" &&
        completed.content.work.execution_state === "completed" &&
        completed.content.work.terminal_outcome === "succeeded" &&
        canonicalize(
          completed.content.history.work_revisions.map(
            (revision) => revision.state,
          ),
        ) === canonicalize(["requested", "queued", "running", "completed"]),
      "The invocation did not reach a terminal GroundedResponse over canonical Work revisions.",
    );
    assert(
      canonicalize(completedRecovery) ===
        canonicalize({
          retry_exact_start: "ineligible",
          reconnect_delivery: "eligible",
          cancel_work: "ineligible",
          inspect_work: "eligible",
          inspect_result: "eligible",
        }),
      "Terminal recovery eligibility was not supplied exactly by the server.",
    );
    assert(
      canonicalize(completed.content.history.destinations) ===
        canonicalize([
          {
            place_role: "work",
            task_intent: "continue_work",
            object_ref: {
              semantic_key: "petra.work-unit",
              object_id:
                completed.content.invocation.content.expected_work_unit_id,
            },
          },
          {
            place_role: "history",
            task_intent: "view_history",
            object_ref: {
              semantic_key: "petra.work-unit",
              object_id:
                completed.content.invocation.content.expected_work_unit_id,
            },
          },
        ]),
      "Canonical Work and History destinations drifted.",
    );

    const interruptedAttempt = await waitFor(
      "aborted InteractionRun delivery",
      () =>
        active.grounded.interactions.getConnectionAttempt(
          interruptedConnectionId,
        ),
      (attempt) => attempt === 1,
    );
    progress("aborted delivery attempt retained");
    const abortedReplay = await seedPool.query(
      `SELECT payload
         FROM petra.interaction_replay_records
        WHERE connection_id = $1 AND attempt = 1`,
      [interruptedConnectionId],
    );
    assert(
      abortedReplay.rows[0]?.payload.content.outcome.outcome_kind ===
        "connection_aborted" &&
        abortedReplay.rows[0].payload.content.authority_boundary
          .authority_reapplied === false &&
        abortedReplay.rows[0].payload.content.authority_boundary
          .commands_reexecuted === false &&
        abortedReplay.rows[0].payload.content.authority_boundary
          .durable_work_cancelled === false,
      "The aborted delivery did not retain the exact no-reauthority boundary.",
    );

    await active.server.shutdown();
    active = undefined;
    const replayProvider = new DeterministicCertifiedProvider();
    active = await launch(replayProvider);
    progress("server restarted against the retained stores");
    const replayClient = new PetraInteractionClient({
      endpoint: `${active.server.url}/api/interactions/run`,
      token,
      traceId: "trace_wave3_reconnect",
    });
    const replay = await replayClient.run({
      threadId: correlation.protocol_thread_id,
      runId: correlation.protocol_run_id,
      prompt: preview.content.action.execution.prompt,
      workflow: "grounded_synthesis",
      connectionId: interruptedConnectionId,
    });
    progress("terminal interaction replayed after restart");
    const replayTerminal = replay.events.find(
      (event) => event.type === "RUN_FINISHED",
    )?.payload.result?.terminalBinding;
    assert(
      replayProvider.accountReads === 0 &&
        replayProvider.turnRequests.length === 0 &&
        replayTerminal?.grounded_response_id ===
          completed.content.result.result_ref.record_id &&
        replayTerminal?.work_unit_id ===
          completed.content.invocation.content.expected_work_unit_id,
      "Reconnect did not replay the exact terminal result without restarting Work.",
    );
    const replayAttempt = await waitFor(
      "reconnected InteractionRun delivery",
      () =>
        active.grounded.interactions.getConnectionAttempt(
          interruptedConnectionId,
        ),
      (attempt) => attempt === 2,
    );
    const reread = await invocationRead(active.server.url, commandId);
    assert(
      canonicalize(reread.content.invocation) ===
        canonicalize(completed.content.invocation) &&
        reread.content.operation_state === "completed" &&
        canonicalize(reread.content.history.work_revisions) ===
          canonicalize(completed.content.history.work_revisions) &&
        canonicalize(reread.content.recovery.actions) ===
          canonicalize(completed.content.recovery.actions),
      "Invocation reread after restart lost exact receipt, History, or recovery state.",
    );

    const counts = await seedPool.query(
      `SELECT
         (SELECT count(*)::integer
            FROM petra.suggested_action_invocations
           WHERE command_id = $1) AS invocation_receipts,
         (SELECT count(*)::integer
            FROM petra.work_units
           WHERE work_unit_id = $2) AS work_units,
         (SELECT count(*)::integer
            FROM petra.work_unit_revisions
           WHERE work_unit_id = $2) AS work_revisions,
         (SELECT count(*)::integer
            FROM petra.interaction_replay_records
           WHERE connection_id = $3) AS delivery_attempts`,
      [
        commandId,
        completed.content.invocation.content.expected_work_unit_id,
        interruptedConnectionId,
      ],
    );
    assert(
      canonicalize(counts.rows[0]) ===
        canonicalize({
          invocation_receipts: 1,
          work_units: 1,
          work_revisions: 4,
          delivery_attempts: 2,
        }),
      "The cumulative proof created duplicate command, Work, or delivery authority.",
    );

    return {
      ok: true,
      preview: {
        schema: `${preview.schema_name}@${preview.schema_version}`,
        project_id: preview.project_id,
        action_ref: preview.content.action_ref,
        readiness: preview.content.readiness.state,
        capability_grant_id:
          preview.content.readiness.grant_ref.capability_grant_id,
      },
      invocation: {
        command_id: commandId,
        command_name:
          reread.content.invocation.content.command_ref.command_name,
        path_convergence: reread.content.invocation.content.path_convergence,
        invocation_ref: reread.content.invocation_ref,
        work_unit_id: reread.content.invocation.content.expected_work_unit_id,
        operation_state: reread.content.operation_state,
        result_ref: reread.content.result.result_ref,
      },
      interruption_and_reconnect: {
        aborted_delivery_attempt: interruptedAttempt,
        replay_delivery_attempt: replayAttempt,
        delivery_abort_cancelled_work: false,
        work_reexecuted_on_replay: false,
      },
      history: {
        revisions: reread.content.history.work_revisions.map((revision) => ({
          revision: revision.work_unit_ref.revision,
          state: revision.state,
        })),
        destinations: reread.content.history.destinations,
      },
      recovery: completedRecovery,
      durable_counts: counts.rows[0],
    };
  } finally {
    await active?.server.shutdown();
  }
};

let failure;
let seedPool;
try {
  await requireRun(
    "docker",
    composeArgs(
      "up",
      "--detach",
      "--wait",
      "postgres-source",
      "artifacts-source",
    ),
  );
  const migration = await requireRun(
    "docker",
    composeArgs("run", "--rm", "migrations", "migrate"),
  );
  process.stdout.write(`${migration.stdout}${migration.stderr}`);
  await requireRun(
    "docker",
    composeArgs("run", "--rm", "migrations", "validate"),
  );
  const postgresPort = await servicePort("postgres-source", "5432");
  const s3Port = await servicePort("artifacts-source", "8333");
  const environment = {
    PETRA_AUTH_TOKEN: token,
    PETRA_LOCAL_ACTOR_ID: humanActorId,
    PETRA_POSTGRES_HOST: "127.0.0.1",
    PETRA_POSTGRES_HOST_PORT: postgresPort,
    PETRA_POSTGRES_USER: "petra",
    PETRA_POSTGRES_PASSWORD: postgresPassword,
    PETRA_POSTGRES_DATABASE: "petra",
    PETRA_S3_ENDPOINT: `http://127.0.0.1:${s3Port}`,
    PETRA_S3_HOST_PORT: s3Port,
    PETRA_S3_ACCESS_KEY: "petra-recovery-access",
    PETRA_S3_SECRET_KEY: "petra-recovery-secret",
    PETRA_S3_BUCKET: "petra-wave3-cumulative",
  };
  seedPool = new Pool({
    connectionString: `postgresql://petra:${postgresPassword}@127.0.0.1:${postgresPort}/petra`,
    application_name: "petra-wave3-cumulative-proof",
  });
  const result = await actionProof(environment, seedPool);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  failure = error;
  const logs = await run("docker", composeArgs("logs", "--tail=120"));
  process.stderr.write(`${logs.stdout}\n${logs.stderr}`);
} finally {
  await seedPool?.end();
  const cleanup = await run(
    "docker",
    composeArgs("down", "--volumes", "--remove-orphans"),
  );
  if (cleanup.code !== 0 && failure === undefined) {
    failure = new Error(cleanup.stderr || cleanup.stdout);
  }
  const remaining = await resourceCount();
  if (remaining !== 0 && failure === undefined) {
    failure = new Error(
      `Disposable Wave 3 cleanup left ${remaining} labeled resources.`,
    );
  }
}

if (failure !== undefined) throw failure;
