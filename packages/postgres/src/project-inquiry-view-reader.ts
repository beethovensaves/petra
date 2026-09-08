import { createHash } from "node:crypto";

import type {
  PetraGroundedResponse,
  PetraProjectDefinition,
  PetraProjectInquiryLink,
  PetraProjectInquiryRole,
  PetraProjectInquiryView,
  PetraProjectObjective,
  PetraWorkUnit,
  ProjectInquiryTypedRecordRef,
  ProjectInquiryViewAuthorityPosition,
  ProjectInquiryViewCollectionContent,
  ProjectInquiryViewCurrentWork,
  ProjectInquiryViewDetailContent,
  ProjectInquiryViewFramingRevision,
  ProjectInquiryViewRelatedInquiry,
  ProjectInquiryViewResultLink,
  ProjectInquiryViewRoleSummary,
  ProjectInquiryViewSummary,
  ProjectInquiryViewWorkLink,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  ProjectInquiryAuthoredStatus,
  ProjectInquiryCollectionRequest,
  ProjectInquiryViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectInquiryViewErrorCode =
  | "PROJECT_INQUIRY_VIEW_REQUEST_INVALID"
  | "PROJECT_INQUIRY_VIEW_MAPPING_UNAVAILABLE"
  | "PROJECT_INQUIRY_VIEW_DESTINATION_UNSUPPORTED"
  | "PROJECT_INQUIRY_VIEW_STORED_RECORD_CORRUPT";

export class PostgresProjectInquiryViewError extends Error {
  readonly code: PostgresProjectInquiryViewErrorCode;

  constructor(code: PostgresProjectInquiryViewErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectInquiryViewError";
    this.code = code;
  }
}

interface DefinitionRow {
  payload: unknown;
  record_hash: string;
}

interface ObjectiveRow {
  objective_payload: unknown;
  objective_record_hash: string;
  original_payload: unknown;
  original_record_hash: string;
  role_payload: unknown;
  role_record_hash: string;
}

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface CountRow {
  total_count: string;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

interface InquiryLinks {
  workLinks: ProjectInquiryViewWorkLink[];
  resultLinks: ProjectInquiryViewResultLink[];
}

const CURSOR = /^offset:([0-9]{1,9})$/u;
const OBJECTIVE_ID = /^objective_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORK_UNIT_ID = /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u;
const STATUSES: readonly ProjectInquiryAuthoredStatus[] = [
  "active",
  "satisfied",
  "superseded",
  "abandoned",
];

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

export class PostgresProjectInquiryViewReader implements ProjectInquiryViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async listProjectInquiryView(
    projectId: string,
    request: ProjectInquiryCollectionRequest = {},
  ): Promise<PetraProjectInquiryView | undefined> {
    const query = this.#query(request);
    const offset = this.#offset(query.cursor);
    return this.#readTransaction(async (client, readAt) => {
      const definition = await this.#currentDefinition(client, projectId);
      if (definition === undefined) return undefined;
      this.#assertBriefPlace(definition);
      await this.#requireCurrentMapping(client, definition);

      const result = await client.query<ObjectiveRow>(
        `${this.#objectiveSelect()}
          WHERE objective_head.project_id = $1
            AND objective.project_definition_id = $2
            AND objective.project_definition_revision = $3
            AND objective.project_definition_content_hash = $4
            AND ($5::text IS NULL OR objective.status = $5)
            AND (
              $6::text IS NULL
              OR EXISTS (
                SELECT 1
                  FROM petra.project_inquiry_links AS link
                 WHERE link.project_id = objective.project_id
                   AND link.objective_id = objective.objective_id
                   AND (
                     link.work_unit_id = $6
                     OR link.produced_by_work_unit_id = $6
                   )
              )
            )
          ORDER BY objective.updated_at DESC, objective.objective_id
          LIMIT $7 OFFSET $8`,
        [
          projectId,
          definition.project_definition_id,
          definition.revision,
          definition.content_hash,
          query.authored_status ?? null,
          query.work_unit_id ?? null,
          query.limit + 1,
          offset,
        ],
      );
      const hasMore = result.rows.length > query.limit;
      const selected = result.rows.slice(0, query.limit);
      const inquiries: ProjectInquiryViewSummary[] = [];
      for (const row of selected) {
        inquiries.push(await this.#summary(client, definition, row));
      }
      const totalCount = await this.#totalCount(
        client,
        definition,
        query.authored_status,
        query.work_unit_id,
      );
      const content: ProjectInquiryViewCollectionContent = {
        view_kind: "collection",
        project_definition_ref: this.#definitionRef(definition),
        query,
        inquiries,
        page: {
          returned_count: inquiries.length,
          total_count: totalCount,
          has_more: hasMore,
          ...(hasMore
            ? { next_cursor: `offset:${offset + inquiries.length}` }
            : {}),
        },
        operations: [
          {
            operation: "create",
            state: "unavailable",
            reason:
              "Creating inquiry structure has no registered command in this read-only slice.",
          },
        ],
        authority: await this.#authority(client, projectId),
      };
      return this.#view(projectId, content, readAt);
    });
  }

  async getProjectInquiryView(
    projectId: string,
    objectiveId: string,
  ): Promise<PetraProjectInquiryView | undefined> {
    if (!OBJECTIVE_ID.test(objectiveId)) {
      throw new PostgresProjectInquiryViewError(
        "PROJECT_INQUIRY_VIEW_REQUEST_INVALID",
        "A Project inquiry detail request requires a canonical mapped Objective identity.",
      );
    }
    return this.#readTransaction(async (client, readAt) => {
      const definition = await this.#currentDefinition(client, projectId);
      if (definition === undefined) return undefined;
      this.#assertBriefPlace(definition);
      await this.#requireCurrentMapping(client, definition);
      const result = await client.query<ObjectiveRow>(
        `${this.#objectiveSelect()}
          WHERE objective_head.project_id = $1
            AND objective.objective_id = $2
            AND objective.project_definition_id = $3
            AND objective.project_definition_revision = $4
            AND objective.project_definition_content_hash = $5`,
        [
          projectId,
          objectiveId,
          definition.project_definition_id,
          definition.revision,
          definition.content_hash,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;
      const records = this.#records(definition, row);
      const links = await this.#links(
        client,
        projectId,
        records.objective.objective_id,
      );
      const summary = await this.#summary(client, definition, row, links);
      const history = await this.#history(
        client,
        projectId,
        records.objective.objective_id,
        records.role.content.role_semantic_key,
      );
      const related = await this.#related(client, records.objective);
      const content: ProjectInquiryViewDetailContent = {
        view_kind: "detail",
        project_definition_ref: this.#definitionRef(definition),
        summary,
        framing_history: [history[0]!, ...history.slice(1)],
        related_inquiries: related,
        open_questions:
          records.objective.content.status === "active"
            ? {
                state: "available",
                items: [records.objective.content.statement],
                basis: "authored_active_framing",
              }
            : {
                state: "unavailable",
                reason:
                  "The exact authored Objective status does not identify this framing as active.",
              },
        current_understanding: {
          state: "unavailable",
          reason: "No registered inquiry-understanding assessment exists.",
        },
        basis: {
          state: "unavailable",
          reason:
            "Addressing results do not become admissible inquiry basis without a registered authority adapter.",
        },
        work_links: links.workLinks,
        result_links: links.resultLinks,
        recommendation: {
          state: "unavailable",
          reason:
            "No registered recommendation record owns inquiry priority or reasoning advice.",
        },
        coverage: [
          { area: "identity", state: "complete" },
          { area: "framing", state: "complete" },
          { area: "relationships", state: "complete" },
          {
            area: "open_questions",
            state: "partial",
            limitation:
              "Only the authored active framing is available as an open question.",
          },
          {
            area: "understanding",
            state: "unavailable",
            limitation: "No inquiry-understanding assessment is registered.",
          },
          {
            area: "basis",
            state: "unavailable",
            limitation: "No admissible inquiry-basis adapter is registered.",
          },
          { area: "work", state: "complete" },
          { area: "results", state: "complete" },
          {
            area: "recommendation",
            state: "unavailable",
            limitation: "No recommendation authority is registered.",
          },
          {
            area: "commands",
            state: "unavailable",
            limitation: "This is a read-only slice.",
          },
        ],
        operations: [
          {
            operation: "revise",
            state: "unavailable",
            reason: "Inquiry revision has no registered command in this slice.",
          },
          {
            operation: "focus",
            state: "unavailable",
            reason: "Inquiry focus remains navigation-only in this slice.",
          },
          {
            operation: "link_work",
            state: "unavailable",
            reason:
              "Work linkage has no registered command in this read-only slice.",
          },
          {
            operation: "unlink",
            state: "unavailable",
            reason: "Link retention disposition is not implemented.",
          },
        ],
        authority: await this.#authority(client, projectId),
      };
      return this.#view(projectId, content, readAt);
    });
  }

  #objectiveSelect(): string {
    return `SELECT objective.payload AS objective_payload,
                   objective.record_hash AS objective_record_hash,
                   original.payload AS original_payload,
                   original.record_hash AS original_record_hash,
                   role.payload AS role_payload,
                   role.record_hash AS role_record_hash
              FROM petra.project_objectives AS objective_head
              JOIN petra.project_objective_revisions AS objective
                ON objective.objective_id = objective_head.objective_id
               AND objective.revision = objective_head.current_revision
              JOIN petra.project_objective_revisions AS original
                ON original.objective_id = objective_head.objective_id
               AND original.revision = 1
              JOIN petra.project_inquiry_roles AS role_head
                ON role_head.project_id = objective.project_id
              JOIN petra.project_inquiry_role_revisions AS role
                ON role.project_inquiry_role_id
                     = role_head.project_inquiry_role_id
               AND role.revision = role_head.current_revision
               AND role.status = 'active'
               AND role.objective_kind = objective.objective_kind
               AND role.project_definition_id
                     = objective.project_definition_id
               AND role.project_definition_revision
                     = objective.project_definition_revision
               AND role.project_definition_content_hash
                     = objective.project_definition_content_hash`;
  }

  #query(request: ProjectInquiryCollectionRequest) {
    const limit = request.limit ?? 50;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new PostgresProjectInquiryViewError(
        "PROJECT_INQUIRY_VIEW_REQUEST_INVALID",
        "Project inquiry collection limit must be an integer from 1 through 100.",
      );
    }
    if (request.cursor !== undefined && !CURSOR.test(request.cursor)) {
      throw new PostgresProjectInquiryViewError(
        "PROJECT_INQUIRY_VIEW_REQUEST_INVALID",
        "Project inquiry collection cursor is invalid.",
      );
    }
    if (
      request.authored_status !== undefined &&
      !STATUSES.includes(request.authored_status)
    ) {
      throw new PostgresProjectInquiryViewError(
        "PROJECT_INQUIRY_VIEW_REQUEST_INVALID",
        "Project inquiry authored status is invalid.",
      );
    }
    if (
      request.work_unit_id !== undefined &&
      !WORK_UNIT_ID.test(request.work_unit_id)
    ) {
      throw new PostgresProjectInquiryViewError(
        "PROJECT_INQUIRY_VIEW_REQUEST_INVALID",
        "Project inquiry Work filter requires a canonical WorkUnit identity.",
      );
    }
    return {
      limit,
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
      ...(request.authored_status === undefined
        ? {}
        : { authored_status: request.authored_status }),
      ...(request.work_unit_id === undefined
        ? {}
        : { work_unit_id: request.work_unit_id }),
    };
  }

  #offset(cursor: string | undefined): number {
    if (cursor === undefined) return 0;
    const parsed = Number(CURSOR.exec(cursor)?.[1]);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new PostgresProjectInquiryViewError(
        "PROJECT_INQUIRY_VIEW_REQUEST_INVALID",
        "Project inquiry collection cursor is outside Petra's safe range.",
      );
    }
    return parsed;
  }

  async #currentDefinition(
    client: PoolClient,
    projectId: string,
  ): Promise<PetraProjectDefinition | undefined> {
    const result = await client.query<DefinitionRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.projects AS project
         JOIN petra.project_definitions AS head
           ON head.project_id = project.project_id
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = head.project_definition_id
          AND revision.revision = head.current_revision
        WHERE project.project_id = $1`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    this.#contracts.assertValid("project-definition", "1.0.0", row.payload);
    const definition = row.payload as PetraProjectDefinition;
    if (
      definition.project_id !== projectId ||
      definition.content_hash !== canonicalHash(definition.content) ||
      row.record_hash !== canonicalHash(definition)
    ) {
      throw this.#corrupt(
        "The current ProjectDefinition cannot be reproduced exactly.",
      );
    }
    return clone(definition);
  }

  #assertBriefPlace(definition: PetraProjectDefinition): void {
    if (!definition.content.supported_places.includes("brief")) {
      throw new PostgresProjectInquiryViewError(
        "PROJECT_INQUIRY_VIEW_DESTINATION_UNSUPPORTED",
        `ProjectDefinition ${definition.project_definition_id} does not register the Brief place used by inquiry destinations.`,
      );
    }
  }

  async #requireCurrentMapping(
    client: PoolClient,
    definition: PetraProjectDefinition,
  ): Promise<void> {
    const result = await client.query<CountRow>(
      `SELECT count(*)::text AS total_count
         FROM petra.project_inquiry_roles AS head
         JOIN petra.project_inquiry_role_revisions AS role
           ON role.project_inquiry_role_id = head.project_inquiry_role_id
          AND role.revision = head.current_revision
        WHERE head.project_id = $1
          AND role.status = 'active'
          AND role.project_definition_id = $2
          AND role.project_definition_revision = $3
          AND role.project_definition_content_hash = $4`,
      [
        definition.project_id,
        definition.project_definition_id,
        definition.revision,
        definition.content_hash,
      ],
    );
    if (this.#safePosition(result.rows[0]?.total_count, "mapping count") < 1) {
      throw new PostgresProjectInquiryViewError(
        "PROJECT_INQUIRY_VIEW_MAPPING_UNAVAILABLE",
        "The current ProjectDefinition has no active registered inquiry-role mapping.",
      );
    }
  }

  #records(
    definition: PetraProjectDefinition,
    row: ObjectiveRow,
  ): {
    objective: PetraProjectObjective;
    original: PetraProjectObjective;
    role: PetraProjectInquiryRole;
  } {
    const objective = this.#objectiveFrom(
      row.objective_payload,
      row.objective_record_hash,
    );
    const original = this.#objectiveFrom(
      row.original_payload,
      row.original_record_hash,
    );
    const role = this.#roleFrom(row.role_payload, row.role_record_hash);
    if (
      objective.project_id !== definition.project_id ||
      original.project_id !== definition.project_id ||
      objective.objective_id !== original.objective_id ||
      original.revision !== 1 ||
      objective.content.objective_kind !== role.content.role_semantic_key ||
      original.content.objective_kind !== role.content.role_semantic_key ||
      role.content.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      role.content.project_definition_ref.revision !== definition.revision ||
      role.content.project_definition_ref.content_hash !==
        definition.content_hash ||
      objective.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      objective.project_definition_ref.revision !== definition.revision ||
      objective.project_definition_ref.content_hash !== definition.content_hash
    ) {
      throw this.#corrupt(
        "The mapped Objective, original framing, role, and ProjectDefinition do not form one exact inquiry.",
      );
    }
    return { objective, original, role };
  }

  async #summary(
    client: PoolClient,
    definition: PetraProjectDefinition,
    row: ObjectiveRow,
    composedLinks?: InquiryLinks,
  ): Promise<ProjectInquiryViewSummary> {
    const { objective, original, role } = this.#records(definition, row);
    const links =
      composedLinks ??
      (await this.#links(client, objective.project_id, objective.objective_id));
    const objectiveRef = this.#objectiveRef(
      objective,
      row.objective_record_hash,
    );
    const term = definition.content.terms.find(
      (candidate) => candidate.semantic_key === role.content.role_semantic_key,
    );
    if (term === undefined || term.generic_family !== "focus") {
      throw this.#corrupt(
        "The inquiry role has no matching focus term in its ProjectDefinition.",
      );
    }
    const operational = { active: 0, completed: 0, cancelled: 0 };
    for (const work of links.workLinks) {
      if (work.current_work.state === "completed") operational.completed += 1;
      else if (work.current_work.state === "cancelled")
        operational.cancelled += 1;
      else operational.active += 1;
    }
    return {
      role: this.#roleSummary(role, row.role_record_hash, term),
      inquiry_anchor_ref: objectiveRef,
      original_framing: original.content.statement,
      current_framing: objective.content.statement,
      authored_status: objective.content.status,
      resolution_boundary: "authored_status_only",
      ...(objective.content.parent_ref === undefined
        ? {}
        : {
            parent_ref: await this.#exactObjectiveRef(
              client,
              objective.project_id,
              objective.content.parent_ref,
            ),
          }),
      dependency_count: objective.content.dependency_refs.length,
      linked_work_count: links.workLinks.length,
      linked_result_count: links.resultLinks.length,
      operational_work: operational,
      destination: { role: "brief", objective_ref: clone(objectiveRef) },
      updated_at: objective.updated_at,
    };
  }

  #roleSummary(
    role: PetraProjectInquiryRole,
    recordHash: string,
    term: PetraProjectDefinition["content"]["terms"][number],
  ): ProjectInquiryViewRoleSummary {
    return {
      role_ref: {
        project_inquiry_role_id: role.project_inquiry_role_id,
        revision: role.revision,
        content_hash: role.content_hash,
        record_hash: recordHash,
      },
      semantic_key: role.content.role_semantic_key,
      singular: term.singular,
      plural: term.plural,
      representation_kind: role.content.representation.representation_kind,
    };
  }

  async #links(
    client: PoolClient,
    projectId: string,
    objectiveId: string,
  ): Promise<InquiryLinks> {
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_inquiry_links
        WHERE project_id = $1 AND objective_id = $2
        ORDER BY created_at, project_inquiry_link_id`,
      [projectId, objectiveId],
    );
    const workLinks: ProjectInquiryViewWorkLink[] = [];
    const resultLinks: ProjectInquiryViewResultLink[] = [];
    for (const row of result.rows) {
      const link = this.#linkFrom(row);
      if (link.project_id !== projectId) {
        throw this.#corrupt("An inquiry link escaped its Project scope.");
      }
      const linkRef = {
        project_inquiry_link_id: link.project_inquiry_link_id,
        content_hash: link.content_hash,
        record_hash: row.record_hash,
      };
      const target = link.content.target;
      if (target.target_kind === "work") {
        const current = await this.#currentWork(
          client,
          projectId,
          target.work_unit_ref.work_unit_id,
        );
        workLinks.push({
          link_ref: linkRef,
          relationship: target.relationship,
          linked_work_ref: clone(target.work_unit_ref),
          current_work: current,
        });
      } else {
        await this.#assertResult(client, projectId, target.result_ref);
        resultLinks.push({
          link_ref: linkRef,
          bearing: target.bearing,
          result_ref: clone(target.result_ref),
          ...(target.produced_by_work_ref === undefined
            ? {}
            : {
                produced_by_work_ref: clone(target.produced_by_work_ref),
              }),
          authority_statement:
            target.bearing === "addresses"
              ? "This result addresses the inquiry; it does not supply admissible basis, an accepted finding, or inquiry resolution."
              : target.bearing === "admissible_basis"
                ? "A registered authority adapter identifies this result as admissible inquiry basis; it does not by itself resolve the inquiry."
                : "A separate authoritative finding record bears on this inquiry; Work completion alone did not create that authority.",
        });
      }
    }
    return { workLinks, resultLinks };
  }

  async #currentWork(
    client: PoolClient,
    projectId: string,
    workUnitId: string,
  ): Promise<ProjectInquiryViewCurrentWork> {
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.work_units AS head
         JOIN petra.work_unit_revisions AS revision
           ON revision.work_unit_id = head.work_unit_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1 AND head.work_unit_id = $2`,
      [projectId, workUnitId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt("A linked WorkUnit has no current exact revision.");
    }
    this.#contracts.assertValid("work-unit", "1.0.0", row.payload);
    const work = row.payload as PetraWorkUnit;
    if (
      work.project_id !== projectId ||
      work.spec_hash !== canonicalHash(work.spec) ||
      row.record_hash !== canonicalHash(work)
    ) {
      throw this.#corrupt(
        "A linked current WorkUnit failed stored-record validation.",
      );
    }
    return {
      work_unit_ref: {
        work_unit_id: work.work_unit_id,
        revision: work.revision,
        spec_hash: work.spec_hash,
        record_hash: row.record_hash,
      },
      state: work.status.state,
      ...("terminal_outcome" in work.status
        ? { terminal_outcome: work.status.terminal_outcome }
        : {}),
      updated_at: work.updated_at,
    };
  }

  async #assertResult(
    client: PoolClient,
    projectId: string,
    ref: ProjectInquiryTypedRecordRef,
  ): Promise<void> {
    if (
      ref.schema_name !== "petra.grounded-response" ||
      ref.schema_version !== "1.0.0"
    ) {
      throw this.#corrupt(
        "The initial inquiry view encountered an unsupported result adapter.",
      );
    }
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.grounded_response_revisions
        WHERE project_id = $1 AND grounded_response_id = $2
          AND revision = $3 AND content_hash = $4 AND record_hash = $5`,
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
      throw this.#corrupt("An exact linked result record is unavailable.");
    }
    this.#contracts.assertValid("grounded-response", "1.0.0", row.payload);
    const response = row.payload as PetraGroundedResponse;
    if (
      response.project_id !== projectId ||
      response.content_hash !== canonicalHash(response.content) ||
      row.record_hash !== canonicalHash(response)
    ) {
      throw this.#corrupt(
        "A linked GroundedResponse failed stored-record validation.",
      );
    }
  }

  async #history(
    client: PoolClient,
    projectId: string,
    objectiveId: string,
    semanticKey: string,
  ): Promise<ProjectInquiryViewFramingRevision[]> {
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_objective_revisions
        WHERE project_id = $1 AND objective_id = $2
        ORDER BY revision`,
      [projectId, objectiveId],
    );
    if (result.rows.length < 1) {
      throw this.#corrupt("The inquiry framing history is empty.");
    }
    return result.rows.map((row) => {
      const objective = this.#objectiveFrom(row.payload, row.record_hash);
      if (objective.content.objective_kind !== semanticKey) {
        throw this.#corrupt(
          "A mapped inquiry Objective changed its semantic kind across revisions.",
        );
      }
      return {
        objective_ref: this.#objectiveRef(objective, row.record_hash),
        statement: objective.content.statement,
        authored_status: objective.content.status,
        updated_at: objective.updated_at,
      };
    });
  }

  async #related(
    client: PoolClient,
    objective: PetraProjectObjective,
  ): Promise<ProjectInquiryViewRelatedInquiry[]> {
    const related: ProjectInquiryViewRelatedInquiry[] = [];
    if (objective.content.parent_ref !== undefined) {
      const parent = await this.#objectiveByRef(
        client,
        objective.project_id,
        objective.content.parent_ref,
      );
      related.push({
        relationship: "parent",
        objective_ref: this.#objectiveRef(parent.objective, parent.recordHash),
        framing: parent.objective.content.statement,
        authored_status: parent.objective.content.status,
      });
    }
    for (const dependencyRef of objective.content.dependency_refs) {
      const dependency = await this.#objectiveByRef(
        client,
        objective.project_id,
        dependencyRef,
      );
      related.push({
        relationship: "dependency",
        objective_ref: this.#objectiveRef(
          dependency.objective,
          dependency.recordHash,
        ),
        framing: dependency.objective.content.statement,
        authored_status: dependency.objective.content.status,
      });
    }
    return related;
  }

  async #exactObjectiveRef(
    client: PoolClient,
    projectId: string,
    ref: { objective_id: string; revision: number; content_hash: string },
  ) {
    const record = await this.#objectiveByRef(client, projectId, ref);
    return this.#objectiveRef(record.objective, record.recordHash);
  }

  async #objectiveByRef(
    client: PoolClient,
    projectId: string,
    ref: { objective_id: string; revision: number; content_hash: string },
  ): Promise<{ objective: PetraProjectObjective; recordHash: string }> {
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_objective_revisions
        WHERE project_id = $1 AND objective_id = $2
          AND revision = $3 AND content_hash = $4`,
      [projectId, ref.objective_id, ref.revision, ref.content_hash],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt("A related exact Objective is unavailable.");
    }
    return {
      objective: this.#objectiveFrom(row.payload, row.record_hash),
      recordHash: row.record_hash,
    };
  }

  #objectiveFrom(payload: unknown, recordHash: string): PetraProjectObjective {
    this.#contracts.assertValid("project-objective", "1.0.0", payload);
    const objective = payload as PetraProjectObjective;
    if (
      objective.content_hash !== canonicalHash(objective.content) ||
      recordHash !== canonicalHash(objective)
    ) {
      throw this.#corrupt(
        "A stored ProjectObjective failed exact record validation.",
      );
    }
    return clone(objective);
  }

  #roleFrom(payload: unknown, recordHash: string): PetraProjectInquiryRole {
    this.#contracts.assertValid("project-inquiry-role", "1.0.0", payload);
    const role = payload as PetraProjectInquiryRole;
    if (
      role.content_hash !== canonicalHash(role.content) ||
      recordHash !== canonicalHash(role) ||
      role.content.status !== "active"
    ) {
      throw this.#corrupt(
        "A stored current Project inquiry role failed exact validation.",
      );
    }
    return clone(role);
  }

  #linkFrom(row: StoredRow): PetraProjectInquiryLink {
    this.#contracts.assertValid("project-inquiry-link", "1.0.0", row.payload);
    const link = row.payload as PetraProjectInquiryLink;
    if (
      link.content_hash !== canonicalHash(link.content) ||
      row.record_hash !== canonicalHash(link)
    ) {
      throw this.#corrupt(
        "A stored Project inquiry link failed exact validation.",
      );
    }
    return clone(link);
  }

  #objectiveRef(objective: PetraProjectObjective, recordHash: string) {
    return {
      objective_id: objective.objective_id,
      revision: objective.revision,
      content_hash: objective.content_hash,
      record_hash: recordHash,
    };
  }

  async #totalCount(
    client: PoolClient,
    definition: PetraProjectDefinition,
    status: ProjectInquiryAuthoredStatus | undefined,
    workUnitId: string | undefined,
  ): Promise<number> {
    const result = await client.query<CountRow>(
      `SELECT count(*)::text AS total_count
         FROM petra.project_objectives AS objective_head
         JOIN petra.project_objective_revisions AS objective
           ON objective.objective_id = objective_head.objective_id
          AND objective.revision = objective_head.current_revision
         JOIN petra.project_inquiry_roles AS role_head
           ON role_head.project_id = objective.project_id
         JOIN petra.project_inquiry_role_revisions AS role
           ON role.project_inquiry_role_id = role_head.project_inquiry_role_id
          AND role.revision = role_head.current_revision
          AND role.status = 'active'
          AND role.objective_kind = objective.objective_kind
          AND role.project_definition_id = objective.project_definition_id
          AND role.project_definition_revision
                = objective.project_definition_revision
          AND role.project_definition_content_hash
                = objective.project_definition_content_hash
        WHERE objective_head.project_id = $1
          AND objective.project_definition_id = $2
          AND objective.project_definition_revision = $3
          AND objective.project_definition_content_hash = $4
          AND ($5::text IS NULL OR objective.status = $5)
          AND (
            $6::text IS NULL
            OR EXISTS (
              SELECT 1
                FROM petra.project_inquiry_links AS link
               WHERE link.project_id = objective.project_id
                 AND link.objective_id = objective.objective_id
                 AND (
                   link.work_unit_id = $6
                   OR link.produced_by_work_unit_id = $6
                 )
            )
          )`,
      [
        definition.project_id,
        definition.project_definition_id,
        definition.revision,
        definition.content_hash,
        status ?? null,
        workUnitId ?? null,
      ],
    );
    return this.#safePosition(result.rows[0]?.total_count, "inquiry total");
  }

  #definitionRef(definition: PetraProjectDefinition) {
    return {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      definition_family: definition.definition_family,
    };
  }

  async #authority(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectInquiryViewAuthorityPosition> {
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

  #safePosition(value: string | undefined, label: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw this.#corrupt(`${label} is outside Petra's safe range.`);
    }
    return parsed;
  }

  #view(
    projectId: string,
    content: PetraProjectInquiryView["content"],
    readAt: string,
  ): PetraProjectInquiryView {
    const view: PetraProjectInquiryView = {
      schema_name: "petra.project-inquiry-view",
      schema_version: "1.0.0",
      project_id: projectId,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid("project-inquiry-view", "1.0.0", view);
    return view;
  }

  #corrupt(message: string): PostgresProjectInquiryViewError {
    return new PostgresProjectInquiryViewError(
      "PROJECT_INQUIRY_VIEW_STORED_RECORD_CORRUPT",
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
