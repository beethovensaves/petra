import { createHash } from "node:crypto";

import type {
  PetraGroundedResponse,
  PetraProjectDefinition,
  PetraProjectInquiryLink,
  PetraProjectObjective,
  PetraSuggestedActionView,
  PetraWorkUnit,
  SuggestedAction,
  SuggestedActionAuthorityPosition,
  SuggestedActionBackgroundWork,
  SuggestedActionReady,
  SuggestedActionStale,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { derivePetraId, type SuggestedActionViewReader } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresSuggestedActionViewErrorCode =
  | "SUGGESTED_ACTION_VIEW_REQUEST_INVALID"
  | "SUGGESTED_ACTION_VIEW_STORED_RECORD_CORRUPT";

export class PostgresSuggestedActionViewError extends Error {
  readonly code: PostgresSuggestedActionViewErrorCode;

  constructor(code: PostgresSuggestedActionViewErrorCode, message: string) {
    super(message);
    this.name = "PostgresSuggestedActionViewError";
    this.code = code;
  }
}

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

const PROJECT_INQUIRY_LINK_ID =
  /^project_inquiry_link_[0-9A-HJKMNP-TV-Z]{26}$/u;
const ACTION_DERIVATION_VERSION = "1.0.0";

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const actionIdFor = (projectInquiryLinkId: string): string =>
  derivePetraId(
    "suggested_action",
    `${projectInquiryLinkId}|inspect_existing_inquiry_result|${ACTION_DERIVATION_VERSION}`,
  );

/**
 * Derives one exact read-only action from an immutable inquiry-result link.
 * The result is a preview only: it neither registers an action ledger nor
 * starts Work. Readiness is recomputed against current retained authority in
 * the same repeatable-read transaction.
 */
export class PostgresSuggestedActionViewReader implements SuggestedActionViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async getSuggestedActionViewForInquiryResult(
    projectId: string,
    projectInquiryLinkId: string,
  ): Promise<PetraSuggestedActionView | undefined> {
    if (!PROJECT_INQUIRY_LINK_ID.test(projectInquiryLinkId)) {
      throw new PostgresSuggestedActionViewError(
        "SUGGESTED_ACTION_VIEW_REQUEST_INVALID",
        "A SuggestedAction preview requires a canonical ProjectInquiryLink identity.",
      );
    }
    return this.#readTransaction(async (client, readAt) => {
      const linkRow = await this.#actionLink(
        client,
        projectId,
        projectInquiryLinkId,
      );
      if (linkRow === undefined) return undefined;
      const link = this.#record<PetraProjectInquiryLink>(
        "project-inquiry-link",
        linkRow,
      );
      const target = link.content.target;
      if (target.target_kind !== "result" || target.bearing !== "addresses") {
        throw this.#corrupt(
          "The initial SuggestedAction adapter requires one exact inquiry-addressing result link.",
        );
      }
      const suggestedActionId = actionIdFor(link.project_inquiry_link_id);

      const definitionRow = await this.#exactDefinition(client, link);
      const definition = this.#record<PetraProjectDefinition>(
        "project-definition",
        definitionRow,
      );
      const objectiveRow = await this.#exactObjective(client, link);
      const objective = this.#record<PetraProjectObjective>(
        "project-objective",
        objectiveRow,
      );
      this.#assertLinkAuthority(link, definition, objective, projectId);

      const responseRow = await this.#exactResponse(client, projectId, target);
      const response = this.#record<PetraGroundedResponse>(
        "grounded-response",
        responseRow,
      );
      if (
        response.project_id !== projectId ||
        response.grounded_response_id !== target.result_ref.record_id ||
        response.revision !== target.result_ref.revision ||
        response.content_hash !== target.result_ref.content_hash
      ) {
        throw this.#corrupt(
          "The linked GroundedResponse does not preserve its exact Project result identity.",
        );
      }

      const backgroundWork = await this.#backgroundWork(
        client,
        projectId,
        target.produced_by_work_ref,
        response,
      );
      const currentDefinitionRow = await this.#currentDefinition(
        client,
        projectId,
      );
      const currentObjectiveRow = await this.#currentObjective(
        client,
        projectId,
        objective.objective_id,
      );
      const readiness = this.#readiness(
        definition,
        definitionRow.record_hash,
        objective,
        objectiveRow.record_hash,
        response,
        currentDefinitionRow,
        currentObjectiveRow,
      );
      const resultRef = {
        schema_name: "petra.grounded-response" as const,
        schema_version: "1.0.0" as const,
        record_id: target.result_ref.record_id,
        revision: target.result_ref.revision,
        content_hash: target.result_ref.content_hash,
        record_hash: target.result_ref.record_hash,
      };
      const objectiveRef = clone(link.content.inquiry_anchor.objective_ref);
      const action: SuggestedAction = {
        action_kind: "inspect_existing_inquiry_result",
        title: "Inspect existing inquiry result",
        objective: {
          objective_ref: objectiveRef,
          semantic_key: link.content.inquiry_anchor.semantic_key,
          statement: objective.content.statement,
        },
        reason:
          "An exact GroundedResponse already addresses this inquiry. Inspect its recorded basis and limitations before deciding whether new Work is warranted.",
        basis: {
          derivation: "exact_immutable_inquiry_result_link",
          project_definition_ref: {
            project_definition_id: definition.project_definition_id,
            revision: definition.revision,
            content_hash: definition.content_hash,
            record_hash: definitionRow.record_hash,
            definition_family: definition.definition_family,
          },
          inquiry_result_link_ref: {
            project_inquiry_link_id: link.project_inquiry_link_id,
            content_hash: link.content_hash,
            record_hash: linkRow.record_hash,
          },
          result_ref: resultRef,
          snapshot_ref: clone(response.content.snapshot_ref),
          ...(target.produced_by_work_ref === undefined
            ? {}
            : { produced_by_work_ref: clone(target.produced_by_work_ref) }),
        },
        scope: {
          scope_kind: "exact_existing_result",
          included:
            "Open the exact linked GroundedResponse in the current inquiry context.",
          excluded: [
            "No new retrieval, model call, or durable Work starts.",
            "No result is promoted to inquiry resolution or scientific authority.",
          ],
        },
        missing_information: [
          "The linked result addresses the inquiry but is not registered as admissible inquiry basis or an accepted finding.",
        ],
        response_depth: {
          allowed: ["current_graph"],
          recommended: "current_graph",
          adjustable: false,
        },
        expected_result: {
          state: "already_available",
          result_kind: "grounded_response",
          result_ref: clone(resultRef),
          authority_effect: "none",
          reusable: response.content.cache.state === "reusable",
        },
        resources: {
          duration: "not_required",
          cost: "not_required",
          basis: "read_only_existing_result",
        },
        capability: {
          capability_key: "petra.project-inquiry.read",
          grant_status: "satisfied_by_authenticated_project_read",
          approval: "not_required",
        },
        interrupt: { expectation: "none" },
        cancellation: {
          consequence: "not_applicable_no_work_started",
        },
        background_work: backgroundWork,
        invocation: {
          kind: "authenticated_read",
          contract_name: "petra.project-inquiry-view",
          contract_version: "1.0.0",
          operation: "get_project_inquiry_detail",
          project_id: projectId,
          objective_ref: clone(objectiveRef),
          place_role: "brief",
          task_intent: "inspect",
          idempotency: "safe_exact_read",
        },
      };
      const content: PetraSuggestedActionView["content"] = {
        view_kind: "preview",
        action_ref: {
          suggested_action_id: suggestedActionId,
          revision: 1,
          content_hash: canonicalHash(action),
        },
        action,
        readiness,
        operation: {
          state: "read_only",
          work_start: "not_performed",
          authority_change: "none",
        },
        authority: await this.#authority(client, projectId),
        limitations: [
          "Version 1.0 derives only exact inspection actions for an existing linked GroundedResponse.",
          "It does not recommend new Work, calculate cross-action priority, invoke a command, or apply a result.",
        ],
      };
      const view: PetraSuggestedActionView = {
        schema_name: "petra.suggested-action-view",
        schema_version: "1.0.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid("suggested-action-view", "1.0.0", view);
      return view;
    });
  }

  async #actionLink(
    client: PoolClient,
    projectId: string,
    projectInquiryLinkId: string,
  ): Promise<StoredRow | undefined> {
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_inquiry_links
        WHERE project_id = $1
          AND project_inquiry_link_id = $2
          AND target_kind = 'result'
        LIMIT 1`,
      [projectId, projectInquiryLinkId],
    );
    return result.rows[0];
  }

  async #exactDefinition(
    client: PoolClient,
    link: PetraProjectInquiryLink,
  ): Promise<StoredRow> {
    const ref = link.content.project_definition_ref;
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_definition_revisions
        WHERE project_id = $1
          AND project_definition_id = $2
          AND revision = $3
          AND content_hash = $4`,
      [
        link.project_id,
        ref.project_definition_id,
        ref.revision,
        ref.content_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt(
        "The SuggestedAction inquiry link lost its exact ProjectDefinition revision.",
      );
    }
    return row;
  }

  async #currentDefinition(
    client: PoolClient,
    projectId: string,
  ): Promise<StoredRow> {
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.project_definitions AS head
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = head.project_definition_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt(
        "The SuggestedAction Project has no current ProjectDefinition authority.",
      );
    }
    return row;
  }

  async #exactObjective(
    client: PoolClient,
    link: PetraProjectInquiryLink,
  ): Promise<StoredRow> {
    const ref = link.content.inquiry_anchor.objective_ref;
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_objective_revisions
        WHERE project_id = $1
          AND objective_id = $2
          AND revision = $3
          AND content_hash = $4
          AND record_hash = $5`,
      [
        link.project_id,
        ref.objective_id,
        ref.revision,
        ref.content_hash,
        ref.record_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt(
        "The SuggestedAction inquiry link lost its exact Objective revision.",
      );
    }
    return row;
  }

  async #currentObjective(
    client: PoolClient,
    projectId: string,
    objectiveId: string,
  ): Promise<StoredRow> {
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.project_objectives AS head
         JOIN petra.project_objective_revisions AS revision
           ON revision.objective_id = head.objective_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.objective_id = $2`,
      [projectId, objectiveId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt(
        "The SuggestedAction Objective has no current retained revision.",
      );
    }
    return row;
  }

  async #exactResponse(
    client: PoolClient,
    projectId: string,
    target: Extract<
      PetraProjectInquiryLink["content"]["target"],
      { target_kind: "result" }
    >,
  ): Promise<StoredRow> {
    const ref = target.result_ref;
    if (
      ref.schema_name !== "petra.grounded-response" ||
      ref.schema_version !== "1.0.0"
    ) {
      throw this.#corrupt(
        "The initial SuggestedAction adapter supports only GroundedResponse results.",
      );
    }
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.grounded_response_revisions
        WHERE project_id = $1
          AND grounded_response_id = $2
          AND revision = $3
          AND content_hash = $4
          AND record_hash = $5`,
      [
        projectId,
        ref.record_id,
        ref.revision,
        ref.content_hash,
        ref.record_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt(
        "The SuggestedAction inquiry link lost its exact GroundedResponse.",
      );
    }
    return row;
  }

  async #backgroundWork(
    client: PoolClient,
    projectId: string,
    workRef: Extract<
      PetraProjectInquiryLink["content"]["target"],
      { target_kind: "result" }
    >["produced_by_work_ref"],
    response: PetraGroundedResponse,
  ): Promise<SuggestedActionBackgroundWork> {
    if (workRef === undefined) {
      return {
        state: "unavailable",
        reason:
          "The immutable inquiry-result link does not declare producing Work.",
      };
    }
    const responseWork = response.content.interaction_ref.work_unit_ref;
    if (
      responseWork.work_unit_id !== workRef.work_unit_id ||
      responseWork.revision !== workRef.revision ||
      responseWork.spec_hash !== workRef.spec_hash
    ) {
      throw this.#corrupt(
        "The GroundedResponse and inquiry-result link disagree about producing Work.",
      );
    }
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.work_unit_revisions
        WHERE project_id = $1
          AND work_unit_id = $2
          AND revision = $3
          AND spec_hash = $4
          AND record_hash = $5`,
      [
        projectId,
        workRef.work_unit_id,
        workRef.revision,
        workRef.spec_hash,
        workRef.record_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt(
        "The SuggestedAction inquiry link lost its exact producing Work revision.",
      );
    }
    const work = this.#record<PetraWorkUnit>("work-unit", row);
    if (
      work.project_id !== projectId ||
      work.work_unit_id !== workRef.work_unit_id ||
      work.revision !== workRef.revision ||
      work.spec_hash !== workRef.spec_hash ||
      work.status.state !== "completed"
    ) {
      throw this.#corrupt(
        "An existing GroundedResponse action requires its exact completed producing Work revision.",
      );
    }
    return {
      state: "completed",
      work_unit_ref: clone(workRef),
      terminal_outcome: work.status.terminal_outcome,
    };
  }

  #assertLinkAuthority(
    link: PetraProjectInquiryLink,
    definition: PetraProjectDefinition,
    objective: PetraProjectObjective,
    projectId: string,
  ): void {
    const definitionRef = link.content.project_definition_ref;
    const objectiveRef = link.content.inquiry_anchor.objective_ref;
    if (
      link.project_id !== projectId ||
      definition.project_id !== projectId ||
      objective.project_id !== projectId ||
      definition.project_definition_id !==
        definitionRef.project_definition_id ||
      definition.revision !== definitionRef.revision ||
      definition.content_hash !== definitionRef.content_hash ||
      objective.objective_id !== objectiveRef.objective_id ||
      objective.revision !== objectiveRef.revision ||
      objective.content_hash !== objectiveRef.content_hash ||
      objective.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      objective.project_definition_ref.revision !== definition.revision ||
      objective.project_definition_ref.content_hash !==
        definition.content_hash ||
      objective.content.objective_kind !==
        link.content.inquiry_anchor.semantic_key
    ) {
      throw this.#corrupt(
        "The SuggestedAction basis does not form one exact ProjectDefinition-bound inquiry.",
      );
    }
  }

  #readiness(
    definition: PetraProjectDefinition,
    definitionRecordHash: string,
    objective: PetraProjectObjective,
    objectiveRecordHash: string,
    response: PetraGroundedResponse,
    currentDefinitionRow: StoredRow,
    currentObjectiveRow: StoredRow,
  ): SuggestedActionReady | SuggestedActionStale {
    const currentDefinition = this.#record<PetraProjectDefinition>(
      "project-definition",
      currentDefinitionRow,
    );
    const currentObjective = this.#record<PetraProjectObjective>(
      "project-objective",
      currentObjectiveRow,
    );
    const missing: string[] = [];
    let reasonCode: Extract<
      SuggestedActionStale,
      { state: "stale" }
    >["reason_code"] = "project_definition_changed";
    if (
      currentDefinition.project_definition_id !==
        definition.project_definition_id ||
      currentDefinition.revision !== definition.revision ||
      currentDefinition.content_hash !== definition.content_hash ||
      currentDefinitionRow.record_hash !== definitionRecordHash
    ) {
      missing.push(
        "Regenerate against the current exact ProjectDefinition revision.",
      );
    }
    if (
      currentObjective.objective_id !== objective.objective_id ||
      currentObjective.revision !== objective.revision ||
      currentObjective.content_hash !== objective.content_hash ||
      currentObjectiveRow.record_hash !== objectiveRecordHash
    ) {
      if (missing.length === 0) reasonCode = "objective_changed";
      missing.push("Regenerate against the current exact Objective revision.");
    }
    if (currentObjective.content.status !== "active") {
      if (missing.length === 0) reasonCode = "objective_inactive";
      missing.push("The exact Objective must be active.");
    }
    if (response.content.cache.state !== "reusable") {
      if (missing.length === 0) reasonCode = "result_invalidated";
      missing.push(
        "The exact GroundedResponse must remain reusable under its recorded dependency state.",
      );
    }
    if (missing.length > 0) {
      return {
        state: "stale",
        reason_code: reasonCode,
        reason:
          "At least one current authority dependency no longer matches the immutable SuggestedAction basis.",
        missing_prerequisites: missing as Extract<
          SuggestedActionStale,
          { state: "stale" }
        >["missing_prerequisites"],
      };
    }
    return {
      state: "ready",
      reason_code: "exact_existing_result_available",
      reason:
        "The exact ProjectDefinition, active objective, immutable inquiry-result link, reusable GroundedResponse, and every declared producing Work revision remain available.",
      missing_prerequisites: [],
    };
  }

  async #authority(
    client: PoolClient,
    projectId: string,
  ): Promise<SuggestedActionAuthorityPosition> {
    const result = await client.query<AuthorityRow>(
      `SELECT authority.event_position,
              stream.current_stream_revision AS stream_revision
         FROM petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = $1
        WHERE authority.singleton`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt("The PostgreSQL authority position is unavailable.");
    }
    return {
      isolation: "repeatable_read",
      event_position: this.#safePosition(row.event_position, "event"),
      stream_revision: this.#safePosition(
        row.stream_revision ?? "0",
        "Project stream revision",
      ),
    };
  }

  #record<Value>(schema: string, row: StoredRow): Value {
    this.#contracts.assertValid(schema, "1.0.0", row.payload);
    if (row.record_hash !== canonicalHash(row.payload)) {
      throw this.#corrupt(
        `The retained ${schema} record hash does not match its payload.`,
      );
    }
    const record = row.payload as { content?: unknown; content_hash?: unknown };
    if (
      record.content !== undefined &&
      record.content_hash !== canonicalHash(record.content)
    ) {
      throw this.#corrupt(
        `The retained ${schema} content hash does not match its payload.`,
      );
    }
    return clone(row.payload as Value);
  }

  #safePosition(value: string | undefined, label: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw this.#corrupt(`${label} is outside Petra's safe range.`);
    }
    return parsed;
  }

  #corrupt(message: string): PostgresSuggestedActionViewError {
    return new PostgresSuggestedActionViewError(
      "SUGGESTED_ACTION_VIEW_STORED_RECORD_CORRUPT",
      message,
    );
  }

  async #readTransaction<Value>(
    operation: (client: PoolClient, readAt: string) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const timestamp = await client.query<{ read_at: Date }>(
        "SELECT transaction_timestamp() AS read_at",
      );
      const readAt = timestamp.rows[0]?.read_at.toISOString();
      if (readAt === undefined) {
        throw new Error("PostgreSQL did not provide a transaction timestamp.");
      }
      const result = await operation(client, readAt);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
