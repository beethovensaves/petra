import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectImportCommandReceipt,
  PetraProjectImportCommandRecoveryView,
  PetraProjectImportCommandRequest,
  PetraProjectObjective,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ProjectImportError,
  derivePetraId,
  type ProjectImportAncestryReader,
  type ProjectImportCommandAuthority,
  type ProjectImportCommandRecoveryReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

interface StoredReceiptRow {
  readonly request_hash: string;
  readonly actor_id: string;
  readonly actor_kind: ActorRef["actor_kind"];
  readonly payload: unknown;
}

interface SourceRow {
  readonly project_revision: string;
  readonly project_record_hash: string;
  readonly project_created_by_actor_id: string;
  readonly project_created_by_actor_kind: ActorRef["actor_kind"];
  readonly project_payload: unknown;
  readonly definition_revision: string;
  readonly definition_content_hash: string;
  readonly definition_record_hash: string;
  readonly definition_payload: unknown;
  readonly objective_revision: string;
  readonly objective_content_hash: string;
  readonly objective_record_hash: string;
  readonly objective_payload: unknown;
}

export interface ProjectImportPrincipal {
  readonly actor_id: string;
  readonly actor_kind: "human";
}

export interface PostgresProjectImportAuthorityOptions {
  readonly now?: () => string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const isRetryableTransactionError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error.code === "40001" || error.code === "40P01");

/**
 * PostgreSQL authority for the bounded D018 retained-Project reuse path. It
 * creates a new Project identity from the exact current definition and focused
 * objective while keeping all source authority in the source Project.
 */
