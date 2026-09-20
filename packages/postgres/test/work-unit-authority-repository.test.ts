import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAuthor,
  PetraCapabilityGrantV180,
  PetraProjectWorkOperationRequest,
  PetraProject,
  PetraProjectDefinition,
  PetraRightsDecision,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWork,
  PetraWorkUnit,
  PetraWorkVersion,
  WorkUnitCancellationCommand,
} from "@petra/contracts";
import type { PersistVerifiedArtifactInput } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import {
  PostgresCapabilityGrantAuthorityRepository,
  PostgresCapabilityGrantCommandAuthorizer,
} from "../src/capability-grant-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresProjectObjectLocationViewReader } from "../src/project-object-location-view-reader.js";
import { PostgresProjectWorkOperations } from "../src/project-work-operations.js";
import { PostgresProjectWorkViewReader } from "../src/project-work-view-reader.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "../src/work-unit-authority-repository.js";
import { availableArtifactStore } from "./artifact-store-fixture.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const describePostgres =
  connectionString === undefined ? describe.skip : describe;

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
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

describePostgres("PostgreSQL bounded WorkUnit authority", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const objectLocations = new PostgresProjectObjectLocationViewReader(pool);
  const workViews = new PostgresProjectWorkViewReader(pool);
  const capabilities = new PostgresCapabilityGrantAuthorityRepository(pool);
  const workOperations = new PostgresProjectWorkOperations(
    pool,
    new PostgresCapabilityGrantCommandAuthorizer(),
  );

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    await scopes.registerActor(readFixture<PetraActor>("actor"));
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
    const input: PersistVerifiedArtifactInput = {
      artifact,
      manifest,
      rightsDecision,
    };
    await artifacts.registerVerifiedAcquisition(input);
  });

  afterAll(async () => {
    await pool.end();
  });

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

  const successfulOutput = (): PetraWorkerOutputManifest =>
    readFixture<PetraWorkerOutputManifest>("worker-output-manifest");

  const registerParsingStagePlan = (
    workUnit: PetraWorkUnit,
    stagePlanId = "work_stage_plan_01K6P000000000000000000700",
  ) =>
    workOperations.registerStagePlan({
      stagePlanId,
      projectId: workUnit.project_id,
      workUnitId: workUnit.work_unit_id,
      expectedWorkUnitSpecHash: workUnit.spec_hash,
      stages: [
        {
          stageId: "choose-parsing-mode",
          label: "Choose parsing mode",
          purpose: "Resolve the bounded parsing mode before execution.",
          boundary: "required_input",
          prerequisiteStageIds: [],
          accountableRole: "Project author",
          input: "The exact registered PDF and parsing choice.",
          output: "One registered parsing mode.",
        },
        {
          stageId: "parse-registered-pdf",
          label: "Parse the registered PDF",
          purpose: "Run the registered worker against the exact PDF.",
          boundary: "execution",
          prerequisiteStageIds: ["choose-parsing-mode"],
          accountableRole: "Scientific document processor",
          input: "The exact PDF and selected parsing mode.",
          output: "A staged ParsedDocument candidate.",
        },
        {
          stageId: "validate-parsed-coverage",
          label: "Validate parsed coverage",
          purpose: "Check the output contract and processing limitations.",
          boundary: "completion",
          prerequisiteStageIds: ["parse-registered-pdf"],
          accountableRole: "Coverage validator",
          input: "The staged ParsedDocument candidate.",
          output: "An explicit coverage result.",
        },
      ],
      registeredAt: "2026-09-19T12:00:00.500Z",
    });

  const cancellationCommand = (
    workUnit: PetraWorkUnit,
  ): WorkUnitCancellationCommand => ({
    command_name: "CancelWorkUnit",
    command_id: "command_01ARZ3NDEKTSV4RRFFQ69G5FE9",
    idempotency_key: "cancel:run-work-unit-repository-test",
    expected_work_unit_ref: {
      work_unit_id: workUnit.work_unit_id,
      revision: workUnit.revision,
      spec_hash: workUnit.spec_hash,
    },
    interaction: {
      protocol_thread_id: "thread-work-unit-repository-test",
      protocol_run_id: "run-work-unit-repository-test",
    },
    reason: "The researcher explicitly stopped this running task.",
    requested_by: {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    },
    capability_grant_id: workUnit.capability_grant_id,
    trace_id: "trace_01ARZ3NDEKTSV4RRFFQ69G5FBK",
    requested_at: "2026-08-29T14:00:06.000Z",
  });

  it("persists exact registration, lifecycle history, and a bounded successful output", async () => {
    const input = registration();
    expect(await workUnits.register(input)).toEqual(input.workUnit);
    await registerParsingStagePlan(input.workUnit);
    await expect(
      registerParsingStagePlan(input.workUnit),
    ).resolves.toBeUndefined();

    const queued = await workUnits.queue(
      input.workUnit.work_unit_id,
      1,
      "2026-08-29T14:00:01.000Z",
    );
    const running = await workUnits.start(
      input.workUnit.work_unit_id,
      queued.revision,
      1,
      "2026-08-29T14:00:02.000Z",
    );
    const completed = await workUnits.complete(
      successfulOutput(),
      running.revision,
    );
    expect(completed.status).toEqual(
      expect.objectContaining({
        state: "completed",
        terminal_outcome: "succeeded",
        attempt: 1,
      }),
    );
    expect(await workUnits.register(input)).toEqual(completed);
    expect(await workUnits.complete(successfulOutput(), 3)).toEqual(completed);
    const currentLocation = await objectLocations.locateProjectObject({
      project_id: completed.project_id,
      object_ref: {
        semantic_key: "petra.work-unit",
        object_id: completed.work_unit_id,
      },
      task_intent: "continue_work",
    });
    expect(currentLocation?.content.resolution.state).toBe("current");
    expect(currentLocation?.content.primary_destination.role).toBe("work");
    const historicalLocation = await objectLocations.locateProjectObject({
      project_id: completed.project_id,
      object_ref: {
        semantic_key: "petra.work-unit",
        object_id: completed.work_unit_id,
        revision: 1,
      },
      task_intent: "inspect",
    });
    expect(historicalLocation?.content.resolution.state).toBe("historical");
    expect(historicalLocation?.content.primary_destination.role).toBe(
      "history",
    );
    expect(
      (await workUnits.getWorkUnitRevision(input.workUnit.work_unit_id, 1))
        ?.status.state,
    ).toBe("requested");
    expect(
      (await workUnits.getWorkUnitRevision(input.workUnit.work_unit_id, 2))
        ?.status.state,
    ).toBe("queued");
    expect(
      (await workUnits.getWorkUnitRevision(input.workUnit.work_unit_id, 3))
        ?.status.state,
    ).toBe("running");
    expect(
      await workUnits.getInputManifest(
        input.inputManifest.worker_input_manifest_id,
      ),
    ).toEqual(input.inputManifest);
    expect(
      await workUnits.getOutputManifest(
        successfulOutput().worker_output_manifest_id,
      ),
    ).toEqual(successfulOutput());

    const collection = await workViews.listProjectWorkView(
      completed.project_id,
    );
    expect(collection?.content.view_kind).toBe("collection");
    if (collection?.content.view_kind !== "collection") {
      throw new Error("Expected the authorized Project Work collection.");
    }
    expect(collection.content.tasks).toHaveLength(1);
    const collectionTask = collection.content.tasks[0];
    if (collectionTask === undefined) {
      throw new Error("Expected the completed Work task.");
    }
    expect(collectionTask.work_unit_ref.work_unit_id).toBe(
      completed.work_unit_id,
    );
    expect(collectionTask.work_unit_ref.revision).toBe(completed.revision);
    expect(collectionTask.execution.state).toBe("completed");
    expect(collectionTask.execution.terminal_outcome).toBe("succeeded");
    expect(collectionTask.resource_coverage).toBe("measured");
    expect(collectionTask.reported_output_count).toBe(1);
    expect(collection.content.page).toEqual({
      returned_count: 1,
      total_count: 1,
      has_more: false,
    });

    const detail = await workViews.getProjectWorkView(
      completed.project_id,
      completed.work_unit_id,
    );
    expect(detail?.content.view_kind).toBe("detail");
    if (detail?.content.view_kind !== "detail") {
      throw new Error("Expected the authorized exact Project Work detail.");
    }
    expect(detail.content.specification.input_manifest_ref.record_id).toBe(
      input.inputManifest.worker_input_manifest_id,
    );
    expect(detail.content.resources.usage.state).toBe("measured");
    expect(detail.content.outputs[0]?.availability.state).toBe(
      "staged_handle_only",
    );
    expect(detail.content.stage_plan).toMatchObject({
      state: "available",
      state_basis: "registered_plan_and_work_lifecycle",
      stages: [
        { stage_id: "choose-parsing-mode", state: "completed" },
        { stage_id: "parse-registered-pdf", state: "completed" },
        { stage_id: "validate-parsed-coverage", state: "completed" },
      ],
    });
    expect(collectionTask.stage_plan).toMatchObject({
      state: "available",
      stage_count: 3,
      completed_stage_count: 3,
    });
    expect(
      detail.content.controls.every(
        (control) => control.operation_state === "unavailable",
      ),
    ).toBe(true);
    expect(detail.content.semantic_location.resolution.state).toBe("current");
    expect(detail.content.semantic_location.primary_destination.role).toBe(
      "work",
    );

    const typed = await pool.query<{
      binding_kind: string;
      artifact_id: string;
      state: string;
      terminal_outcome: string;
    }>(
      `SELECT binding.binding_kind, binding.artifact_id,
              revision.state, revision.terminal_outcome
         FROM petra.work_units AS head
         JOIN petra.work_unit_revisions AS revision
           ON revision.work_unit_id = head.work_unit_id
          AND revision.revision = head.current_revision
         JOIN petra.worker_input_bindings AS binding
           ON binding.worker_input_manifest_id = head.input_manifest_id
        WHERE head.work_unit_id = $1`,
      [input.workUnit.work_unit_id],
    );
    expect(typed.rows[0]).toEqual({
      binding_kind: "artifact",
      artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1",
      state: "completed",
      terminal_outcome: "succeeded",
    });
  });

  it("reports requested Work honestly with bounded filtering and unavailable runtime evidence", async () => {
    const input = registration();
    await workUnits.register(input);

    const collection = await workViews.listProjectWorkView(
      input.workUnit.project_id,
      { limit: 1, state: "requested" },
    );
    expect(collection?.content.view_kind).toBe("collection");
    if (collection?.content.view_kind !== "collection") {
      throw new Error("Expected a filtered Project Work collection.");
    }
    expect(collection.content.query).toEqual({
      limit: 1,
      state: "requested",
    });
    expect(collection.content.tasks[0]?.attention.state).toBe(
      "needs_attention",
    );
    expect(collection.content.tasks[0]?.elapsed.state).toBe("unavailable");
    expect(collection.content.tasks[0]?.resource_coverage).toBe("limits_only");

    const detail = await workViews.getProjectWorkView(
      input.workUnit.project_id,
      input.workUnit.work_unit_id,
    );
    if (detail?.content.view_kind !== "detail") {
      throw new Error("Expected requested Work detail.");
    }
    expect(detail.content.resources.usage.state).toBe("unavailable");
    expect(
      detail.content.outputs.every(
        (output) => output.report_state === "not_reported",
      ),
    ).toBe(true);
    expect(detail.content.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          control_name: "cancel",
          policy_state: "permitted",
          operation_state: "unavailable",
        }),
      ]),
    );
    expect(detail.content.inquiry_linkage.state).toBe("unavailable");
    expect(detail.content.review.state).toBe("unavailable");

    expect(
      await workViews.getProjectWorkView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        input.workUnit.work_unit_id,
      ),
    ).toBeUndefined();
  });

  it("preserves retryable validation failure and reuses the exact input for attempt two", async () => {
    const input = registration();
    await workUnits.register(input);
    await workUnits.queue(
      input.workUnit.work_unit_id,
      1,
      "2026-08-29T14:00:01.000Z",
    );
    await workUnits.start(
      input.workUnit.work_unit_id,
      2,
      1,
      "2026-08-29T14:00:02.000Z",
    );
    const failed = await workUnits.failValidation(
      input.workUnit.work_unit_id,
      3,
      1,
      {
        code: "OUTPUT_CONTRACT_INVALID",
        message: "The staged output did not satisfy its declared contract.",
        retryable: true,
      },
      "2026-08-29T14:00:05.000Z",
    );
    expect(failed.status).toEqual(
      expect.objectContaining({ terminal_outcome: "validation_failed" }),
    );
    const retryQueued = await workUnits.queue(
      input.workUnit.work_unit_id,
      failed.revision,
      "2026-08-29T14:00:06.000Z",
    );
    const retryRunning = await workUnits.start(
      input.workUnit.work_unit_id,
      retryQueued.revision,
      2,
      "2026-08-29T14:00:07.000Z",
    );
    const output = successfulOutput();
    output.worker_output_manifest_id =
      "worker_output_manifest_01ARZ3NDEKTSV4RRFFQ69G5FD1";
    output.attempt = 2;
    output.content.started_at = "2026-08-29T14:00:07.000Z";
    output.content.completed_at = "2026-08-29T14:00:10.000Z";
    output.reported_at = "2026-08-29T14:00:10.000Z";
    output.content_hash = canonicalHash(output.content);
    const completed = await workUnits.complete(output, retryRunning.revision);
    expect(completed.status).toEqual(
      expect.objectContaining({ terminal_outcome: "succeeded", attempt: 2 }),
    );
    expect(
      (
        await workUnits.getInputManifest(
          input.inputManifest.worker_input_manifest_id,
        )
      )?.content_hash,
    ).toBe(input.inputManifest.content_hash);
  });

  it("rejects invalid worker output atomically and permits explicit cancellation", async () => {
    const input = registration();
    await workUnits.register(input);
    await workUnits.queue(
      input.workUnit.work_unit_id,
      1,
      "2026-08-29T14:00:01.000Z",
    );
    await workUnits.start(
      input.workUnit.work_unit_id,
      2,
      1,
      "2026-08-29T14:00:02.000Z",
    );
    const invalid = successfulOutput();
    invalid.content.resource_usage.output_bytes = 60_000_000;
    invalid.content_hash = canonicalHash(invalid.content);
    await expect(workUnits.complete(invalid, 3)).rejects.toEqual(
      expect.objectContaining({ code: "TOTAL_OUTPUT_LIMIT_EXCEEDED" }),
    );
    expect(
      await workUnits.getOutputManifest(invalid.worker_output_manifest_id),
    ).toBe(undefined);
    expect(
      (await workUnits.getWorkUnit(input.workUnit.work_unit_id))?.revision,
    ).toBe(3);
    const cancelled = await workUnits.cancel(
      input.workUnit.work_unit_id,
      3,
      "The researcher stopped the parse.",
      "2026-08-29T14:00:06.000Z",
    );
    expect(cancelled.status.state).toBe("cancelled");
  });

  it("atomically records an authorized cancellation and replays duplicate delivery", async () => {
    const input = registration();
    await workUnits.register(input);
    await workUnits.queue(
      input.workUnit.work_unit_id,
      1,
      "2026-08-29T14:00:01.000Z",
    );
    const running = await workUnits.start(
      input.workUnit.work_unit_id,
      2,
      1,
      "2026-08-29T14:00:02.000Z",
    );
    const command = cancellationCommand(running);

    const applied = await workUnits.cancelByCommand(command);
    expect(applied.applied).toBe(true);
    expect(applied.workUnit.revision).toBe(4);
    expect(applied.workUnit.status.state).toBe("cancelled");
    if (applied.workUnit.status.state !== "cancelled") {
      throw new Error("The WorkUnit did not enter its cancelled state.");
    }
    expect(applied.workUnit.status.reason).toBe(command.reason);
    expect(applied.workUnit.status.cancelled_at).toBe(command.requested_at);
    expect(applied.cancellation.content.authority_boundary).toEqual({
      effect_kind: "operational_only",
      scientific_authority_changed: false,
      connection_abort_was_command: false,
    });
    expect(
      await workUnits.getCancellationByCommand(command.command_id),
    ).toEqual(applied.cancellation);

    const replayed = await workUnits.cancelByCommand(command);
    expect(replayed).toEqual({ ...applied, applied: false });
    expect(
      (await workUnits.getWorkUnit(input.workUnit.work_unit_id))?.revision,
    ).toBe(4);

    const conflicting = structuredClone(command);
    conflicting.reason = "Different input under an existing command identity.";
    await expect(workUnits.cancelByCommand(conflicting)).rejects.toEqual(
      expect.objectContaining({
        code: "WORK_UNIT_CANCELLATION_COMMAND_CONFLICT",
      }),
    );
    await expect(
      pool.query("DELETE FROM petra.work_unit_cancellations"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
  });

  it("rejects cancellation without the WorkUnit capability", async () => {
    const input = registration();
    await workUnits.register(input);
    await workUnits.queue(
      input.workUnit.work_unit_id,
      1,
      "2026-08-29T14:00:01.000Z",
    );
    const running = await workUnits.start(
      input.workUnit.work_unit_id,
      2,
      1,
      "2026-08-29T14:00:02.000Z",
    );
    const unauthorized = cancellationCommand(running);
    unauthorized.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FE8";
    unauthorized.idempotency_key = "cancel:unauthorized";
    unauthorized.capability_grant_id =
      "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBL";

    await expect(workUnits.cancelByCommand(unauthorized)).rejects.toEqual(
      expect.objectContaining({
        code: "WORK_UNIT_CANCELLATION_NOT_AUTHORIZED",
      }),
    );
    expect(
      (await workUnits.getWorkUnit(input.workUnit.work_unit_id))?.revision,
    ).toBe(3);
    expect(
      await workUnits.getCancellationByCommand(unauthorized.command_id),
    ).toBe(undefined);
  });

  it("enforces successful dependencies before queueing dependent work", async () => {
    const dependency = registration();
    await workUnits.register(dependency);

    const dependent = registration();
    dependent.workUnit.work_unit_id = "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FD2";
    dependent.inputManifest.worker_input_manifest_id =
      "worker_input_manifest_01ARZ3NDEKTSV4RRFFQ69G5FD3";
    dependent.inputManifest.work_unit_id = dependent.workUnit.work_unit_id;
    dependent.workUnit.spec.input_manifest_ref.worker_input_manifest_id =
      dependent.inputManifest.worker_input_manifest_id;
    dependent.workUnit.spec.dependency_work_unit_ids = [
      dependency.workUnit.work_unit_id,
    ];
    dependent.workUnit.spec.idempotency_key = "parse:artifact-fb1:dependent";
    dependent.workUnit.spec.cache = {
      cache_mode: "reuse_exact",
      cache_key: "parse:artifact-fb1:dependent",
    };
    dependent.workUnit.spec_hash = canonicalHash(dependent.workUnit.spec);
    await workUnits.register(dependent);
    await expect(
      workUnits.queue(
        dependent.workUnit.work_unit_id,
        1,
        "2026-08-29T14:00:01.000Z",
      ),
    ).rejects.toEqual(
      expect.objectContaining({ code: "WORK_UNIT_DEPENDENCY_NOT_READY" }),
    );

    await workUnits.queue(
      dependency.workUnit.work_unit_id,
      1,
      "2026-08-29T14:00:01.000Z",
    );
    await workUnits.start(
      dependency.workUnit.work_unit_id,
      2,
      1,
      "2026-08-29T14:00:02.000Z",
    );
    await workUnits.complete(successfulOutput(), 3);
    await expect(
      workUnits.queue(
        dependent.workUnit.work_unit_id,
        1,
        "2026-08-29T14:00:06.000Z",
      ),
    ).resolves.toEqual(expect.objectContaining({ revision: 2 }));
  });

  it("composes authorized input, planning, lifecycle recovery, and exact result destinations", async () => {
    const actor = readFixture<PetraActor>("actor");
    const grantContent: PetraCapabilityGrantV180["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["ManageProjectWork"],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason: "Allow the Project owner to manage exact durable Work.",
    };
    const grant: PetraCapabilityGrantV180 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.8.0",
      capability_grant_id: "capability_grant_01K6P000000000000000000700",
      revision: 1,
      project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      grantee: { actor_id: actor.actor_id, actor_kind: "human" },
      content: grantContent,
      content_hash: canonicalHash(grantContent),
      issued_by: { actor_id: actor.actor_id, actor_kind: "human" },
      issued_at: "2026-09-01T00:00:00.000Z",
    };
    await capabilities.registerCapabilityGrant(grant);
    const principal = {
      actor: { actor_id: actor.actor_id, actor_kind: "human" as const },
      capabilityGrantId: grant.capability_grant_id,
    };
    const operation = (
      name: PetraProjectWorkOperationRequest["operation"],
      work: PetraWorkUnit,
      identity: string,
      fields: Partial<PetraProjectWorkOperationRequest> = {},
    ): PetraProjectWorkOperationRequest => ({
      schema_name: "petra.project-work-operation-request",
      schema_version: "1.0.0",
      command_id: `command_01K6P0000000000000000007${identity}`,
      idempotency_key: `wave6:work:${name}:${identity}`,
      operation: name,
      expected_work_unit_ref: {
        work_unit_id: work.work_unit_id,
        revision: work.revision,
        spec_hash: work.spec_hash,
      },
      submitted_at: `2026-09-19T12:00:${identity}.000Z`,
      ...fields,
    });

    const first = registration();
    await workUnits.register(first);
    await workOperations.registerRequiredInput({
      inputRequestId: "work_input_request_01K6P000000000000000000701",
      projectId: first.workUnit.project_id,
      workUnitId: first.workUnit.work_unit_id,
      expectedWorkUnitRevision: first.workUnit.revision,
      kind: "clarification",
      question: "Which bounded parsing mode should Petra use?",
      responseOptions: ["tables_and_text", "text_only"],
      consequence: "The chosen mode constrains the next worker execution.",
      registeredAt: "2026-09-19T12:00:00.000Z",
    });
    await registerParsingStagePlan(
      first.workUnit,
      "work_stage_plan_01K6P000000000000000000701",
    );
    const pendingStages = await workViews.getProjectWorkView(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
    );
    expect(
      pendingStages?.content.view_kind === "detail"
        ? pendingStages.content.stage_plan
        : undefined,
    ).toMatchObject({
      state: "available",
      current_stage_id: "choose-parsing-mode",
      stages: [
        { state: "awaiting_input" },
        { state: "not_started" },
        { state: "not_started" },
      ],
    });
    const pending = await workOperations.getProjectWorkOperationsView(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
    );
    expect(pending?.required_inputs[0]?.state).toBe("pending");
    expect(
      pending?.controls.find((control) => control.operation === "start")?.state,
    ).toBe("unavailable");

    await expect(
      workOperations.executeProjectWorkOperation(
        first.workUnit.project_id,
        operation("answer_input", first.workUnit, "01", {
          input_request_ref: {
            input_request_id: "work_input_request_01K6P000000000000000000701",
            revision: 1,
          },
          response: "unregistered_mode",
        }),
        principal,
      ),
    ).rejects.toEqual(
      expect.objectContaining({ code: "PROJECT_WORK_OPERATION_STALE" }),
    );
    const answered = operation("answer_input", first.workUnit, "02", {
      input_request_ref: {
        input_request_id: "work_input_request_01K6P000000000000000000701",
        revision: 1,
      },
      response: "tables_and_text",
    });
    await expect(
      workOperations.executeProjectWorkOperation(
        first.workUnit.project_id,
        answered,
        principal,
      ),
    ).resolves.toEqual(expect.objectContaining({ outcome: "input_answered" }));
    const answeredStages = await workViews.getProjectWorkView(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
    );
    expect(
      answeredStages?.content.view_kind === "detail"
        ? answeredStages.content.stage_plan
        : undefined,
    ).toMatchObject({
      state: "available",
      current_stage_id: "parse-registered-pdf",
      stages: [
        { state: "completed" },
        { state: "ready" },
        { state: "not_started" },
      ],
    });
    const prioritized = operation("prioritize", first.workUnit, "03", {
      expected_plan_revision: 0,
      priority: "user_visible",
    });
    await workOperations.executeProjectWorkOperation(
      first.workUnit.project_id,
      prioritized,
      principal,
    );
    const steered = operation("steer", first.workUnit, "04", {
      expected_plan_revision: 1,
      instruction: "Preserve table captions with their nearest table.",
      priority: "user_blocking",
    });
    await workOperations.executeProjectWorkOperation(
      first.workUnit.project_id,
      steered,
      principal,
    );
    const planned = await workOperations.getProjectWorkOperationsView(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
    );
    expect(planned?.plan).toMatchObject({
      revision: 2,
      selected_priority: "user_blocking",
      latest_instruction: "Preserve table captions with their nearest table.",
    });

    const start = operation("start", first.workUnit, "05");
    const started = await workOperations.executeProjectWorkOperation(
      first.workUnit.project_id,
      start,
      principal,
    );
    expect(started).toMatchObject({ outcome: "started" });
    const runningStages = await workViews.getProjectWorkView(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
    );
    expect(
      runningStages?.content.view_kind === "detail"
        ? runningStages.content.stage_plan
        : undefined,
    ).toMatchObject({
      state: "available",
      current_stage_id: "parse-registered-pdf",
      stages: [
        { state: "completed" },
        { state: "running" },
        { state: "not_started" },
      ],
    });
    await expect(
      workOperations.executeProjectWorkOperation(
        first.workUnit.project_id,
        start,
        principal,
      ),
    ).resolves.toStrictEqual(started);
    const running = await workUnits.getWorkUnit(first.workUnit.work_unit_id);
    if (running === undefined) throw new Error("Expected running Work.");
    const cancel = operation("cancel", running, "06", {
      reason: "The user stopped this exact parsing attempt.",
    });
    await expect(
      workOperations.executeProjectWorkOperation(
        first.workUnit.project_id,
        cancel,
        principal,
      ),
    ).resolves.toEqual(expect.objectContaining({ outcome: "cancelled" }));
    const cancelled = await workOperations.getProjectWorkOperationsView(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
    );
    expect(
      cancelled?.controls.find((control) => control.operation === "resume")
        ?.state,
    ).toBe("unavailable");
    expect(
      cancelled?.controls.find((control) => control.operation === "start_again")
        ?.state,
    ).toBe("unavailable");
    const cancelledStages = await workViews.getProjectWorkView(
      first.workUnit.project_id,
      first.workUnit.work_unit_id,
    );
    expect(
      cancelledStages?.content.view_kind === "detail"
        ? cancelledStages.content.stage_plan
        : undefined,
    ).toMatchObject({
      state: "available",
      stages: [
        { state: "completed" },
        { state: "skipped" },
        { state: "skipped" },
      ],
    });

    const second = registration();
    second.workUnit.work_unit_id = "work_unit_01K6P000000000000000000702";
    second.inputManifest.worker_input_manifest_id =
      "worker_input_manifest_01K6P000000000000000000702";
    second.inputManifest.work_unit_id = second.workUnit.work_unit_id;
    second.workUnit.spec.input_manifest_ref.worker_input_manifest_id =
      second.inputManifest.worker_input_manifest_id;
    second.workUnit.spec.idempotency_key = "parse:artifact-fb1:wave6-retry";
    second.workUnit.spec.cache = {
      cache_mode: "reuse_exact",
      cache_key: "parse:artifact-fb1:wave6-retry",
    };
    second.workUnit.spec_hash = canonicalHash(second.workUnit.spec);
    second.workUnit.trace_id = "trace_01K6P000000000000000000702";
    await workUnits.register(second);
    await workUnits.queue(
      second.workUnit.work_unit_id,
      1,
      "2026-09-19T12:01:01.000Z",
    );
    await workUnits.start(
      second.workUnit.work_unit_id,
      2,
      1,
      "2026-09-19T12:01:02.000Z",
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
      "2026-09-19T12:01:03.000Z",
    );
    const failedView = await workOperations.getProjectWorkOperationsView(
      second.workUnit.project_id,
      second.workUnit.work_unit_id,
    );
    expect(
      failedView?.controls.find((control) => control.operation === "retry")
        ?.state,
    ).toBe("available");
    const retry = operation("retry", failed, "07", {
      submitted_at: "2026-09-19T12:01:04.000Z",
    });
    const retried = await workOperations.executeProjectWorkOperation(
      second.workUnit.project_id,
      retry,
      principal,
    );
    await expect(
      workOperations.executeProjectWorkOperation(
        second.workUnit.project_id,
        retry,
        principal,
      ),
    ).resolves.toStrictEqual(retried);
    const retryRunning = await workUnits.getWorkUnit(
      second.workUnit.work_unit_id,
    );
    if (retryRunning === undefined) throw new Error("Expected retrying Work.");
    expect(retryRunning.status).toMatchObject({ state: "running", attempt: 2 });
    if (retryRunning.status.state !== "running") {
      throw new Error("Expected the retry command to enter running Work.");
    }

    const output = successfulOutput();
    output.worker_output_manifest_id =
      "worker_output_manifest_01K6P000000000000000000702";
    output.work_unit_id = second.workUnit.work_unit_id;
    output.attempt = 2;
    output.worker_input_manifest_id =
      second.inputManifest.worker_input_manifest_id;
    output.content.started_at = retryRunning.status.started_at;
    output.content.completed_at = "2026-09-19T12:01:10.000Z";
    output.reported_at = output.content.completed_at;
    output.content_hash = canonicalHash(output.content);
    await workUnits.complete(output, retryRunning.revision);
    const completed = await workOperations.getProjectWorkOperationsView(
      second.workUnit.project_id,
      second.workUnit.work_unit_id,
    );
    expect(completed?.delivery.state).toBe("unavailable");
    expect(completed?.results).toHaveLength(1);
    const result = completed?.results[0];
    expect(result?.result_kind).toBe("worker_output_manifest");
    expect(result?.record_ref.record_id).toBe(output.worker_output_manifest_id);
    expect(result?.destination).toStrictEqual({
      state: "available",
      place_role: "work",
      target_ref: {
        semantic_key: "petra.worker-output-manifest",
        object_id: output.worker_output_manifest_id,
        revision: 1,
      },
    });
    await expect(
      pool.query(
        "DELETE FROM petra.project_work_operation_receipts WHERE command_id = $1",
        [answered.command_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
  });

  it("rejects idempotency rebound and direct mutation", async () => {
    const input = registration();
    await workUnits.register(input);
    const rebound = registration();
    rebound.workUnit.spec.objective = "Different work under the same key.";
    rebound.workUnit.spec_hash = canonicalHash(rebound.workUnit.spec);
    await expect(workUnits.register(rebound)).rejects.toEqual(
      expect.objectContaining({ code: "WORK_UNIT_IDEMPOTENCY_REUSED" }),
    );
    await expect(
      pool.query("DELETE FROM petra.worker_input_manifests"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query("UPDATE petra.work_unit_revisions SET state = 'completed'"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
  });
});
