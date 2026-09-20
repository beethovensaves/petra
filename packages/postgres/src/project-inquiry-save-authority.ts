import { createHash } from "node:crypto";

import type {
  PetraProjectDefinition,
  PetraProjectInquiryRole,
  PetraProjectInquirySaveReceipt,
  PetraProjectInquirySaveRecoveryView,
  PetraProjectInquirySaveRequest,
  PetraProjectObjective,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  derivePetraId,
  FocusedGraphViewContractResolver,
  ProjectInquirySaveError,
  type FocusedGraphReadRequest,
  type FocusedGraphViewReader,
  type PetraFocusedGraphReadView,
  type ProjectInquirySaveAuthority,
  type ProjectInquirySavePrincipal,
  type ProjectInquirySaveResult,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

interface StoredSaveRow {
  readonly command_id: string;
  readonly idempotency_key: string;
  readonly request_hash: string;
  readonly actor_id: string;
  readonly actor_kind: "human";
  readonly receipt_payload: unknown;
  readonly receipt_record_hash: string;
  readonly objective_payload: unknown;
  readonly objective_record_hash: string;
}

interface StoredDefinitionRow {
  readonly payload: unknown;
  readonly record_hash: string;
}

interface StoredRoleRow {
  readonly payload: unknown;
  readonly record_hash: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const sameActor = (
  left: { readonly actor_id: string; readonly actor_kind: string },
  right: { readonly actor_id: string; readonly actor_kind: string },
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

const exactDefinitionRef = (
  definition: PetraProjectDefinition,
  recordHash: string,
) => ({
  project_definition_id: definition.project_definition_id,
  revision: definition.revision,
  content_hash: definition.content_hash,
  record_hash: recordHash,
  definition_family: definition.definition_family,
});

/**
 * Persists one server-replayed focused Graph question as the registered
 * ProjectObjective representation of a ProjectInquiry. The focused query is
 * verified before the serializable write; the transaction then rechecks the
 * exact current ProjectDefinition, role, Actor, and capability grant.
 */
export class PostgresProjectInquirySaveAuthority implements ProjectInquirySaveAuthority {
  readonly #pool: Pool;
  readonly #graphs: FocusedGraphViewReader;
  readonly #authorizer: PostgresCommandAuthorizer;
  readonly #contracts: PetraContractRegistry;
  readonly #graphContracts: FocusedGraphViewContractResolver;

  constructor(
    pool: Pool,
    graphs: FocusedGraphViewReader,
    authorizer: PostgresCommandAuthorizer,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#graphs = graphs;
    this.#authorizer = authorizer;
    this.#contracts = contracts;
    this.#graphContracts = new FocusedGraphViewContractResolver(contracts);
  }

  async saveProjectInquiry(
    projectId: string,
    request: PetraProjectInquirySaveRequest,
    principal: ProjectInquirySavePrincipal,
  ): Promise<ProjectInquirySaveResult> {
    this.#contracts.assertValid(
      "project-inquiry-save-request",
      "1.0.0",
      request,
    );
    const requestHash = canonicalHash(request);
    const retained = await this.#storedByIdentity(
      this.#pool,
      request.command_id,
      request.idempotency_key,
    );
    const replay = this.#replay(retained, request, requestHash, principal);
    if (replay !== undefined) return replay;

    const graph = await this.#graphs.queryFocusedGraph(
      projectId,
      request.graph_request as FocusedGraphReadRequest,
    );
    if (graph === undefined) {
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_GRAPH_NOT_FOUND",
        "The exact focused Graph question is unavailable for this Project.",
      );
    }
    this.#assertExpectedGraph(projectId, request, graph);

    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `project-inquiry-save-command:${request.command_id}`,
        `project-inquiry-save-idempotency:${request.idempotency_key}`,
        `project-inquiry-save-project:${projectId}`,
      ]);
      const concurrent = await this.#storedByIdentity(
        client,
        request.command_id,
        request.idempotency_key,
      );
      const concurrentReplay = this.#replay(
        concurrent,
        request,
        requestHash,
        principal,
      );
      if (concurrentReplay !== undefined) return concurrentReplay;

      if (
        !(await this.#authorizer.authorize(
          {
            actor: principal.actor,
            capabilityGrantId: principal.capabilityGrantId,
            commandName: "SaveProjectInquiry",
            projectId,
          },
          client,
        ))
      ) {
        throw new ProjectInquirySaveError(
          "PROJECT_INQUIRY_SAVE_NOT_AUTHORIZED",
          "The authenticated human lacks the exact active SaveProjectInquiry grant.",
        );
      }

      const definitionRow = await this.#currentDefinition(client, projectId);
      const definition = this.#definitionFrom(definitionRow);
      const definitionRecordHash = definitionRow.record_hash;
      if (
        canonicalize(exactDefinitionRef(definition, definitionRecordHash)) !==
        canonicalize(request.graph_request.project_definition_ref)
      ) {
        throw new ProjectInquirySaveError(
          "PROJECT_INQUIRY_SAVE_DEFINITION_STALE",
          "A saved ProjectInquiry must bind the exact current ProjectDefinition used by the focused Graph question.",
        );
      }
      this.#graphContracts.resolve(definition, graph);

      const roleRow = await this.#currentRole(
        client,
        projectId,
        request.graph_request.task_semantic_key,
        definition,
      );
      const role = this.#roleFrom(roleRow);
      if (
        role.content.status !== "active" ||
        role.content.representation.objective_kind !==
          request.graph_request.task_semantic_key
      ) {
        throw new ProjectInquirySaveError(
          "PROJECT_INQUIRY_SAVE_ROLE_UNAVAILABLE",
          "The exact Graph task is not an active registered ProjectInquiry role.",
        );
      }

      const recordedAt = await this.#transactionTime(client);
      const objectiveContent: PetraProjectObjective["content"] = {
        objective_kind: role.content.representation.objective_kind,
        statement: request.graph_request.question,
        status: "active",
        dependency_refs: [],
      };
      const objective: PetraProjectObjective = {
        schema_name: "petra.project-objective",
        schema_version: "1.0.0",
        objective_id: derivePetraId("objective", request.command_id),
        revision: 1,
        project_id: projectId,
        project_definition_ref: {
          project_definition_id: definition.project_definition_id,
          revision: definition.revision,
          content_hash: definition.content_hash,
        },
        content: objectiveContent,
        content_hash: canonicalHash(objectiveContent),
        created_by: clone(principal.actor),
        created_at: recordedAt,
        updated_at: recordedAt,
      };
      this.#contracts.assertValid("project-objective", "1.0.0", objective);
      const objectiveRecordHash = canonicalHash(objective);
      await this.#insertObjective(client, objective, objectiveRecordHash);

      const receiptBase = {
        schema_name: "petra.project-inquiry-save-receipt" as const,
        schema_version: "1.0.0" as const,
        receipt_id: derivePetraId(
          "project_inquiry_save_receipt",
          request.command_id,
        ),
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: requestHash,
        project_id: projectId,
        actor: clone(principal.actor),
        capability_grant_id: principal.capabilityGrantId,
        inquiry_role_ref: {
          project_inquiry_role_id: role.project_inquiry_role_id,
          revision: role.revision,
          content_hash: role.content_hash,
          record_hash: roleRow.record_hash,
        },
        objective_ref: {
          objective_id: objective.objective_id,
          revision: 1 as const,
          content_hash: objective.content_hash,
          record_hash: objectiveRecordHash,
        },
        graph_binding: {
          graph_request_hash: canonicalHash(request.graph_request),
          focused_graph_ref: clone(request.expected_graph),
          task_request_id: graph.content.task.request_id,
          task_request_hash: graph.content.task.request_hash,
          question_hash: graph.content.task.question_hash,
          project_definition_ref: exactDefinitionRef(
            definition,
            definitionRecordHash,
          ),
          snapshot_ref: clone(graph.content.represented_snapshot),
          semantic_layer: graph.content.semantic_layer as "current" | "working",
          focus_refs: clone(graph.content.task.focus_refs),
          selection: clone(request.selection),
          origin: clone(graph.content.task.origin),
          return_destination: clone(request.graph_request.return_destination),
        },
        effect: {
          kind: "project_inquiry_created" as const,
          summary:
            "The exact question is retained as an active ProjectInquiry; its graph snapshot and selection remain provenance rather than authority." as const,
          graph_authority_changed: false as const,
          selection_granted_authority: false as const,
        },
        recovery: {
          command_path: `/api/commands/projects/${projectId}/inquiries`,
          assessment_path: `/api/queries/projects/${projectId}/inquiries/save-recovery`,
          retry_reuses_command_identity: true as const,
          missing_receipt_means_unknown: true as const,
        },
        recorded_at: recordedAt,
      };
      const receipt: PetraProjectInquirySaveReceipt = {
        ...receiptBase,
        record_hash: canonicalHash(receiptBase),
      };
      this.#contracts.assertValid(
        "project-inquiry-save-receipt",
        "1.0.0",
        receipt,
      );
      await this.#insertReceipt(
        client,
        request,
        requestHash,
        definition,
        definitionRecordHash,
        role,
        roleRow.record_hash,
        objective,
        objectiveRecordHash,
        receipt,
      );
      return {
        receipt: clone(receipt),
        inquiry: clone(objective),
        applied: true,
      };
    });
  }

  async assessProjectInquirySaveRecovery(
    projectId: string,
    request: PetraProjectInquirySaveRequest,
    principal: ProjectInquirySavePrincipal,
  ): Promise<PetraProjectInquirySaveRecoveryView> {
    this.#contracts.assertValid(
      "project-inquiry-save-request",
      "1.0.0",
      request,
    );
    const requestHash = canonicalHash(request);
    const rows = await this.#storedByIdentity(
      this.#pool,
      request.command_id,
      request.idempotency_key,
    );
    const observedAt = await this.#databaseTime();
    const exact =
      rows.length === 1 &&
      rows[0]?.command_id === request.command_id &&
      rows[0].idempotency_key === request.idempotency_key &&
      rows[0].request_hash === requestHash
        ? rows[0]
        : undefined;
    const subject = {
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      request_hash: requestHash,
    };
    const effect: PetraProjectInquirySaveRecoveryView["effect"] =
      exact !== undefined && sameActor(exact, principal.actor)
        ? {
            state: "effect_confirmed",
            receipt: this.#storedResult(exact).receipt,
          }
        : rows.length === 0
          ? {
              state: "outcome_unknown",
              reason: "receipt_not_observed_at_cutoff",
              retry: {
                method: "POST",
                path: `/api/commands/projects/${projectId}/inquiries`,
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
    const hashed = {
      project_id: projectId,
      subject,
      effect,
      observed_at: observedAt,
    };
    const contentHash = canonicalHash(hashed);
    const view: PetraProjectInquirySaveRecoveryView = {
      schema_name: "petra.project-inquiry-save-recovery-view",
      schema_version: "1.0.0",
      assessment_id: derivePetraId(
        "project_inquiry_save_recovery",
        contentHash,
      ),
      ...hashed,
      content_hash: contentHash,
    };
    this.#contracts.assertValid(
      "project-inquiry-save-recovery-view",
      "1.0.0",
      view,
    );
    return clone(view);
  }

  #assertExpectedGraph(
    projectId: string,
    request: PetraProjectInquirySaveRequest,
    graph: PetraFocusedGraphReadView,
  ): void {
    if (
      graph.project_id !== projectId ||
      graph.schema_name !== request.expected_graph.schema_name ||
      graph.schema_version !== request.expected_graph.schema_version ||
      graph.content_hash !== request.expected_graph.content_hash ||
      graph.content.task.request_id !== request.graph_request.request_id ||
      graph.content.task.question !== request.graph_request.question ||
      graph.content.task.task_semantic_key !==
        request.graph_request.task_semantic_key ||
      graph.content.semantic_layer === "historical"
    ) {
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_GRAPH_STALE",
        "The focused Graph result, question, Project, definition, or semantic layer no longer matches this save request.",
      );
    }
    if (request.selection.state === "none") return;
    const memberKeys =
      request.selection.selection_kind === "node"
        ? new Set(graph.content.nodes.map((member) => member.node_key))
        : request.selection.selection_kind === "relationship"
          ? new Set(
              graph.content.relationships.map(
                (member) => member.relationship_key,
              ),
            )
          : new Set(graph.content.paths.map((member) => member.path_key));
    if (request.selection.selected_keys.some((key) => !memberKeys.has(key))) {
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_SELECTION_INVALID",
        "The saved selection must belong to the exact server-verified focused Graph result.",
      );
    }
  }

  #replay(
    rows: readonly StoredSaveRow[],
    request: PetraProjectInquirySaveRequest,
    requestHash: string,
    principal: ProjectInquirySavePrincipal,
  ): ProjectInquirySaveResult | undefined {
    if (rows.length === 0) return undefined;
    const row = rows[0];
    if (
      rows.length !== 1 ||
      row === undefined ||
      row.command_id !== request.command_id ||
      row.idempotency_key !== request.idempotency_key ||
      row.request_hash !== requestHash ||
      !sameActor(row, principal.actor)
    ) {
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_CONFLICT",
        "The command or idempotency identity is already bound to a different ProjectInquiry save request.",
      );
    }
    const stored = this.#storedResult(row);
    return { ...stored, applied: false };
  }

  #storedResult(row: StoredSaveRow): Omit<ProjectInquirySaveResult, "applied"> {
    this.#contracts.assertValid(
      "project-inquiry-save-receipt",
      "1.0.0",
      row.receipt_payload,
    );
    this.#contracts.assertValid(
      "project-objective",
      "1.0.0",
      row.objective_payload,
    );
    const receipt = row.receipt_payload as PetraProjectInquirySaveReceipt;
    const receiptBase = Object.fromEntries(
      Object.entries(receipt).filter(([key]) => key !== "record_hash"),
    );
    const inquiry = row.objective_payload as PetraProjectObjective;
    if (
      canonicalHash(receiptBase) !== receipt.record_hash ||
      row.receipt_record_hash !== receipt.record_hash ||
      canonicalHash(inquiry) !== row.objective_record_hash ||
      receipt.objective_ref.objective_id !== inquiry.objective_id ||
      receipt.objective_ref.content_hash !== inquiry.content_hash ||
      receipt.objective_ref.record_hash !== row.objective_record_hash
    ) {
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_STORED_RECORD_CORRUPT",
        "The retained ProjectInquiry save receipt or Objective failed exact hash validation.",
      );
    }
    return { receipt: clone(receipt), inquiry: clone(inquiry) };
  }

  async #storedByIdentity(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    commandId: string,
    idempotencyKey: string,
  ): Promise<StoredSaveRow[]> {
    const result = await queryable.query<StoredSaveRow>(
      `SELECT receipt.command_id, receipt.idempotency_key,
              receipt.request_hash, receipt.actor_id, receipt.actor_kind,
              receipt.receipt_payload, receipt.receipt_record_hash,
              objective.payload AS objective_payload,
              objective.record_hash AS objective_record_hash
         FROM petra.project_inquiry_save_receipts AS receipt
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

  async #currentDefinition(
    client: PoolClient,
    projectId: string,
  ): Promise<StoredDefinitionRow> {
    const result = await client.query<StoredDefinitionRow>(
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
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_DEFINITION_STALE",
        "The Project has no exact current ProjectDefinition for this inquiry.",
      );
    }
    return row;
  }

  async #currentRole(
    client: PoolClient,
    projectId: string,
    semanticKey: string,
    definition: PetraProjectDefinition,
  ): Promise<StoredRoleRow> {
    const result = await client.query<StoredRoleRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.project_inquiry_roles AS head
         JOIN petra.project_inquiry_role_revisions AS revision
           ON revision.project_inquiry_role_id = head.project_inquiry_role_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.role_semantic_key = $2
          AND revision.project_definition_id = $3
          AND revision.project_definition_revision = $4
          AND revision.project_definition_content_hash = $5
        FOR SHARE OF head, revision`,
      [
        projectId,
        semanticKey,
        definition.project_definition_id,
        definition.revision,
        definition.content_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_ROLE_UNAVAILABLE",
        "The ProjectDefinition has no active exact ProjectInquiry role for this Graph question.",
      );
    }
    return row;
  }

  #definitionFrom(row: StoredDefinitionRow): PetraProjectDefinition {
    this.#contracts.assertValid("project-definition", "1.0.0", row.payload);
    const definition = row.payload as PetraProjectDefinition;
    if (
      canonicalHash(definition.content) !== definition.content_hash ||
      canonicalHash(definition) !== row.record_hash
    ) {
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_STORED_RECORD_CORRUPT",
        "The current ProjectDefinition failed exact hash validation.",
      );
    }
    return clone(definition);
  }

  #roleFrom(row: StoredRoleRow): PetraProjectInquiryRole {
    this.#contracts.assertValid("project-inquiry-role", "1.0.0", row.payload);
    const role = row.payload as PetraProjectInquiryRole;
    if (
      canonicalHash(role.content) !== role.content_hash ||
      canonicalHash(role) !== row.record_hash
    ) {
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_STORED_RECORD_CORRUPT",
        "The ProjectInquiry role failed exact hash validation.",
      );
    }
    return clone(role);
  }

  async #insertObjective(
    client: PoolClient,
    objective: PetraProjectObjective,
    recordHash: string,
  ): Promise<void> {
    const existing = await client.query(
      "SELECT 1 FROM petra.project_objectives WHERE objective_id = $1",
      [objective.objective_id],
    );
    if ((existing.rowCount ?? 0) !== 0) {
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_CONFLICT",
        "The derived ProjectInquiry Objective identity is already retained without this exact receipt.",
      );
    }
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
    await client.query(
      `INSERT INTO petra.project_objective_revisions (
         objective_id, revision, project_id, schema_name, schema_version,
         project_definition_id, project_definition_revision,
         project_definition_content_hash, objective_kind, status,
         content_hash, created_by_actor_id, created_by_actor_kind,
         record_hash, payload, created_at, updated_at
       ) VALUES (
         $1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13, $14::jsonb, $15::timestamptz, $16::timestamptz
       )`,
      [
        objective.objective_id,
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
  }

  async #insertReceipt(
    client: PoolClient,
    request: PetraProjectInquirySaveRequest,
    requestHash: string,
    definition: PetraProjectDefinition,
    definitionRecordHash: string,
    role: PetraProjectInquiryRole,
    roleRecordHash: string,
    objective: PetraProjectObjective,
    objectiveRecordHash: string,
    receipt: PetraProjectInquirySaveReceipt,
  ): Promise<void> {
    const graph = receipt.graph_binding;
    await client.query(
      `INSERT INTO petra.project_inquiry_save_receipts (
         receipt_id, command_id, idempotency_key, request_hash,
         request_payload, project_id, actor_id, actor_kind,
         capability_grant_id, project_definition_id,
         project_definition_revision, project_definition_content_hash,
         project_definition_record_hash, project_inquiry_role_id,
         project_inquiry_role_revision, project_inquiry_role_content_hash,
         project_inquiry_role_record_hash, objective_id, objective_revision,
         objective_content_hash, objective_record_hash, graph_request_id,
         graph_request_hash, focused_graph_schema_version,
         focused_graph_content_hash, snapshot_id, snapshot_revision,
         snapshot_event_position, snapshot_content_hash, semantic_layer,
         receipt_record_hash, receipt_payload, recorded_at
       ) VALUES (
         $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17, $18, 1, $19, $20, $21, $22, $23,
         $24, $25, $26, $27, $28, $29, $30, $31::jsonb, $32::timestamptz
       )`,
      [
        receipt.receipt_id,
        request.command_id,
        request.idempotency_key,
        requestHash,
        JSON.stringify(request),
        objective.project_id,
        receipt.actor.actor_id,
        receipt.actor.actor_kind,
        receipt.capability_grant_id,
        definition.project_definition_id,
        definition.revision,
        definition.content_hash,
        definitionRecordHash,
        role.project_inquiry_role_id,
        role.revision,
        role.content_hash,
        roleRecordHash,
        objective.objective_id,
        objective.content_hash,
        objectiveRecordHash,
        graph.task_request_id,
        graph.graph_request_hash,
        graph.focused_graph_ref.schema_version,
        graph.focused_graph_ref.content_hash,
        graph.snapshot_ref.snapshot_id,
        graph.snapshot_ref.revision,
        graph.snapshot_ref.event_position,
        graph.snapshot_ref.content_hash,
        graph.semantic_layer,
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
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_STORED_RECORD_CORRUPT",
        "PostgreSQL did not provide the ProjectInquiry transaction time.",
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
      throw new ProjectInquirySaveError(
        "PROJECT_INQUIRY_SAVE_STORED_RECORD_CORRUPT",
        "PostgreSQL did not provide the ProjectInquiry recovery cutoff.",
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
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const value = await operation(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
