import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { ProjectWorkClient } from "@petra/adapters";
import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAuthor,
  PetraCapabilityGrantV180,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkResumeRequest,
  PetraRightsDecision,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWork,
  PetraWorkUnit,
  PetraWorkVersion,
} from "@petra/contracts";
import type { ArtifactStore, PersistVerifiedArtifactInput } from "@petra/core";
import {
  PostgresArtifactAuthorityRepository,
  PostgresCapabilityGrantAuthorityRepository,
  PostgresCapabilityGrantCommandAuthorizer,
  PostgresProjectDefinitionAuthorityRepository,
  PostgresProjectWorkOperations,
  PostgresResearchScopeRepository,
  PostgresScholarlyIdentityRepository,
  PostgresSingleUserCommandPrincipalResolver,
  PostgresWorkUnitAuthorityRepository,
} from "@petra/postgres";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startPetraServer, type PetraServer } from "../src/server.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const evidenceOutput = process.env.PETRA_WAVE6_WORK_EVIDENCE_OUTPUT;
const describePostgres =
  connectionString === undefined || evidenceOutput === undefined
    ? describe.skip
    : describe;
const TOKEN = "wave6-work-production-command-token";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const serviceActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "service",
  display_name: "Petra worker control plane",
  created_at: "2026-08-28T18:00:01.000Z",
});

const availableArtifactStore: Pick<ArtifactStore, "inspectByHash"> = {
  inspectByHash: (contentHash, expected) => {
    if (expected === undefined) {
      throw new Error(
        "The evidence setup requires an exact artifact identity.",
      );
    }
    const hex = contentHash.slice("sha256:".length);
    return Promise.resolve({
      storeName: "petra-local",
      objectKey: `sha256/${hex.slice(0, 2)}/${hex.slice(2)}`,
      contentHash,
      byteSize: expected.byteSize,
      mediaType: expected.mediaType,
      availableAt: "2026-08-28T18:10:00.000Z",
      verification: {
        status: "verified",
        declaredMediaType: expected.mediaType,
        observedMediaType: expected.mediaType,
        method: "test-fixture",
        problems: [],
      },
    });
  },
};