export class PostgresProjectImportAuthority
  implements
    ProjectImportCommandAuthority,
    ProjectImportCommandRecoveryReader,
    ProjectImportAncestryReader
{
  readonly #pool: Pool;
  readonly #principal: ProjectImportPrincipal | undefined;
  readonly #contracts: PetraContractRegistry;
  readonly #now: () => string;

  constructor(
    pool: Pool,
    principal?: ProjectImportPrincipal,
    contracts = new PetraContractRegistry(),
    options: PostgresProjectImportAuthorityOptions = {},
  ) {
    this.#pool = pool;
    this.#principal = principal === undefined ? undefined : { ...principal };
    this.#contracts = contracts;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async executeProjectImportCommand(
    request: PetraProjectImportCommandRequest,
  ): Promise<PetraProjectImportCommandReceipt> {
    this.#contracts.assertValid(
      "project-import-command-request",
      "1.0.0",
      request,
    );
    const requestHash = canonicalHash(request);
    return this.#transaction(async (client) => {
      for (const identity of [
        `project-import-command:${request.command_id}`,
        `project-import-idempotency:${request.idempotency_key}`,
      ].sort()) {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
          [identity],
        );
      }
      const retained = await this.#findByIdentity(client, request);
      if (retained.length > 0) {
        const exact = retained.find((row) => row.request_hash === requestHash);
        if (retained.length !== 1 || exact === undefined) {
          throw new ProjectImportError(
            "PROJECT_IMPORT_COMMAND_CONFLICT",
            "The command or idempotency key is already bound to a different Project import request.",
          );
        }
        await this.#requireOwnedReceipt(client, exact);
        return this.#receiptFrom(exact.payload);
      }

      const principal = await this.#requirePrincipal(client);
      const source = await this.#requireExactSource(client, request, principal);
      const recordedAt = this.#now();
      const projectId = derivePetraId("project", request.command_id);
      const definitionId = derivePetraId(
        "project_definition",
        request.command_id,
      );
      const objectiveId = derivePetraId("objective", request.command_id);
      const sourceProject = this.#projectFrom(source.project_payload);
      const sourceDefinition = this.#definitionFrom(source.definition_payload);
      const sourceObjective = this.#objectiveFrom(source.objective_payload);
      const actor = { ...principal };
      const project: PetraProject = {
        schema_name: "petra.project",
        schema_version: "1.0.0",
        project_id: projectId,
        revision: 1,
        name: request.project.name,
        ...(request.project.description === undefined
          ? {}
          : { description: request.project.description }),
        status: "active",
        visibility: "private",
        enabled_evidence_namespaces: clone(
          sourceProject.enabled_evidence_namespaces,
        ),
        created_by: actor,
        created_at: recordedAt,
        updated_at: recordedAt,
      };
      const definition: PetraProjectDefinition = {
        ...clone(sourceDefinition),
        project_definition_id: definitionId,
        revision: 1,
        project_id: projectId,
        created_by: actor,
        created_at: recordedAt,
      };
      const objective: PetraProjectObjective = {
        ...clone(sourceObjective),
        objective_id: objectiveId,
        revision: 1,
        project_id: projectId,
        project_definition_ref: {
          project_definition_id: definitionId,
          revision: 1,
          content_hash: definition.content_hash,
        },
        created_by: actor,
        created_at: recordedAt,
        updated_at: recordedAt,
      };
      this.#contracts.assertValid("project", "1.0.0", project);
      this.#contracts.assertValid("project-definition", "1.0.0", definition);
      this.#contracts.assertValid("project-objective", "1.0.0", objective);
      const projectRecordHash = canonicalHash(project);
      const definitionRecordHash = canonicalHash(definition);
      const objectiveRecordHash = canonicalHash(objective);
      const receipt: PetraProjectImportCommandReceipt = {
        schema_name: "petra.project-import-command-receipt",
        schema_version: "1.0.0",
        receipt_id: derivePetraId("project_import_receipt", request.command_id),
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        actor,
        source: {
          source_kind: "retained_project",
          project_ref: {
            project_id: sourceProject.project_id,
            revision: sourceProject.revision,
            record_hash: source.project_record_hash,
          },
          project_definition_ref: {
            project_definition_id: sourceDefinition.project_definition_id,
            revision: sourceDefinition.revision,
            content_hash: sourceDefinition.content_hash,
            record_hash: source.definition_record_hash,
          },
          focused_objective_ref: {
            objective_id: sourceObjective.objective_id,
            revision: sourceObjective.revision,
            content_hash: sourceObjective.content_hash,
            record_hash: source.objective_record_hash,
          },
          project_status: sourceProject.status,
        },
        admission: {
          decision: request.admission.decision,
          copy_scope: request.admission.copy_scope,
          source_effect: request.admission.source_effect,
          reviewed_by: actor,
          reviewed_at: request.admission.reviewed_at,
        },
        result: {
          project_ref: {
            project_id: project.project_id,
            revision: 1,
            record_hash: projectRecordHash,
          },
          project_definition_ref: {
            project_definition_id: definition.project_definition_id,
            revision: 1,
            content_hash: definition.content_hash,
            record_hash: definitionRecordHash,
          },
          focused_objective_ref: {
            objective_id: objective.objective_id,
            revision: 1,
            content_hash: objective.content_hash,
            record_hash: objectiveRecordHash,
          },
        },
        material: {
          copied: ["project_definition", "focused_objective"],
          retained_only: [
            "source_project_identity",
            "source_history",
            "source_sources",
            "source_work",
            "source_reviews",
          ],
          limitations: [
            "Only the exact ProjectDefinition and focused Objective are copied. Sources, Work, Review, History, and their authority remain with the source Project.",
          ],
        },
        destination: { place_role: "brief", project_id: project.project_id },
        recorded_at: recordedAt,
      };
      this.#contracts.assertValid(
        "project-import-command-receipt",
        "1.0.0",
        receipt,
      );

      await this.#insertDerivedProject(
        client,
        project,
        projectRecordHash,
        definition,
        definitionRecordHash,
        objective,
        objectiveRecordHash,
      );
      await client.query(
        `INSERT INTO petra.project_import_command_receipts (
           receipt_id, command_id, idempotency_key, request_hash,
           actor_id, actor_kind, source_project_id, source_project_revision,
           source_project_record_hash, source_project_definition_id,
           source_project_definition_revision,
           source_project_definition_content_hash,
           source_project_definition_record_hash, source_objective_id,
           source_objective_revision, source_objective_content_hash,
           source_objective_record_hash, resulting_project_id, schema_name,
           schema_version, record_hash, payload, recorded_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, $19, $20, $21, $22::jsonb,
           $23::timestamptz
         )`,
        [
          receipt.receipt_id,
          receipt.command_id,
          receipt.idempotency_key,
          requestHash,
          actor.actor_id,
          actor.actor_kind,
          receipt.source.project_ref.project_id,
          receipt.source.project_ref.revision,
          receipt.source.project_ref.record_hash,
          receipt.source.project_definition_ref.project_definition_id,
          receipt.source.project_definition_ref.revision,
          receipt.source.project_definition_ref.content_hash,
          receipt.source.project_definition_ref.record_hash,
          receipt.source.focused_objective_ref.objective_id,
          receipt.source.focused_objective_ref.revision,
          receipt.source.focused_objective_ref.content_hash,
          receipt.source.focused_objective_ref.record_hash,
          receipt.result.project_ref.project_id,
          receipt.schema_name,
          receipt.schema_version,
          canonicalHash(receipt),
          JSON.stringify(receipt),
          receipt.recorded_at,
        ],
      );
      return clone(receipt);
    });
  }

  async assessProjectImportCommandRecovery(
    request: PetraProjectImportCommandRequest,
  ): Promise<PetraProjectImportCommandRecoveryView> {
    this.#contracts.assertValid(
      "project-import-command-request",
      "1.0.0",
      request,
    );
    const requestHash = canonicalHash(request);
    return this.#readTransaction(async (client) => {
      const principal = await this.#requirePrincipal(client);
      const retained = await this.#findByIdentity(client, request);
      const exact =
        retained.length === 1 && retained[0]?.request_hash === requestHash
          ? retained[0]
          : undefined;
      const ownedExact =
        exact !== undefined &&
        exact.actor_id === principal.actor_id &&
        exact.actor_kind === principal.actor_kind
          ? this.#receiptFrom(exact.payload)
          : undefined;
      const observationCutoff = this.#now();
      const subject = {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: requestHash,
        source_project_id: request.source.project_id,
      };
      const exactRequest = {
        item: "exact_request" as const,
        identity: requestHash,
        durability: "client_session" as const,
        state: "client_copy_required" as const,
      };
      let content: PetraProjectImportCommandRecoveryView["content"];
      if (ownedExact !== undefined) {
        content = {
          subject,
          effect: {
            state: "effect_confirmed",
            meaning:
              "The exact Project import receipt and ancestry are retained. Repeating the same request returns this receipt without another derived Project.",
            receipt: ownedExact,
          },
          preservation: [
            exactRequest,
            {
              item: "import_receipt",
              identity: ownedExact.receipt_id,
              durability: "postgresql",
              state: "retained",
            },
            {
              item: "source_project",
              identity: ownedExact.source.project_ref.project_id,
              revision: ownedExact.source.project_ref.revision,
              content_hash: ownedExact.source.project_ref.record_hash,
              durability: "postgresql",
              state: "retained",
            },
            {
              item: "source_definition",
              identity:
                ownedExact.source.project_definition_ref.project_definition_id,
              revision: ownedExact.source.project_definition_ref.revision,
              content_hash:
                ownedExact.source.project_definition_ref.content_hash,
              durability: "postgresql",
              state: "retained",
            },
            {
              item: "source_objective",
              identity: ownedExact.source.focused_objective_ref.objective_id,
              revision: ownedExact.source.focused_objective_ref.revision,
              content_hash:
                ownedExact.source.focused_objective_ref.content_hash,
              durability: "postgresql",
              state: "retained",
            },
            {
              item: "derived_project",
              identity: ownedExact.result.project_ref.project_id,
              revision: ownedExact.result.project_ref.revision,
              content_hash: ownedExact.result.project_ref.record_hash,
              durability: "postgresql",
              state: "derived",
            },
          ],
          eligible_actions: [
            {
              operation: "open_derived_project",
              owner: "browser_navigation",
              method: "GET",
              path: `/projects/${ownedExact.result.project_ref.project_id}/brief`,
              input_behavior: "none",
              identity_behavior: "navigate_to_receipt_project",
              reason:
                "The retained receipt supplies the exact derived Project and its Brief destination.",
              success_destination: clone(ownedExact.destination),
              failure_destination: { place_role: "projects" },
              execution_recheck: true,
            },
          ],
          return: {
            state: "exact",
            destination: clone(ownedExact.destination),
            reason:
              "The retained ancestry receipt supplies the exact derived Project Brief.",
          },
          observation_cutoff: observationCutoff,
          limitations: clone(ownedExact.material.limitations),
        };
      } else if (retained.length === 0) {
        const derivedProjectId = derivePetraId("project", request.command_id);
        content = {
          subject,
          effect: {
            state: "outcome_unknown",
            reason: "receipt_not_observed_at_cutoff",
            meaning:
              "No exact import receipt was visible at the observation cutoff. Absence does not prove that no derived Project was created later.",
          },
          preservation: [exactRequest],
          eligible_actions: [
            {
              operation: "retry_exact_command",
              owner: "project_import_command",
              method: "POST",
              path: "/api/commands/projects/import",
              input_behavior: "reuse_exact_request",
              identity_behavior: "reuse_command_and_idempotency",
              reason:
                "Exact idempotent redelivery is eligible; execution rechecks source ownership and every source revision and hash.",
              success_destination: {
                place_role: "brief",
                project_id: derivedProjectId,
              },
              failure_destination: { place_role: "projects" },
              execution_recheck: true,
            },
          ],
          return: {
            state: "safe_fallback",
            destination: { place_role: "projects" },
            reason:
              "No retained receipt supplies a derived Project yet. Return to Projects without implying import success.",
          },
          observation_cutoff: observationCutoff,
          limitations: [
            "This read reconciles only the immutable Project import receipt. A missing receipt is not proof that no later effect occurred.",
          ],
        };
      } else {
        content = {
          subject,
          effect: {
            state: "unavailable_to_verify",
            reason:
              exact === undefined
                ? "command_identity_conflict"
                : "command_not_owned_by_authenticated_actor",
            meaning:
              "The command or idempotency identity cannot be reconciled to this exact authenticated import request. Petra will not expose another request or retry with conflicting identity.",
          },
          preservation: [exactRequest],
          eligible_actions: [],
          return: {
            state: "safe_fallback",
            destination: { place_role: "projects" },
            reason:
              "Return to Projects without exposing or repeating another import request.",
          },
          observation_cutoff: observationCutoff,
          limitations: [
            "Conflicting command contents and results are intentionally undisclosed.",
          ],
        };
      }
      const contentHash = canonicalHash(content);
      const view: PetraProjectImportCommandRecoveryView = {
        schema_name: "petra.project-import-command-recovery-view",
        schema_version: "1.0.0",
        assessment_id: derivePetraId("project_import_recovery", contentHash),
        content,
        content_hash: contentHash,
        read_at: observationCutoff,
      };
      this.#contracts.assertValid(
        "project-import-command-recovery-view",
        "1.0.0",
        view,
      );
      return clone(view);
    });
  }

  async getProjectImportAncestry(
    projectId: string,
  ): Promise<PetraProjectImportCommandReceipt | undefined> {
    return this.#readTransaction(async (client) => {
      const principal = await this.#requirePrincipal(client);
      const result = await client.query<StoredReceiptRow>(
        `SELECT request_hash, actor_id, actor_kind, payload
           FROM petra.project_import_command_receipts
          WHERE resulting_project_id = $1`,
        [projectId],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;
      if (
        row.actor_id !== principal.actor_id ||
        row.actor_kind !== principal.actor_kind
      ) {
        throw new ProjectImportError(
          "PROJECT_IMPORT_COMMAND_DENIED",
          "Only the authenticated derived-Project owner may inspect its import ancestry.",
        );
      }
      return this.#receiptFrom(row.payload);
    });
  }

  async #findByIdentity(
    client: PoolClient,
    request: PetraProjectImportCommandRequest,
  ): Promise<StoredReceiptRow[]> {
    const result = await client.query<StoredReceiptRow>(
      `SELECT request_hash, actor_id, actor_kind, payload
         FROM petra.project_import_command_receipts
        WHERE command_id = $1 OR idempotency_key = $2
        ORDER BY command_id`,
      [request.command_id, request.idempotency_key],
    );
    return result.rows;
  }

  async #requirePrincipal(client: PoolClient): Promise<ProjectImportPrincipal> {
    const principal = this.#principal;
    if (principal === undefined) {
      throw new ProjectImportError(
        "PROJECT_IMPORT_COMMAND_DENIED",
        "The server-authenticated Project importer is not configured.",
      );
    }
    const actor = await client.query(
      `SELECT 1 FROM petra.actors WHERE actor_id = $1 AND actor_kind = $2`,
      [principal.actor_id, principal.actor_kind],
    );
    if (actor.rowCount !== 1) {
      throw new ProjectImportError(
        "PROJECT_IMPORT_COMMAND_DENIED",
        "The server-authenticated Project importer is not registered.",
      );
    }
    return { ...principal };
  }

  async #requireOwnedReceipt(
    client: PoolClient,
    row: StoredReceiptRow,
  ): Promise<void> {
    const principal = await this.#requirePrincipal(client);
    if (
      row.actor_id !== principal.actor_id ||
      row.actor_kind !== principal.actor_kind
    ) {
      throw new ProjectImportError(
        "PROJECT_IMPORT_COMMAND_DENIED",
        "The retained Project import command belongs to another actor.",
      );
    }
  }

  async #requireExactSource(
    client: PoolClient,
    request: PetraProjectImportCommandRequest,
    principal: ProjectImportPrincipal,
  ): Promise<SourceRow> {
    const result = await client.query<SourceRow>(
      `SELECT project.current_revision AS project_revision,
              project_revision.record_hash AS project_record_hash,
              project.created_by_actor_id AS project_created_by_actor_id,
              project.created_by_actor_kind AS project_created_by_actor_kind,
              project_revision.payload AS project_payload,
              definition.current_revision AS definition_revision,
              definition_revision.content_hash AS definition_content_hash,
              definition_revision.record_hash AS definition_record_hash,
              definition_revision.payload AS definition_payload,
              objective_revision.revision AS objective_revision,
              objective_revision.content_hash AS objective_content_hash,
              objective_revision.record_hash AS objective_record_hash,
              objective_revision.payload AS objective_payload
         FROM petra.projects AS project
         JOIN petra.project_revisions AS project_revision
           ON project_revision.project_id = project.project_id
          AND project_revision.revision = project.current_revision
         JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         JOIN petra.project_definition_revisions AS definition_revision
           ON definition_revision.project_definition_id = definition.project_definition_id
          AND definition_revision.revision = definition.current_revision
         JOIN petra.project_objective_focus AS focus
           ON focus.project_id = project.project_id
         JOIN petra.project_objective_revisions AS objective_revision
           ON objective_revision.objective_id = focus.objective_id
          AND objective_revision.revision = focus.objective_revision
          AND objective_revision.content_hash = focus.objective_content_hash
        WHERE project.project_id = $1
        FOR SHARE OF project, definition`,
      [request.source.project_id],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new ProjectImportError(
        "PROJECT_IMPORT_SOURCE_NOT_FOUND",
        "The retained Project, its current definition, or its focused Objective is unavailable.",
      );
    }
    if (
      row.project_created_by_actor_id !== principal.actor_id ||
      row.project_created_by_actor_kind !== principal.actor_kind
    ) {
      throw new ProjectImportError(
        "PROJECT_IMPORT_COMMAND_DENIED",
        "Only the authenticated Project owner may reuse this retained Project.",
      );
    }
    const expected = request.source;
    const exact =
      Number(row.project_revision) === expected.project_revision &&
      (row.definition_payload as PetraProjectDefinition)
        .project_definition_id ===
        expected.project_definition_ref.project_definition_id &&
      Number(row.definition_revision) ===
        expected.project_definition_ref.revision &&
      row.definition_content_hash ===
        expected.project_definition_ref.content_hash &&
      (row.objective_payload as PetraProjectObjective).objective_id ===
        expected.focused_objective_ref.objective_id &&
      Number(row.objective_revision) ===
        expected.focused_objective_ref.revision &&
      row.objective_content_hash ===
        expected.focused_objective_ref.content_hash;
    if (!exact) {
      throw new ProjectImportError(
        "PROJECT_IMPORT_SOURCE_STALE",
        "The retained Project changed after import review. Refresh its exact definition and focused Objective before trying again.",
      );
    }
    const objective = this.#objectiveFrom(row.objective_payload);
    if (
      objective.content.parent_ref !== undefined ||
      objective.content.dependency_refs.length > 0
    ) {
      throw new ProjectImportError(
        "PROJECT_IMPORT_SOURCE_INCOMPATIBLE",
        "This bounded reuse command cannot copy a focused Objective with cross-objective ancestry. No derived Project was created.",
      );
    }
    return row;
  }

  async #insertDerivedProject(
    client: PoolClient,
    project: PetraProject,
    projectRecordHash: string,
    definition: PetraProjectDefinition,
    definitionRecordHash: string,
    objective: PetraProjectObjective,
    objectiveRecordHash: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.projects (
         project_id, current_revision, created_by_actor_id,
         created_by_actor_kind, created_at
       ) VALUES ($1, 1, $2, $3, $4::timestamptz)`,
      [
        project.project_id,
        project.created_by.actor_id,
        project.created_by.actor_kind,
        project.created_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_revisions (
         project_id, revision, schema_name, schema_version, name, description,
         status, visibility, enabled_evidence_namespaces, created_by_actor_id,
         created_by_actor_kind, record_hash, payload, created_at, updated_at
       ) VALUES (
         $1, 1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10, $11,
         $12::jsonb, $13::timestamptz, $14::timestamptz
       )`,
      [
        project.project_id,
        project.schema_name,
        project.schema_version,
        project.name,
        project.description ?? null,
        project.status,
        project.visibility,
        project.enabled_evidence_namespaces,
        project.created_by.actor_id,
        project.created_by.actor_kind,
        projectRecordHash,
        JSON.stringify(project),
        project.created_at,
        project.updated_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_definitions (
         project_definition_id, project_id, definition_family, current_revision
       ) VALUES ($1, $2, $3, 1)`,
      [
        definition.project_definition_id,
        definition.project_id,
        definition.definition_family,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_definition_revisions (
         project_definition_id, revision, project_id, schema_name,
         schema_version, definition_family, origin_kind, content_hash,
         created_by_actor_id, created_by_actor_kind, record_hash, payload,
         created_at
       ) VALUES (
         $1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
         $12::timestamptz
       )`,
      [
        definition.project_definition_id,
        definition.project_id,
        definition.schema_name,
        definition.schema_version,
        definition.definition_family,
        definition.origin.origin_kind,
        definition.content_hash,
        definition.created_by.actor_id,
        definition.created_by.actor_kind,
        definitionRecordHash,
        JSON.stringify(definition),
        definition.created_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_objectives (
         objective_id, project_id, current_revision, created_by_actor_id,
         created_by_actor_kind, created_at
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
         project_definition_content_hash, objective_kind, status, content_hash,
         created_by_actor_id, created_by_actor_kind, record_hash, payload,
         created_at, updated_at
       ) VALUES (
         $1, 1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $10, $11, $12,
         $13::jsonb, $14::timestamptz, $15::timestamptz
       )`,
      [
        objective.objective_id,
        objective.project_id,
        objective.schema_name,
        objective.schema_version,
        objective.project_definition_ref.project_definition_id,
        objective.project_definition_ref.content_hash,
        objective.content.objective_kind,
        objective.content.status,
        objective.content_hash,
        objective.created_by.actor_id,
        objective.created_by.actor_kind,
        objectiveRecordHash,
        JSON.stringify(objective),
        objective.created_at,
        objective.updated_at,
      ],
    );
    for (const table of [
      "petra.project_objective_focus",
      "petra.project_objective_focus_history",
    ]) {
      await client.query(
        `INSERT INTO ${table} (
           project_id, objective_id, objective_revision,
           objective_content_hash, changed_by_actor_id,
           changed_by_actor_kind, changed_at
         ) VALUES ($1, $2, 1, $3, $4, $5, $6::timestamptz)`,
        [
          project.project_id,
          objective.objective_id,
          objective.content_hash,
          objective.created_by.actor_id,
          objective.created_by.actor_kind,
          objective.created_at,
        ],
      );
    }
  }

  #projectFrom(payload: unknown): PetraProject {
    this.#contracts.assertValid("project", "1.0.0", payload);
    return clone(payload as PetraProject);
  }

  #definitionFrom(payload: unknown): PetraProjectDefinition {
    this.#contracts.assertValid("project-definition", "1.0.0", payload);
    const definition = payload as PetraProjectDefinition;
    if (canonicalHash(definition.content) !== definition.content_hash) {
      throw new ProjectImportError(
        "PROJECT_IMPORT_RUNTIME_CORRUPT",
        "The retained source ProjectDefinition content hash is invalid.",
      );
    }
    return clone(definition);
  }

  #objectiveFrom(payload: unknown): PetraProjectObjective {
    this.#contracts.assertValid("project-objective", "1.0.0", payload);
    const objective = payload as PetraProjectObjective;
    if (canonicalHash(objective.content) !== objective.content_hash) {
      throw new ProjectImportError(
        "PROJECT_IMPORT_RUNTIME_CORRUPT",
        "The retained source Objective content hash is invalid.",
      );
    }
    return clone(objective);
  }

  #receiptFrom(payload: unknown): PetraProjectImportCommandReceipt {
    this.#contracts.assertValid(
      "project-import-command-receipt",
      "1.0.0",
      payload,
    );
    return clone(payload as PetraProjectImportCommandReceipt);
  }

  async #transaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await client.query("BEGIN");
        await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
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
      throw new ProjectImportError(
        "PROJECT_IMPORT_RUNTIME_CORRUPT",
        "The Project import transaction exhausted its retry boundary.",
      );
    } finally {
      client.release();
    }
  }

  async #readTransaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
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
