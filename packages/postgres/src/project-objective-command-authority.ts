import { createHash } from "node:crypto";

import type {
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectObjectiveCommandReceipt,
  PetraProjectObjectiveCommandRecoveryView,
  PetraProjectObjectiveCommandRequest,
  ProjectObjectiveRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  derivePetraId,
  ProjectObjectiveCommandError,
  type ProjectObjectiveCommandAuthority,
  type ProjectObjectiveCommandPrincipal,
  type ProjectObjectiveCommandResult,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

interface StoredRecordRow {
  readonly payload: unknown;
  readonly record_hash: string;
}

interface StoredFocusRow extends StoredRecordRow {
  readonly objective_id: string;
  readonly revision: string;
  readonly content_hash: string;
}

interface StoredReceiptRow {
  readonly command_id: string;
  readonly idempotency_key: string;
  readonly request_hash: string;
  readonly project_id: string;
  readonly actor_id: string;
  readonly actor_kind: "human";
  readonly receipt_payload: unknown;
  readonly receipt_record_hash: string;
  readonly objective_payload: unknown;
  readonly objective_record_hash: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const sameActor = (
  left: { readonly actor_id: string; readonly actor_kind: string },
  right: { readonly actor_id: string; readonly actor_kind: string },
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

const isRetryableTransactionError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error.code === "40001" || error.code === "40P01");

const objectiveRef = (
  objective: PetraProjectObjective,
  recordHash: string,
) => ({
  objective_id: objective.objective_id,
  revision: objective.revision,
  content_hash: objective.content_hash,
  record_hash: recordHash,
});

/**
 * Owns one reviewed framing or revision of the focused Objective. Exact
 * optimistic bindings, authorization, immutable Objective revision, focus
 * movement, and receipt commit in one serializable PostgreSQL transaction.
 */
export class PostgresProjectObjectiveCommandAuthority implements ProjectObjectiveCommandAuthority {
  readonly #pool: Pool;
  readonly #authorizer: PostgresCommandAuthorizer;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    authorizer: PostgresCommandAuthorizer,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#authorizer = authorizer;
    this.#contracts = contracts;
  }

  async executeProjectObjectiveCommand(
    projectId: string,
    request: PetraProjectObjectiveCommandRequest,
    principal: ProjectObjectiveCommandPrincipal,
  ): Promise<ProjectObjectiveCommandResult> {
    this.#contracts.assertValid(
      "project-objective-command-request",
      "1.0.0",
      request,
    );
    this.#assertRouteProject(projectId, request);
    const requestHash = canonicalHash(request);
    const replay = this.#replay(
      await this.#storedByIdentity(
        this.#pool,
        request.command_id,
        request.idempotency_key,
      ),
      projectId,
      request,
      requestHash,
      principal,
    );
    if (replay !== undefined) return replay;

    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `project-objective-command:${request.command_id}`,
        `project-objective-idempotency:${request.idempotency_key}`,
        `project-objective-focus:${projectId}`,
      ]);
      const retained = await this.#storedByIdentity(
        client,
        request.command_id,
        request.idempotency_key,
      );
      const lockedReplay = this.#replay(
        retained,
        projectId,
        request,
        requestHash,
        principal,
      );
      if (lockedReplay !== undefined) return lockedReplay;

      const authorized = await this.#authorizer.authorize(
        {
          actor: principal.actor,
          capabilityGrantId: principal.capabilityGrantId,
          commandName: "FrameProjectObjective",
          projectId,
        },
        client,
      );
      if (!authorized) {
        throw new ProjectObjectiveCommandError(
          "PROJECT_OBJECTIVE_COMMAND_NOT_AUTHORIZED",
          "The authenticated human lacks the exact active FrameProjectObjective grant.",
        );
      }

      const projectRow = await this.#currentProject(client, projectId);
      const project = this.#projectFrom(projectRow);
      this.#assertExpectedProject(request, project, projectRow.record_hash);
      const definitionRow = await this.#currentDefinition(client, projectId);
      const definition = this.#definitionFrom(definitionRow);
      this.#assertExpectedDefinition(
        request,
        definition,
        definitionRow.record_hash,
      );
      const focusRow = await this.#currentFocus(client, projectId);
      const priorObjective =
        focusRow === undefined ? undefined : this.#objectiveFrom(focusRow);
      this.#assertExpectedFocus(request, priorObjective, focusRow?.record_hash);
      this.#assertReviewedContent(request, definition, priorObjective);
      await this.#assertDependencies(
        client,
        projectId,
        request.review.proposed_content.parent_ref,
        request.review.proposed_content.dependency_refs,
        priorObjective?.objective_id ??
          derivePetraId("objective", request.command_id),
      );

      const recordedAt = await this.#transactionTime(client);
      if (Date.parse(request.review.reviewed_at) > Date.parse(recordedAt)) {
        throw new ProjectObjectiveCommandError(
          "PROJECT_OBJECTIVE_COMMAND_REVIEW_INVALID",
          "The human review timestamp cannot be later than its PostgreSQL command transaction.",
        );
      }
      const objectiveContent = clone(request.review.proposed_content);
      const objective: PetraProjectObjective = {
        schema_name: "petra.project-objective",
        schema_version: "1.0.0",
        objective_id:
          priorObjective?.objective_id ??
          derivePetraId("objective", request.command_id),
        revision: (priorObjective?.revision ?? 0) + 1,
        project_id: projectId,
        project_definition_ref: {
          project_definition_id: definition.project_definition_id,
          revision: definition.revision,
          content_hash: definition.content_hash,
        },
        content: objectiveContent,
        content_hash: canonicalHash(objectiveContent),
        created_by: priorObjective?.created_by ?? clone(principal.actor),
        created_at: priorObjective?.created_at ?? recordedAt,
        updated_at: recordedAt,
      };
      this.#contracts.assertValid("project-objective", "1.0.0", objective);
      const objectiveRecordHash = canonicalHash(objective);
      await this.#insertObjectiveRevision(
        client,
        objective,
        objectiveRecordHash,
        priorObjective,
      );
      await this.#insertDependencies(client, objective);
      await this.#moveFocus(client, objective, principal, recordedAt);

      const exactObjectiveRef = objectiveRef(objective, objectiveRecordHash);
      const priorFocus =
        priorObjective === undefined || focusRow === undefined
          ? ({ state: "none" } as const)
          : ({
              state: "focused" as const,
              objective_ref: objectiveRef(priorObjective, focusRow.record_hash),
            } as const);
      const receiptBase = {
        schema_name: "petra.project-objective-command-receipt" as const,
        schema_version: "1.0.0" as const,
        receipt_id: derivePetraId(
          "project_objective_receipt",
          request.command_id,
        ),
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: requestHash,
        operation: request.operation,
        project_id: projectId,
        actor: clone(principal.actor),
        capability_grant_id: principal.capabilityGrantId,
        project_definition_ref: clone(request.expected.project_definition_ref),
        prior_focus: priorFocus,
        objective_ref: exactObjectiveRef,
        review: {
          decision: "applied" as const,
          rough_statement: request.review.rough_statement,
          proposed_statement: request.review.proposed_content.statement,
          reviewed_by: clone(principal.actor),
          reviewed_at: request.review.reviewed_at,
        },
        effect: {
          kind:
            request.operation === "frame"
              ? ("objective_framed" as const)
              : ("objective_revised" as const),
          summary:
            request.operation === "frame"
              ? "The reviewed Objective is retained as the active Project focus."
              : "The reviewed Objective revision is retained and is now the active Project focus.",
          current_focus_updated: true as const,
        },
        destination: {
          place_role: "brief" as const,
          project_id: projectId,
          objective_ref: exactObjectiveRef,
        },
        recovery: {
          command_path: `/api/commands/projects/${projectId}/objective`,
          assessment_path: `/api/queries/projects/${projectId}/objective-command-recovery`,
          retry_reuses_command_identity: true as const,
          missing_receipt_means_unknown: true as const,
        },
        recorded_at: recordedAt,
      };
      const receipt: PetraProjectObjectiveCommandReceipt = {
        ...receiptBase,
        record_hash: canonicalHash(receiptBase),
      };
      this.#contracts.assertValid(
        "project-objective-command-receipt",
        "1.0.0",
        receipt,
      );
      await this.#insertReceipt(client, request, requestHash, receipt);
      return {
        receipt: clone(receipt),
        objective: clone(objective),
        applied: true,
      };
    });
  }

  async assessProjectObjectiveCommandRecovery(
    projectId: string,
    request: PetraProjectObjectiveCommandRequest,
    principal: ProjectObjectiveCommandPrincipal,
  ): Promise<PetraProjectObjectiveCommandRecoveryView> {
    this.#contracts.assertValid(
      "project-objective-command-request",
      "1.0.0",
      request,
    );
    this.#assertRouteProject(projectId, request);
    const requestHash = canonicalHash(request);
    const rows = await this.#storedByIdentity(
      this.#pool,
      request.command_id,
      request.idempotency_key,
    );
    const exact =
      rows.length === 1 &&
      rows[0]?.project_id === projectId &&
      rows[0].command_id === request.command_id &&
      rows[0].idempotency_key === request.idempotency_key &&
      rows[0].request_hash === requestHash
        ? rows[0]
        : undefined;
    const owned =
      exact !== undefined && sameActor(exact, principal.actor)
        ? this.#storedResult(exact)
        : undefined;
    const subject = {
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      request_hash: requestHash,
    };
    const effect: PetraProjectObjectiveCommandRecoveryView["effect"] =
      owned !== undefined
        ? { state: "effect_confirmed", receipt: owned.receipt }
        : rows.length === 0
          ? {
              state: "outcome_unknown",
              reason: "receipt_not_observed_at_cutoff",
              retry: {
                method: "POST",
                path: `/api/commands/projects/${projectId}/objective`,
                reuse_exact_request: true,
              },
            }
          : {
              state: "unavailable_to_verify",
              reason:
                exact === undefined
                  ? "command_identity_conflict"
                  : "command_not_owned_by_authenticated_actor",
            };
    const returnValue: PetraProjectObjectiveCommandRecoveryView["return"] =
      owned === undefined
        ? {
            state: "safe_fallback",
            destination: { place_role: "brief", project_id: projectId },
            reason:
              "No exact owned receipt is available, so Petra returns to the Project Brief and re-reads current focus before another action.",
          }
        : { state: "exact", destination: clone(owned.receipt.destination) };
    const observedAt = await this.#databaseTime();
    const hashed = {
      project_id: projectId,
      subject,
      effect,
      return: returnValue,
      observed_at: observedAt,
    };
    const contentHash = canonicalHash(hashed);
    const view: PetraProjectObjectiveCommandRecoveryView = {
      schema_name: "petra.project-objective-command-recovery-view",
      schema_version: "1.0.0",
      assessment_id: derivePetraId("project_objective_recovery", contentHash),
      ...hashed,
      content_hash: contentHash,
    };
    this.#contracts.assertValid(
      "project-objective-command-recovery-view",
      "1.0.0",
      view,
    );
    return clone(view);
  }

  #assertRouteProject(
    projectId: string,
    request: PetraProjectObjectiveCommandRequest,
  ): void {
    if (request.expected.project_ref.project_id !== projectId) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_PROJECT_STALE",
        "The Objective command route and exact expected Project must match.",
      );
    }
  }

  #assertExpectedProject(
    request: PetraProjectObjectiveCommandRequest,
    project: PetraProject,
    recordHash: string,
  ): void {
    const expected = request.expected.project_ref;
    if (
      project.project_id !== expected.project_id ||
      project.revision !== expected.revision ||
      recordHash !== expected.record_hash ||
      project.status !== "active"
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_PROJECT_STALE",
        "The Project revision, record hash, or active status changed after Objective review.",
      );
    }
  }

  #assertExpectedDefinition(
    request: PetraProjectObjectiveCommandRequest,
    definition: PetraProjectDefinition,
    recordHash: string,
  ): void {
    const expected = request.expected.project_definition_ref;
    if (
      definition.project_definition_id !== expected.project_definition_id ||
      definition.revision !== expected.revision ||
      definition.content_hash !== expected.content_hash ||
      recordHash !== expected.record_hash
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_DEFINITION_STALE",
        "The current ProjectDefinition no longer matches the exact reviewed Objective binding.",
      );
    }
  }

  #assertExpectedFocus(
    request: PetraProjectObjectiveCommandRequest,
    objective: PetraProjectObjective | undefined,
    recordHash: string | undefined,
  ): void {
    const expected = request.expected.focus;
    if (expected.state === "none") {
      if (objective !== undefined || request.operation !== "frame") {
        throw new ProjectObjectiveCommandError(
          "PROJECT_OBJECTIVE_COMMAND_FOCUS_STALE",
          "Framing requires the exact reviewed absence of a current Objective.",
        );
      }
      return;
    }
    const ref = expected.objective_ref;
    if (
      request.operation !== "revise" ||
      objective === undefined ||
      objective.objective_id !== ref.objective_id ||
      objective.revision !== ref.revision ||
      objective.content_hash !== ref.content_hash ||
      recordHash !== ref.record_hash ||
      objective.content.status !== "active"
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_FOCUS_STALE",
        "Revision requires the exact current active Objective revision reviewed by the human.",
      );
    }
  }

  #assertReviewedContent(
    request: PetraProjectObjectiveCommandRequest,
    definition: PetraProjectDefinition,
    prior: PetraProjectObjective | undefined,
  ): void {
    const content = request.review.proposed_content;
    if (content.status !== "active") {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_REVIEW_INVALID",
        "A newly focused Objective revision must retain active authored status.",
      );
    }
    if (
      !definition.content.registrations.some(
        (registration) =>
          registration.registration_kind === "objective_schema" &&
          registration.semantic_key === content.objective_kind,
      )
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_KIND_UNREGISTERED",
        "The reviewed Objective kind is not registered by the exact ProjectDefinition.",
      );
    }
    if (
      prior !== undefined &&
      (content.objective_kind !== prior.content.objective_kind ||
        request.review.rough_statement !== prior.content.statement)
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_REVIEW_INVALID",
        "A revision must preserve the Objective kind and bind rough wording to the exact prior statement.",
      );
    }
  }

  async #assertDependencies(
    client: PoolClient,
    projectId: string,
    parent: ProjectObjectiveRef | undefined,
    dependencies: readonly ProjectObjectiveRef[],
    resultObjectiveId: string,
  ): Promise<void> {
    const refs = [...(parent === undefined ? [] : [parent]), ...dependencies];
    const identities = refs.map(
      (ref) => `${ref.objective_id}:${ref.revision}:${ref.content_hash}`,
    );
    if (
      refs.some((ref) => ref.objective_id === resultObjectiveId) ||
      new Set(identities).size !== identities.length ||
      new Set(refs.map((ref) => ref.objective_id)).size !== refs.length
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_DEPENDENCY_INVALID",
        "Objective parent and dependencies must be distinct exact revisions of other Project Objectives.",
      );
    }
    for (const ref of refs) {
      const result = await client.query(
        `SELECT 1
           FROM petra.project_objective_revisions
          WHERE project_id = $1
            AND objective_id = $2
            AND revision = $3
            AND content_hash = $4
          FOR SHARE`,
        [projectId, ref.objective_id, ref.revision, ref.content_hash],
      );
      if (result.rowCount !== 1) {
        throw new ProjectObjectiveCommandError(
          "PROJECT_OBJECTIVE_COMMAND_DEPENDENCY_INVALID",
          "Every reviewed Objective dependency must resolve to one exact retained revision in this Project.",
        );
      }
    }
  }

  #replay(
    rows: readonly StoredReceiptRow[],
    projectId: string,
    request: PetraProjectObjectiveCommandRequest,
    requestHash: string,
    principal: ProjectObjectiveCommandPrincipal,
  ): ProjectObjectiveCommandResult | undefined {
    if (rows.length === 0) return undefined;
    const row = rows[0];
    if (
      rows.length !== 1 ||
      row === undefined ||
      row.project_id !== projectId ||
      row.command_id !== request.command_id ||
      row.idempotency_key !== request.idempotency_key ||
      row.request_hash !== requestHash ||
      !sameActor(row, principal.actor)
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_CONFLICT",
        "The command or idempotency identity is already bound to a different Objective request.",
      );
    }
    return { ...this.#storedResult(row), applied: false };
  }

  #storedResult(
    row: StoredReceiptRow,
  ): Omit<ProjectObjectiveCommandResult, "applied"> {
    this.#contracts.assertValid(
      "project-objective-command-receipt",
      "1.0.0",
      row.receipt_payload,
    );
    this.#contracts.assertValid(
      "project-objective",
      "1.0.0",
      row.objective_payload,
    );
    const receipt = row.receipt_payload as PetraProjectObjectiveCommandReceipt;
    const objective = row.objective_payload as PetraProjectObjective;
    const receiptBase = Object.fromEntries(
      Object.entries(receipt).filter(([key]) => key !== "record_hash"),
    );
    if (
      canonicalHash(receiptBase) !== receipt.record_hash ||
      row.receipt_record_hash !== receipt.record_hash ||
      canonicalHash(objective) !== row.objective_record_hash ||
      receipt.objective_ref.objective_id !== objective.objective_id ||
      receipt.objective_ref.revision !== objective.revision ||
      receipt.objective_ref.content_hash !== objective.content_hash ||
      receipt.objective_ref.record_hash !== row.objective_record_hash
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_STORED_RECORD_CORRUPT",
        "The retained Objective command receipt or result revision failed exact hash validation.",
      );
    }
    return { receipt: clone(receipt), objective: clone(objective) };
  }

  async #storedByIdentity(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    commandId: string,
    idempotencyKey: string,
  ): Promise<StoredReceiptRow[]> {
    const result = await queryable.query<StoredReceiptRow>(
      `SELECT receipt.command_id, receipt.idempotency_key,
              receipt.request_hash, receipt.project_id,
              receipt.actor_id, receipt.actor_kind,
              receipt.payload AS receipt_payload,
              receipt.record_hash AS receipt_record_hash,
              objective.payload AS objective_payload,
              objective.record_hash AS objective_record_hash
         FROM petra.project_objective_command_receipts AS receipt
         JOIN petra.project_objective_revisions AS objective
           ON objective.project_id = receipt.project_id
          AND objective.objective_id = receipt.objective_id
          AND objective.revision = receipt.objective_revision
          AND objective.content_hash = receipt.objective_content_hash
          AND objective.record_hash = receipt.objective_record_hash
        WHERE receipt.command_id = $1 OR receipt.idempotency_key = $2
        ORDER BY receipt.command_id`,
      [commandId, idempotencyKey],
    );
    return result.rows;
  }

  async #currentProject(
    client: PoolClient,
    projectId: string,
  ): Promise<StoredRecordRow> {
    const result = await client.query<StoredRecordRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.projects AS head
         JOIN petra.project_revisions AS revision
           ON revision.project_id = head.project_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
        FOR SHARE OF head, revision`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_PROJECT_NOT_FOUND",
        "The exact Project for Objective framing is unavailable.",
      );
    }
    return row;
  }

  async #currentDefinition(
    client: PoolClient,
    projectId: string,
  ): Promise<StoredRecordRow> {
    const result = await client.query<StoredRecordRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.project_definitions AS head
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = head.project_definition_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
        FOR SHARE OF head, revision`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_DEFINITION_STALE",
        "The Project has no exact current ProjectDefinition for Objective framing.",
      );
    }
    return row;
  }

  async #currentFocus(
    client: PoolClient,
    projectId: string,
  ): Promise<StoredFocusRow | undefined> {
    const result = await client.query<StoredFocusRow>(
      `SELECT revision.objective_id, revision.revision,
              revision.content_hash, revision.record_hash, revision.payload
         FROM petra.project_objective_focus AS focus
         JOIN petra.project_objectives AS head
           ON head.objective_id = focus.objective_id
          AND head.project_id = focus.project_id
          AND head.current_revision = focus.objective_revision
         JOIN petra.project_objective_revisions AS revision
           ON revision.project_id = focus.project_id
          AND revision.objective_id = focus.objective_id
          AND revision.revision = focus.objective_revision
          AND revision.content_hash = focus.objective_content_hash
        WHERE focus.project_id = $1
        FOR SHARE OF focus, head, revision`,
      [projectId],
    );
    return result.rows[0];
  }

  #projectFrom(row: StoredRecordRow): PetraProject {
    this.#contracts.assertValid("project", "1.0.0", row.payload);
    const project = row.payload as PetraProject;
    if (canonicalHash(project) !== row.record_hash) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_STORED_RECORD_CORRUPT",
        "The current Project failed exact record validation.",
      );
    }
    return clone(project);
  }

  #definitionFrom(row: StoredRecordRow): PetraProjectDefinition {
    this.#contracts.assertValid("project-definition", "1.0.0", row.payload);
    const definition = row.payload as PetraProjectDefinition;
    if (
      canonicalHash(definition.content) !== definition.content_hash ||
      canonicalHash(definition) !== row.record_hash
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_STORED_RECORD_CORRUPT",
        "The current ProjectDefinition failed exact record validation.",
      );
    }
    return clone(definition);
  }

  #objectiveFrom(row: StoredRecordRow): PetraProjectObjective {
    this.#contracts.assertValid("project-objective", "1.0.0", row.payload);
    const objective = row.payload as PetraProjectObjective;
    if (
      canonicalHash(objective.content) !== objective.content_hash ||
      canonicalHash(objective) !== row.record_hash
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_STORED_RECORD_CORRUPT",
        "The current Project Objective failed exact record validation.",
      );
    }
    return clone(objective);
  }

  async #insertObjectiveRevision(
    client: PoolClient,
    objective: PetraProjectObjective,
    recordHash: string,
    prior: PetraProjectObjective | undefined,
  ): Promise<void> {
    if (prior === undefined) {
      await client.query(
        `INSERT INTO petra.project_objectives (
           objective_id, project_id, current_revision,
           created_by_actor_id, created_by_actor_kind, created_at
         ) VALUES ($1, $2, 1, $3, $4, $5::timestamptz)`,
        [
          objective.objective_id,
          objective.project_id,
          objective.created_by.actor_id,
          objective.created_by.actor_kind,
          objective.created_at,
        ],
      );
    }
    await client.query(
      `INSERT INTO petra.project_objective_revisions (
         objective_id, revision, project_id, schema_name, schema_version,
         project_definition_id, project_definition_revision,
         project_definition_content_hash, objective_kind, status,
         content_hash, created_by_actor_id, created_by_actor_kind,
         record_hash, payload, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15::jsonb, $16::timestamptz, $17::timestamptz
       )`,
      [
        objective.objective_id,
        objective.revision,
        objective.project_id,
        objective.schema_name,
        objective.schema_version,
        objective.project_definition_ref.project_definition_id,
        objective.project_definition_ref.revision,
        objective.project_definition_ref.content_hash,
        objective.content.objective_kind,
        objective.content.status,
        objective.content_hash,
        objective.created_by.actor_id,
        objective.created_by.actor_kind,
        recordHash,
        JSON.stringify(objective),
        objective.created_at,
        objective.updated_at,
      ],
    );
    if (prior !== undefined) {
      await client.query(
        `UPDATE petra.project_objectives
            SET current_revision = $2
          WHERE objective_id = $1 AND current_revision = $3`,
        [objective.objective_id, objective.revision, prior.revision],
      );
    }
  }

  async #insertDependencies(
    client: PoolClient,
    objective: PetraProjectObjective,
  ): Promise<void> {
    const entries: Array<{
      kind: "parent" | "dependency";
      position: number;
      ref: ProjectObjectiveRef;
    }> = [];
    if (objective.content.parent_ref !== undefined) {
      entries.push({
        kind: "parent",
        position: 0,
        ref: objective.content.parent_ref,
      });
    }
    objective.content.dependency_refs.forEach((ref, position) =>
      entries.push({ kind: "dependency", position, ref }),
    );
    for (const entry of entries) {
      await client.query(
        `INSERT INTO petra.project_objective_dependencies (
           project_id, objective_id, objective_revision,
           objective_content_hash, relation_kind, position,
           related_objective_id, related_objective_revision,
           related_objective_content_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          objective.project_id,
          objective.objective_id,
          objective.revision,
          objective.content_hash,
          entry.kind,
          entry.position,
          entry.ref.objective_id,
          entry.ref.revision,
          entry.ref.content_hash,
        ],
      );
    }
  }

  async #moveFocus(
    client: PoolClient,
    objective: PetraProjectObjective,
    principal: ProjectObjectiveCommandPrincipal,
    recordedAt: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.project_objective_focus (
         project_id, objective_id, objective_revision,
         objective_content_hash, changed_by_actor_id,
         changed_by_actor_kind, changed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
       ON CONFLICT (project_id) DO UPDATE
         SET objective_id = EXCLUDED.objective_id,
             objective_revision = EXCLUDED.objective_revision,
             objective_content_hash = EXCLUDED.objective_content_hash,
             changed_by_actor_id = EXCLUDED.changed_by_actor_id,
             changed_by_actor_kind = EXCLUDED.changed_by_actor_kind,
             changed_at = EXCLUDED.changed_at`,
      [
        objective.project_id,
        objective.objective_id,
        objective.revision,
        objective.content_hash,
        principal.actor.actor_id,
        principal.actor.actor_kind,
        recordedAt,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_objective_focus_history (
         project_id, objective_id, objective_revision,
         objective_content_hash, changed_by_actor_id,
         changed_by_actor_kind, changed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)`,
      [
        objective.project_id,
        objective.objective_id,
        objective.revision,
        objective.content_hash,
        principal.actor.actor_id,
        principal.actor.actor_kind,
        recordedAt,
      ],
    );
  }

  async #insertReceipt(
    client: PoolClient,
    request: PetraProjectObjectiveCommandRequest,
    requestHash: string,
    receipt: PetraProjectObjectiveCommandReceipt,
  ): Promise<void> {
    const prior =
      receipt.prior_focus.state === "focused"
        ? receipt.prior_focus.objective_ref
        : undefined;
    const definition = receipt.project_definition_ref;
    const objective = receipt.objective_ref;
    await client.query(
      `INSERT INTO petra.project_objective_command_receipts (
         receipt_id, command_id, idempotency_key, request_hash,
         request_payload, operation, project_id, actor_id, actor_kind,
         capability_grant_id, project_definition_id,
         project_definition_revision, project_definition_content_hash,
         project_definition_record_hash, prior_objective_id,
         prior_objective_revision, prior_objective_content_hash,
         prior_objective_record_hash, objective_id, objective_revision,
         objective_content_hash, objective_record_hash, schema_name,
         schema_version, record_hash, payload, recorded_at
       ) VALUES (
         $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
         $25, $26::jsonb, $27::timestamptz
       )`,
      [
        receipt.receipt_id,
        receipt.command_id,
        receipt.idempotency_key,
        requestHash,
        JSON.stringify(request),
        receipt.operation,
        receipt.project_id,
        receipt.actor.actor_id,
        receipt.actor.actor_kind,
        receipt.capability_grant_id,
        definition.project_definition_id,
        definition.revision,
        definition.content_hash,
        definition.record_hash,
        prior?.objective_id ?? null,
        prior?.revision ?? null,
        prior?.content_hash ?? null,
        prior?.record_hash ?? null,
        objective.objective_id,
        objective.revision,
        objective.content_hash,
        objective.record_hash,
        receipt.schema_name,
        receipt.schema_version,
        receipt.record_hash,
        JSON.stringify(receipt),
        receipt.recorded_at,
      ],
    );
  }

  async #transactionTime(client: PoolClient): Promise<string> {
    const result = await client.query<{ transaction_time: Date }>(
      "SELECT CURRENT_TIMESTAMP AS transaction_time",
    );
    const value = result.rows[0]?.transaction_time;
    if (value === undefined) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_STORED_RECORD_CORRUPT",
        "PostgreSQL did not provide the Objective command transaction time.",
      );
    }
    return value.toISOString();
  }

  async #databaseTime(): Promise<string> {
    const result = await this.#pool.query<{ observed_at: Date }>(
      "SELECT CURRENT_TIMESTAMP AS observed_at",
    );
    const value = result.rows[0]?.observed_at;
    if (value === undefined) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_STORED_RECORD_CORRUPT",
        "PostgreSQL did not provide the Objective recovery observation cutoff.",
      );
    }
    return value.toISOString();
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...keys].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #transaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        try {
          const value = await operation(client);
          await client.query("COMMIT");
          return value;
        } catch (error) {
          await client.query("ROLLBACK");
          if (attempt === 3 || !isRetryableTransactionError(error)) {
            throw error;
          }
        }
      }
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_CONFLICT",
        "The Objective command exhausted its serializable retry boundary.",
      );
    } finally {
      client.release();
    }
  }
}