describePostgres("Wave 6 Work production commands", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const capabilities = new PostgresCapabilityGrantAuthorityRepository(pool);
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const workOperations = new PostgresProjectWorkOperations(
    pool,
    new PostgresCapabilityGrantCommandAuthorizer(),
  );
  const human = readFixture<PetraActor>("actor");
  let server: PetraServer | undefined;
  const calls: Array<{ method: string; path: string; status: number }> = [];

  const registration = (): {
    workUnit: PetraWorkUnit;
    inputManifest: PetraWorkerInputManifest;
  } => {
    const workUnit = readFixture<PetraWorkUnit>("work-unit-requested");
    const inputManifest = readFixture<PetraWorkerInputManifest>(
      "worker-input-manifest",
    );
    workUnit.created_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    inputManifest.issued_by = structuredClone(workUnit.created_by);
    return { workUnit, inputManifest };
  };

  const operation = (
    name: PetraProjectWorkOperationRequest["operation"],
    work: PetraWorkUnit,
    identity: string,
    fields: Partial<PetraProjectWorkOperationRequest> = {},
  ): PetraProjectWorkOperationRequest => ({
    schema_name: "petra.project-work-operation-request",
    schema_version: "1.0.0",
    command_id: `command_01K6P0000000000000000008${identity}`,
    idempotency_key: `wave6:evidence:work:${name}:${identity}`,
    operation: name,
    expected_work_unit_ref: {
      work_unit_id: work.work_unit_id,
      revision: work.revision,
      spec_hash: work.spec_hash,
    },
    submitted_at: `2026-09-19T16:00:${identity}.000Z`,
    ...fields,
  });

  const launch = async (): Promise<void> => {
    server = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      commandPrincipalResolver: new PostgresSingleUserCommandPrincipalResolver(
        pool,
        { actor_id: human.actor_id, actor_kind: "human" },
      ),
      projectWorkOperations: workOperations,
      projectWorkOperationAuthority: workOperations,
      projectWorkResumeAuthority: workOperations,
    });
  };

  const client = (): ProjectWorkClient => {
    if (server === undefined) throw new Error("The production server is down.");
    return new ProjectWorkClient({
      baseUrl: server.url,
      token: TOKEN,
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        const url = new URL(
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url,
        );
        calls.push({
          method: init?.method ?? "GET",
          path: url.pathname,
          status: response.status,
        });
        return response;
      },
    });
  };

  beforeAll(async () => {
    await pool.query("SELECT 1");
    await pool.query("TRUNCATE petra.actors CASCADE");
    await scopes.registerActor(human);
    await scopes.registerActor(serviceActor());
    await scopes.registerProjectRevision(readFixture<PetraProject>("project"));
    await definitions.registerDefinitionRevision(
      readFixture<PetraProjectDefinition>("project-definition-scientific"),
    );
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    await identities.registerWorkVersionRevision(
      readFixture<PetraWorkVersion>("work-version"),
    );

    const artifact = readFixture<PetraArtifact>("artifact");
    const manifest = readFixture<PetraArtifactManifest>("artifact-manifest");
    const rightsDecision = readFixture<PetraRightsDecision>("rights-decision");
    artifact.created_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    manifest.recorded_by = structuredClone(artifact.created_by);
    rightsDecision.decision_maker = structuredClone(artifact.created_by);
    const acquisition: PersistVerifiedArtifactInput = {
      artifact,
      manifest,
      rightsDecision,
    };
    await artifacts.registerVerifiedAcquisition(acquisition);

    const grantContent: PetraCapabilityGrantV180["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["ManageProjectWork"],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason: "Allow the Project owner to manage exact durable Work.",
    };
    const grant: PetraCapabilityGrantV180 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.8.0",
      capability_grant_id: "capability_grant_01K6P000000000000000000800",
      revision: 1,
      project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      grantee: { actor_id: human.actor_id, actor_kind: "human" },
      content: grantContent,
      content_hash: canonicalHash(grantContent),
      issued_by: { actor_id: human.actor_id, actor_kind: "human" },
      issued_at: "2026-09-01T00:00:00.000Z",
    };
    await capabilities.registerCapabilityGrant(grant);
    await launch();
  });

  afterAll(async () => {
    await server?.shutdown();
    await pool.end();
  });

  it("executes start, input, steering, cancellation, retry assessment, recovery, and exact results without duplicate effects", async () => {
    const first = registration();
    await workUnits.register(first);
    const inputRequestId = "work_input_request_01K6P000000000000000000801";
    await workOperations.registerRequiredInput({
      inputRequestId,
      projectId: first.workUnit.project_id,
      workUnitId: first.workUnit.work_unit_id,
      expectedWorkUnitRevision: first.workUnit.revision,
      kind: "clarification",
      question: "Which bounded parsing mode should Petra use?",
      responseOptions: ["tables_and_text", "text_only"],
      consequence: "The chosen mode constrains the next worker execution.",
      registeredAt: "2026-09-19T16:00:00.000Z",
    });

    const pending = await client().readOperations(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
    );
    expect(pending.required_inputs).toEqual([
      expect.objectContaining({
        input_request_ref: {
          input_request_id: inputRequestId,
          revision: 1,
        },
        state: "pending",
        response_options: ["tables_and_text", "text_only"],
      }),
    ]);
    expect(
      pending.controls.find((control) => control.operation === "start")?.state,
    ).toBe("unavailable");

    const answerRequest = operation("answer_input", first.workUnit, "01", {
      input_request_ref: { input_request_id: inputRequestId, revision: 1 },
      response: "tables_and_text",
    });
    const answer = await client().execute(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
      answerRequest,
    );
    expect(answer.outcome).toBe("input_answered");

    const priorityRequest = operation("prioritize", first.workUnit, "02", {
      expected_plan_revision: 0,
      priority: "user_visible",
    });
    const priority = await client().execute(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
      priorityRequest,
    );
    expect(priority).toMatchObject({
      outcome: "prioritized",
      plan_revision: 1,
    });

    const steerRequest = operation("steer", first.workUnit, "03", {
      expected_plan_revision: 1,
      instruction: "Preserve table captions with their nearest table.",
      priority: "user_blocking",
    });
    const steer = await client().execute(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
      steerRequest,
    );
    expect(steer).toMatchObject({ outcome: "steered", plan_revision: 2 });

    const startRequest = operation("start", first.workUnit, "04");
    const start = await client().execute(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
      startRequest,
    );
    const startReplay = await client().execute(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
      startRequest,
    );
    expect(startReplay).toStrictEqual(start);
    const running = await workUnits.getWorkUnit(first.workUnit.work_unit_id);
    if (running === undefined) throw new Error("Expected running Work.");

    const cancelRequest = operation("cancel", running, "05", {
      reason: "The user stopped this exact parsing attempt.",
    });
    const cancel = await client().execute(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
      cancelRequest,
    );
    expect(cancel.outcome).toBe("cancelled");
    const cancelled = await client().readOperations(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
    );
    const resumeAssessment = cancelled.controls.find(
      (control) => control.operation === "resume",
    );
    const startAgainAssessment = cancelled.controls.find(
      (control) => control.operation === "start_again",
    );
    expect(resumeAssessment).toEqual(
      expect.objectContaining({ state: "unavailable" }),
    );
    expect(startAgainAssessment).toEqual(
      expect.objectContaining({ state: "unavailable" }),
    );
    expect(resumeAssessment).not.toHaveProperty("command_path");
    expect(startAgainAssessment).not.toHaveProperty("command_path");

    const second = registration();
    second.workUnit.work_unit_id = "work_unit_01K6P000000000000000000802";
    second.inputManifest.worker_input_manifest_id =
      "worker_input_manifest_01K6P000000000000000000802";
    second.inputManifest.work_unit_id = second.workUnit.work_unit_id;
    second.workUnit.spec.input_manifest_ref.worker_input_manifest_id =
      second.inputManifest.worker_input_manifest_id;
    second.workUnit.spec.idempotency_key = "wave6:evidence:retry-work";
    second.workUnit.spec.cache = {
      cache_mode: "reuse_exact",
      cache_key: "wave6:evidence:retry-work",
    };
    second.workUnit.spec_hash = canonicalHash(second.workUnit.spec);
    second.workUnit.trace_id = "trace_01K6P000000000000000000802";
    await workUnits.register(second);
    await workUnits.queue(
      second.workUnit.work_unit_id,
      1,
      "2026-09-19T16:01:01.000Z",
    );
    await workUnits.start(
      second.workUnit.work_unit_id,
      2,
      1,
      "2026-09-19T16:01:02.000Z",
    );
    const failed = await workUnits.failValidation(
      second.workUnit.work_unit_id,
      3,
      1,
      {
        code: "OUTPUT_CONTRACT_INVALID",
        message: "The first output did not satisfy its declared contract.",
        retryable: true,
      },
      "2026-09-19T16:01:03.000Z",
    );
    const failedView = await client().readOperations(
      second.workUnit.project_id,
      second.workUnit.work_unit_id,
    );
    expect(
      failedView.controls.find((control) => control.operation === "retry")
        ?.state,
    ).toBe("available");
    const retryRequest = operation("retry", failed, "06", {
      submitted_at: "2026-09-19T16:01:04.000Z",
    });
    const retry = await client().execute(
      second.workUnit.project_id,
      second.workUnit.work_unit_id,
      retryRequest,
    );
    expect(retry.outcome).toBe("retried");
    const retryRunning = await workUnits.getWorkUnit(
      second.workUnit.work_unit_id,
    );
    if (retryRunning?.status.state !== "running") {
      throw new Error("Expected the retry command to enter running Work.");
    }
    expect(retryRunning.status.attempt).toBe(2);

    const output = readFixture<PetraWorkerOutputManifest>(
      "worker-output-manifest",
    );
    output.worker_output_manifest_id =
      "worker_output_manifest_01K6P000000000000000000802";
    output.work_unit_id = second.workUnit.work_unit_id;
    output.attempt = 2;
    output.worker_input_manifest_id =
      second.inputManifest.worker_input_manifest_id;
    output.worker_input_manifest_hash = second.inputManifest.content_hash;
    output.content.started_at = retryRunning.status.started_at;
    output.content.completed_at = "2026-09-19T16:01:10.000Z";
    output.reported_at = output.content.completed_at;
    output.content_hash = canonicalHash(output.content);
    await workUnits.complete(output, retryRunning.revision);

    const third = registration();
    third.workUnit.work_unit_id = "work_unit_01K6P000000000000000000803";
    third.inputManifest.worker_input_manifest_id =
      "worker_input_manifest_01K6P000000000000000000803";
    third.inputManifest.work_unit_id = third.workUnit.work_unit_id;
    third.workUnit.spec.input_manifest_ref.worker_input_manifest_id =
      third.inputManifest.worker_input_manifest_id;
    third.workUnit.spec.idempotency_key = "wave6:evidence:resume-work";
    third.workUnit.spec.cache = {
      cache_mode: "reuse_exact",
      cache_key: "wave6:evidence:resume-work",
    };
    third.workUnit.spec.checkpoint_policy = "latest_valid";
    third.workUnit.spec_hash = canonicalHash(third.workUnit.spec);
    third.workUnit.trace_id = "trace_01K6P000000000000000000803";
    await workUnits.register(third);
    await workUnits.queue(
      third.workUnit.work_unit_id,
      1,
      "2026-09-19T16:02:01.000Z",
    );
    await workUnits.start(
      third.workUnit.work_unit_id,
      2,
      1,
      "2026-09-19T16:02:02.000Z",
    );
    const checkpoint = {
      artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1",
      content_hash:
        "sha256:76313fbb039e79b42da7b3ee67b26123f2b7e7157c80f019e688682337a0f09e",
      recorded_at: "2026-09-19T16:02:03.000Z",
    };
    const checkpointed = await workUnits.checkpoint(
      third.workUnit.work_unit_id,
      3,
      1,
      checkpoint,
      checkpoint.recorded_at,
    );
    const unregisteredResume = await client().readOperations(
      third.workUnit.project_id,
      third.workUnit.work_unit_id,
    );
    expect(
      unregisteredResume.controls.find(
        (control) => control.operation === "resume",
      ),
    ).toEqual(expect.objectContaining({ state: "unavailable" }));
    await expect(
      client().resume(third.workUnit.project_id, third.workUnit.work_unit_id, {
        schema_name: "petra.project-work-resume-request",
        schema_version: "1.0.0",
        command_id: "command_01K6P000000000000000000807",
        idempotency_key: "wave6:evidence:work:resume:unregistered",
        expected_work_unit_ref: {
          work_unit_id: checkpointed.work_unit_id,
          revision: checkpointed.revision,
          spec_hash: checkpointed.spec_hash,
        },
        expected_checkpoint: checkpoint,
        submitted_at: "2026-09-19T16:02:03.250Z",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_WORK_OPERATION_UNAVAILABLE",
      }),
    );
    await workOperations.registerCheckpointResume({
      resumeRegistrationId:
        "work_resume_registration_01K6P000000000000000000803",
      projectId: third.workUnit.project_id,
      workUnitRef: {
        work_unit_id: checkpointed.work_unit_id,
        revision: checkpointed.revision,
        spec_hash: checkpointed.spec_hash,
      },
      checkpoint,
      registeredBy: {
        actor_id: serviceActor().actor_id,
        actor_kind: "service",
      },
      registeredAt: "2026-09-19T16:02:03.500Z",
    });
    const registeredResume = await client().readOperations(
      third.workUnit.project_id,
      third.workUnit.work_unit_id,
    );
    expect(
      registeredResume.controls.find(
        (control) => control.operation === "resume",
      ),
    ).toEqual(
      expect.objectContaining({
        state: "available",
        command_path: `/api/commands/projects/${third.workUnit.project_id}/work/${third.workUnit.work_unit_id}/resume`,
      }),
    );
    const resumeRequest: PetraProjectWorkResumeRequest = {
      schema_name: "petra.project-work-resume-request",
      schema_version: "1.0.0",
      command_id: "command_01K6P000000000000000000808",
      idempotency_key: "wave6:evidence:work:resume:08",
      expected_work_unit_ref: {
        work_unit_id: checkpointed.work_unit_id,
        revision: checkpointed.revision,
        spec_hash: checkpointed.spec_hash,
      },
      expected_checkpoint: checkpoint,
      submitted_at: "2026-09-19T16:02:04.000Z",
    };
    const resume = await client().resume(
      third.workUnit.project_id,
      third.workUnit.work_unit_id,
      resumeRequest,
    );
    expect(resume).toMatchObject({
      outcome: "resumed",
      resumed_attempt: 1,
      checkpoint,
      resulting_work_unit_ref: {
        work_unit_id: third.workUnit.work_unit_id,
        revision: checkpointed.revision + 1,
        spec_hash: third.workUnit.spec_hash,
      },
      effect: {
        prior_attempts_preserved: true,
        checkpoint_preserved: true,
        domain_authority_changed: false,
      },
    });
    const resumedWork = await workUnits.getWorkUnit(
      third.workUnit.work_unit_id,
    );
    expect(resumedWork).toMatchObject({
      status: { state: "running", attempt: 1 },
    });

    await server?.shutdown();
    server = undefined;
    await launch();
    const cancelReplay = await client().execute(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
      cancelRequest,
    );
    const retryReplay = await client().execute(
      second.workUnit.project_id,
      second.workUnit.work_unit_id,
      retryRequest,
    );
    const resumeReplay = await client().resume(
      third.workUnit.project_id,
      third.workUnit.work_unit_id,
      resumeRequest,
    );
    expect(cancelReplay).toStrictEqual(cancel);
    expect(retryReplay).toStrictEqual(retry);
    expect(resumeReplay).toStrictEqual(resume);

    const completed = await client().readOperations(
      second.workUnit.project_id,
      second.workUnit.work_unit_id,
    );
    expect(completed.execution_state).toBe("completed");
    expect(completed.results).toHaveLength(1);
    expect(completed.results[0]).toMatchObject({
      result_kind: "worker_output_manifest",
      record_ref: {
        semantic_key: "petra.worker-output-manifest",
        record_id: output.worker_output_manifest_id,
        revision: 1,
      },
      destination: {
        state: "available",
        place_role: "work",
        target_ref: {
          semantic_key: "petra.worker-output-manifest",
          object_id: output.worker_output_manifest_id,
          revision: 1,
        },
      },
    });

    const durable = (
      await pool.query<{
        completed_receipts: number;
        input_responses: number;
        plan_revisions: number;
        cancelled_work_revisions: number;
        retried_work_revisions: number;
        resume_registrations: number;
        resume_receipts: number;
        resume_transitions: number;
        resumed_work_revisions: number;
      }>(
        `SELECT
           (SELECT count(*)::integer
              FROM petra.project_work_operation_receipts
             WHERE state = 'completed') AS completed_receipts,
           (SELECT count(*)::integer
              FROM petra.project_work_input_responses) AS input_responses,
           (SELECT count(*)::integer
              FROM petra.project_work_plan_revisions) AS plan_revisions,
           (SELECT count(*)::integer
              FROM petra.work_unit_revisions
             WHERE work_unit_id = $1) AS cancelled_work_revisions,
           (SELECT count(*)::integer
              FROM petra.work_unit_revisions
             WHERE work_unit_id = $2) AS retried_work_revisions,
           (SELECT count(*)::integer
              FROM petra.project_work_resume_registrations) AS resume_registrations,
           (SELECT count(*)::integer
              FROM petra.project_work_resume_receipts
             WHERE state = 'completed') AS resume_receipts,
           (SELECT count(*)::integer
              FROM petra.project_work_resume_transitions) AS resume_transitions,
           (SELECT count(*)::integer
              FROM petra.work_unit_revisions
             WHERE work_unit_id = $3) AS resumed_work_revisions`,
        [
          first.workUnit.work_unit_id,
          second.workUnit.work_unit_id,
          third.workUnit.work_unit_id,
        ],
      )
    ).rows[0];
    expect(durable).toEqual({
      completed_receipts: 6,
      input_responses: 1,
      plan_revisions: 2,
      cancelled_work_revisions: 4,
      retried_work_revisions: 7,
      resume_registrations: 1,
      resume_receipts: 1,
      resume_transitions: 1,
      resumed_work_revisions: 5,
    });

    const commandReceipts: PetraProjectWorkOperationReceipt[] = [
      answer,
      priority,
      steer,
      start,
      cancel,
      retry,
    ];
    const artifact = {
      evidence_id: "UX1.6-WORK",
      scenario_id: "start-input-steer-cancel-retry",
      status: "passed",
      executed_at: new Date().toISOString(),
      command: "npm run test:wave6:work",
      database: "fresh disposable PostgreSQL 18.6 with Flyway V001-V057",
      production_boundary: {
        server: "startPetraServer over an ephemeral TCP port",
        client: "ProjectWorkClient",
        query:
          "GET /api/queries/projects/:projectId/work/:workUnitId/operations",
        command: "POST /api/commands/projects/:projectId/work/:workUnitId",
        authority:
          "Bearer authentication plus server-resolved human ManageProjectWork grant",
      },
      observations: {
        required_input: {
          request_id: inputRequestId,
          start_blocked_until_answered: true,
          accepted_response: "tables_and_text",
          durable_response_count: durable?.input_responses,
        },
        commands: commandReceipts.map((receipt) => ({
          operation: receipt.operation,
          command_id: receipt.command_id,
          receipt_id: receipt.receipt_id,
          outcome: receipt.outcome,
          domain_authority_changed: receipt.effect.domain_authority_changed,
        })),
        plan: {
          durable_revisions: durable?.plan_revisions,
          selected_priority: "user_blocking",
          latest_instruction:
            "Preserve table captions with their nearest table.",
        },
        recovery: {
          server_restart_performed: true,
          exact_start_replay_matched: true,
          exact_cancel_replay_after_restart_matched: true,
          exact_retry_replay_after_restart_matched: true,
          exact_resume_replay_after_restart_matched: true,
          completed_receipts: durable?.completed_receipts,
          cancelled_work_revisions: durable?.cancelled_work_revisions,
          retried_work_revisions: durable?.retried_work_revisions,
          resumed_work_revisions: durable?.resumed_work_revisions,
          duplicate_effects: false,
        },
        restart_assessment: {
          resume: {
            unregistered: "unavailable",
            registered: "available",
            outcome: resume.outcome,
            checkpoint: resume.checkpoint,
            attempt_preserved: resume.resumed_attempt === 1,
            registration_count: durable?.resume_registrations,
            receipt_count: durable?.resume_receipts,
            transition_count: durable?.resume_transitions,
          },
          start_again: "unavailable",
          invented_command_path: false,
        },
        exact_result: {
          result_kind: completed.results[0]?.result_kind,
          record_id: completed.results[0]?.record_ref.record_id,
          destination: completed.results[0]?.destination,
        },
        http: {
          requests: calls.length,
          failed_requests: calls.filter((call) => call.status >= 400).length,
          invoked_paths: [...new Set(calls.map((call) => call.path))],
        },
      },
      boundary:
        "Executes authenticated production Work reads and commands against a fresh real PostgreSQL store, including one trusted exact-checkpoint compatibility registration, authenticated same-Work resume, immutable transition lineage, and restart-visible exact replay. Worker registration, checkpoint creation, failure injection, and output completion are trusted worker-side setup; no React/browser usability claim is made, and start-again remains explicitly unavailable because no workflow-specific fresh-input transition is registered.",
    };
    if (evidenceOutput === undefined) {
      throw new Error("The Work evidence output path is not configured.");
    }
    mkdirSync(dirname(evidenceOutput), { recursive: true });
    writeFileSync(evidenceOutput, `${JSON.stringify(artifact, null, 2)}\n`);
  });
});
