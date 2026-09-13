import { createHash } from "node:crypto";

import type {
  PetraActor,
  PetraApproval,
  PetraAssertion,
  PetraChangeSetRecord,
  PetraClaim,
  PetraControlledWritingGoverningRelationship,
  PetraControlledWritingRequirement,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectReviewViewRecord,
  PetraProjectReviewViewV130,
  PetraProjectReviewViewV120,
  PetraProjectSource,
  PetraProjectReviewView,
  PetraProjectionCheckpoint,
  PetraReviewSessionRecord,
  PetraReviewSessionV110,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  ProjectReviewChangeSetSummaryV110,
  ProjectReviewChangeSetSummary,
  ProjectReviewCommandTraceV110,
  ProjectReviewEventTraceV110,
  ProjectReviewMemberV110,
  ProjectReviewMemberV130,
  ProjectReviewMember,
  ProjectReviewProjectionStateV110,
  ProjectReviewSessionSummaryV120,
  ProjectReviewValidationSummary,
  ProjectReviewViewContentV120,
  ProjectReviewViewContentV130,
  ProjectReviewViewContent,
  ReviewSessionMemberV110,
  ReviewSessionMember,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ProjectReviewViewReader } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectReviewViewErrorCode =
  | "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT"
  | "PROJECT_REVIEW_VIEW_DEFINITION_MISMATCH"
  | "PROJECT_REVIEW_VIEW_RENDERER_UNSUPPORTED";

export class PostgresProjectReviewViewError extends Error {
  readonly code: PostgresProjectReviewViewErrorCode;

  constructor(code: PostgresProjectReviewViewErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectReviewViewError";
    this.code = code;
  }
}

interface SessionRow {
  review_session_id: string;
  session_payload: unknown;
  session_record_hash: string;
  definition_payload: unknown;
  objective_payload: unknown;
  responsible_payload: unknown;
}

interface EvidenceRow {
  payload: unknown;
  record_hash: string;
}

interface BasisRow {
  source_span_payload: unknown;
  source_span_record_hash: string;
  structural_block_payload: unknown;
  structural_block_record_hash: string;
  project_source_id: string;
  source_status: "active" | "excluded";
}

interface ChangeSetRow {
  payload: unknown;
  record_hash: string;
  current_state: ProjectReviewChangeSetSummary["state"];
  approval_payload: unknown;
  approval_record_hash: string | null;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

interface PayloadRow {
  payload: unknown;
}

interface WorkingRecordRow {
  payload: unknown;
  record_hash: string;
}

interface ControlledWritingSourceRow extends WorkingRecordRow {
  status: "active" | "excluded";
  source_role: string;
}

interface CommandTraceRow {
  command_id: string;
  command_name: ProjectReviewCommandTraceV110["command_name"];
  command_fingerprint: string;
  outcome_kind: ProjectReviewCommandTraceV110["outcome"];
  submitted_at: Date;
  completed_at: Date;
  error_code: string | null;
  error_message: string | null;
  envelope: unknown;
}

interface EventTraceRow {
  event_id: string;
  event_type: ProjectReviewEventTraceV110["event_type"];
  event_position: string;
  stream_revision: string;
  command_id: string;
  record_hash: string;
  recorded_at: Date;
  payload: unknown;
}

interface CheckpointRow {
  payload: unknown;
  record_hash: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const workingContentHash = (value: { content_hash: string }): string => {
  const projection = clone(value) as Record<string, unknown>;
  delete projection.content_hash;
  return canonicalHash(projection);
};

const clone = <Value>(value: Value): Value => structuredClone(value);

const titleCase = (value: string): string =>
  value
    .split("_")
    .map((part) => `${part.slice(0, 1).toLocaleUpperCase()}${part.slice(1)}`)
    .join(" ");

const originLabel = (
  kind: PetraReviewSessionRecord["content"]["origin"]["origin_kind"],
): string =>
  ({
    direct_edit: "Direct author edit",
    evidence_extraction: "Evidence extraction",
    work_result: "Work result",
    interaction: "Project interaction",
    history_reversal: "History reversal",
  })[kind];

export class PostgresProjectReviewViewReader implements ProjectReviewViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async listProjectReviewViews(
    projectId: string,
  ): Promise<PetraProjectReviewViewRecord[]> {
    return this.#readTransaction(async (client, readAt) => {
      const rows = await this.#selectSessionRows(client, projectId);
      const views: PetraProjectReviewViewRecord[] = [];
      for (const row of rows) {
        views.push(await this.#compose(client, row, readAt));
      }
      return views;
    });
  }

  async getProjectReviewView(
    projectId: string,
    reviewSessionId: string,
  ): Promise<PetraProjectReviewViewRecord | undefined> {
    return this.#readTransaction(async (client, readAt) => {
      const rows = await this.#selectSessionRows(
        client,
        projectId,
        reviewSessionId,
      );
      return rows[0] === undefined
        ? undefined
        : await this.#compose(client, rows[0], readAt);
    });
  }

  /** Internal composition seam: caller owns a REPEATABLE READ READ ONLY transaction. */
  async readReviewInSnapshot(
    client: PoolClient,
    readAt: string,
    projectId: string,
    reviewSessionId: string,
  ): Promise<
    | { session: PetraReviewSessionRecord; view: PetraProjectReviewViewRecord }
    | undefined
  > {
    const rows = await this.#selectSessionRows(
      client,
      projectId,
      reviewSessionId,
    );
    const row = rows[0];
    return row === undefined
      ? undefined
      : {
          session: this.#reviewSession(row.session_payload),
          view: await this.#compose(client, row, readAt),
        };
  }

  async #selectSessionRows(
    client: PoolClient,
    projectId: string,
    reviewSessionId?: string,
  ): Promise<SessionRow[]> {
    const result = await client.query<SessionRow>(
      `SELECT session.review_session_id,
              revision.payload AS session_payload,
              revision.record_hash AS session_record_hash,
              definition.payload AS definition_payload,
              objective.payload AS objective_payload,
              responsible.payload AS responsible_payload
         FROM petra.review_sessions AS session
         JOIN petra.review_session_revisions AS revision
           ON revision.review_session_id = session.review_session_id
          AND revision.revision = session.current_revision
         JOIN petra.project_definition_revisions AS definition
           ON definition.project_id = revision.project_id
          AND definition.project_definition_id = revision.project_definition_id
          AND definition.revision = revision.project_definition_revision
          AND definition.content_hash = revision.project_definition_content_hash
         LEFT JOIN petra.project_objective_revisions AS objective
           ON objective.project_id = revision.project_id
          AND objective.objective_id = revision.objective_id
          AND objective.revision = revision.objective_revision
          AND objective.content_hash = revision.objective_content_hash
         JOIN petra.actors AS responsible
           ON responsible.actor_id = revision.responsible_actor_id
          AND responsible.actor_kind = revision.responsible_actor_kind
        WHERE session.project_id = $1
          AND ($2::text IS NULL OR session.review_session_id = $2)
        ORDER BY CASE revision.lifecycle
                   WHEN 'open' THEN 0
                   WHEN 'deferred' THEN 1
                   ELSE 2
                 END,
                 revision.updated_at DESC,
                 session.review_session_id`,
      [projectId, reviewSessionId ?? null],
    );
    return result.rows;
  }

  async #compose(
    client: PoolClient,
    row: SessionRow,
    readAt: string,
  ): Promise<PetraProjectReviewViewRecord> {
    const session = this.#reviewSession(row.session_payload);
    const definition = this.#record<PetraProjectDefinition>(
      "project-definition",
      "1.0.0",
      row.definition_payload,
    );
    const responsible = this.#record<PetraActor>(
      "actor",
      "1.0.0",
      row.responsible_payload,
    );
    const objective =
      row.objective_payload === null
        ? undefined
        : this.#record<PetraProjectObjective>(
            "project-objective",
            "1.0.0",
            row.objective_payload,
          );
    if (
      row.session_record_hash !== canonicalHash(session) ||
      session.content_hash !== canonicalHash(session.content) ||
      definition.content_hash !== canonicalHash(definition.content) ||
      objective?.content_hash !==
        (objective === undefined
          ? undefined
          : canonicalHash(objective.content)) ||
      session.project_id !== definition.project_id ||
      (objective !== undefined && objective.project_id !== session.project_id)
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The Review-session composition contains a corrupt or cross-Project authority record.",
      );
    }

    const authority = await this.#authorityPosition(client, session.project_id);
    const members = await Promise.all(
      session.content.members.map((member) =>
        session.schema_version === "1.1.0"
          ? this.#workingMember(
              client,
              session,
              definition,
              member as ReviewSessionMemberV110,
              authority.stream_revision,
            )
          : this.#member(
              client,
              session,
              definition,
              member,
              authority.stream_revision,
            ),
      ),
    );
    const status = this.#sessionStatus(session, members);
    const sessionSummary: ProjectReviewViewContent["session"] = {
      revision: session.revision,
      content_hash: session.content_hash,
      title: session.content.title,
      objective_summary: session.content.objective_summary,
      ...(objective === undefined
        ? {}
        : {
            objective: {
              objective_ref: {
                record_id: objective.objective_id,
                revision: objective.revision,
                content_hash: objective.content_hash,
              },
              objective_kind: objective.content.objective_kind,
              statement: objective.content.statement,
            },
          }),
      status,
      status_label:
        status === "needs_decision"
          ? "Needs your decision"
          : status === "waiting"
            ? "Waiting"
            : "Completed",
      responsible: {
        actor_id: responsible.actor_id,
        display_name: responsible.display_name,
      },
      project_definition_ref: {
        record_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
      },
      project_definition_label: definition.content.label,
      snapshot: clone(session.content.snapshot),
      snapshot_state:
        session.content.snapshot.stream_revision === authority.stream_revision
          ? "current"
          : "stale",
      origin: {
        origin_kind: session.content.origin.origin_kind,
        record_refs: clone(session.content.origin.record_refs),
        label: originLabel(session.content.origin.origin_kind),
        detail: session.content.origin.summary,
      },
      return_context: clone(session.content.return_context),
    };
    if (session.schema_version === "1.1.0") {
      const lifecycleSession = {
        ...sessionSummary,
        lifecycle: session.content.lifecycle,
      } satisfies ProjectReviewSessionSummaryV120;
      if (definition.definition_family === "petra.controlled-writing") {
        const content: ProjectReviewViewContentV130 = {
          session: lifecycleSession,
          members: members as ProjectReviewViewContentV130["members"],
          authority,
          projection: await this.#projection(client, session.project_id),
        };
        const view: PetraProjectReviewViewV130 = {
          schema_name: "petra.project-review-view",
          schema_version: "1.3.0",
          project_id: session.project_id,
          review_session_id: session.review_session_id,
          content,
          content_hash: canonicalHash(content),
          read_at: readAt,
        };
        this.#contracts.assertValid("project-review-view", "1.3.0", view);
        return view;
      }
      const content: ProjectReviewViewContentV120 = {
        session: lifecycleSession,
        members: members as ProjectReviewViewContentV120["members"],
        authority,
        projection: await this.#projection(client, session.project_id),
      };
      const view: PetraProjectReviewViewV120 = {
        schema_name: "petra.project-review-view",
        schema_version: "1.2.0",
        project_id: session.project_id,
        review_session_id: session.review_session_id,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid("project-review-view", "1.2.0", view);
      return view;
    }
    const content: ProjectReviewViewContent = {
      session: sessionSummary,
      members: members as ProjectReviewViewContent["members"],
      authority,
    };
    const view: PetraProjectReviewView = {
      schema_name: "petra.project-review-view",
      schema_version: "1.0.0",
      project_id: session.project_id,
      review_session_id: session.review_session_id,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid("project-review-view", "1.0.0", view);
    return view;
  }

  #reviewSession(payload: unknown): PetraReviewSessionRecord {
    const version = (payload as { schema_version?: unknown }).schema_version;
    if (version !== "1.0.0" && version !== "1.1.0") {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The Review session uses an unsupported stored schema version.",
      );
    }
    return this.#record<PetraReviewSessionRecord>(
      "review-session",
      version,
      payload,
    );
  }

  async #workingMember(
    client: PoolClient,
    session: PetraReviewSessionV110,
    definition: PetraProjectDefinition,
    member: ReviewSessionMemberV110,
    currentStreamRevision: number,
  ): Promise<ProjectReviewMemberV110 | ProjectReviewMemberV130> {
    const working = await this.#workingState(client, session, member);
    const producer = await this.#actor(
      client,
      working.candidate.producer.actor.actor_id,
    );
    if (producer.actor_kind !== working.candidate.producer.actor.actor_kind) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The WorkingCandidate producer does not resolve to its recorded Actor kind.",
      );
    }
    const workingState = {
      candidate: working.candidate,
      relationships: working.relationships as [
        PetraWorkingRelationship,
        ...PetraWorkingRelationship[],
      ],
      selection_basis: "exact_review_session_working_bindings" as const,
      authority_effect: "none" as const,
    };
    if (definition.definition_family === "petra.controlled-writing") {
      const base = await this.#controlledWritingMember(
        client,
        session,
        definition,
        member,
        working,
      );
      return {
        ...base,
        candidate: {
          ...base.candidate,
          revision_label: `Working candidate revision ${working.candidate.revision} · ${working.relationships.length} exact working relationship${working.relationships.length === 1 ? "" : "s"}`,
          origin_label: producer.display_name,
          origin_detail: `${titleCase(working.candidate.origin.origin_kind)} · ${working.candidate.origin.summary}`,
        },
        working_state: workingState,
      };
    }
    const base = await this.#member(
      client,
      session,
      definition,
      member,
      currentStreamRevision,
      working,
    );
    return {
      ...base,
      candidate: {
        ...base.candidate,
        revision_label: `Working candidate revision ${working.candidate.revision} · ${working.relationships.length} exact working relationship${working.relationships.length === 1 ? "" : "s"}`,
        origin_label: producer.display_name,
        origin_detail: `${titleCase(working.candidate.origin.origin_kind)} · ${working.candidate.origin.summary}`,
      },
      working_state: workingState,
      change_sets: await Promise.all(
        base.change_sets.map((changeSet) =>
          this.#traceChangeSet(client, session.project_id, changeSet),
        ),
      ),
    };
  }

  async #controlledWritingMember(
    client: PoolClient,
    session: PetraReviewSessionV110,
    definition: PetraProjectDefinition,
    member: ReviewSessionMemberV110,
    working: {
      candidate: PetraWorkingCandidate;
      relationships: PetraWorkingRelationship[];
      current: boolean;
    },
  ): Promise<Omit<ProjectReviewMemberV130, "working_state">> {
    const requirementBinding = member.candidate_bindings.find(
      (binding) => binding.binding_role === "candidate",
    );
    const governingBinding = member.candidate_bindings.find(
      (binding) => binding.binding_role === "relationship",
    );
    const workingRelationship = working.relationships[0];
    if (
      requirementBinding === undefined ||
      governingBinding === undefined ||
      member.candidate_bindings.length !== 2 ||
      workingRelationship === undefined ||
      working.relationships.length !== 1
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_RENDERER_UNSUPPORTED",
        "The controlled-writing Review read requires one Requirement and one governing relationship binding per member.",
      );
    }
    this.#assertRegistration(
      definition,
      requirementBinding.semantic_key,
      "object_schema",
      "petra.controlled-writing-requirement",
    );
    this.#assertRegistration(
      definition,
      governingBinding.semantic_key,
      "relationship_schema",
      "petra.controlled-writing-governing-relationship",
    );
    const requirement =
      await this.#controlledWritingRecord<PetraControlledWritingRequirement>(
        client,
        "controlled_writing_requirement_records",
        "requirement_id",
        "controlled-writing-requirement",
        session.project_id,
        requirementBinding.record_ref,
      );
    const governing =
      await this.#controlledWritingRecord<PetraControlledWritingGoverningRelationship>(
        client,
        "controlled_writing_governing_relationship_records",
        "governing_relationship_id",
        "controlled-writing-governing-relationship",
        session.project_id,
        governingBinding.record_ref,
      );
    const sourceResult = await client.query<ControlledWritingSourceRow>(
      `SELECT revision.payload, revision.record_hash,
              revision.status, revision.source_role
         FROM petra.project_source_revisions AS revision
         JOIN petra.project_sources AS head
           ON head.project_source_id = revision.project_source_id
          AND head.project_id = revision.project_id
          AND head.current_revision = revision.revision
        WHERE revision.project_id = $1
          AND revision.project_source_id = $2
          AND revision.revision = $3
          AND revision.record_hash = $4`,
      [
        session.project_id,
        governing.content.authority_source_ref.record_id,
        governing.content.authority_source_ref.revision,
        governing.content.authority_source_ref.record_hash,
      ],
    );
    const sourceRow = sourceResult.rows[0];
    if (sourceRow === undefined) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The controlled-writing governing relationship does not resolve to its exact current ProjectSource.",
      );
    }
    const source = this.#record<PetraProjectSource>(
      "project-source",
      "1.0.0",
      sourceRow.payload,
    );
    if (
      canonicalHash(source) !== sourceRow.record_hash ||
      source.content_hash !== canonicalHash(source.content) ||
      sourceRow.status !== "active" ||
      sourceRow.source_role !== "writing.authority-source" ||
      requirement.project_id !== session.project_id ||
      governing.project_id !== session.project_id ||
      requirement.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      requirement.project_definition_ref.revision !== definition.revision ||
      requirement.project_definition_ref.content_hash !==
        definition.content_hash ||
      governing.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      governing.project_definition_ref.revision !== definition.revision ||
      governing.project_definition_ref.content_hash !==
        definition.content_hash ||
      governing.content.predicate !== "GOVERNS" ||
      governing.content.requirement_ref.record_id !==
        requirement.requirement_id ||
      governing.content.requirement_ref.revision !== requirement.revision ||
      governing.content.requirement_ref.record_hash !==
        requirementBinding.record_ref.record_hash ||
      working.candidate.profile_object.object_record_ref.schema_name !==
        "petra.controlled-writing-requirement" ||
      working.candidate.profile_object.object_record_ref.schema_version !==
        "1.0.0" ||
      workingRelationship.profile_relationship.relationship_record_ref
        .schema_name !== "petra.controlled-writing-governing-relationship" ||
      workingRelationship.profile_relationship.relationship_record_ref
        .schema_version !== "1.0.0" ||
      workingRelationship.profile_relationship.predicate !== "GOVERNS" ||
      governing.content.authority_source_ref.schema_name !==
        "petra.project-source" ||
      governing.content.authority_source_ref.schema_version !== "1.0.0" ||
      source.project_source_id !==
        governing.content.authority_source_ref.record_id
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The controlled-writing Review member does not preserve its exact registered Requirement-GOVERNS semantics.",
      );
    }

    const validations = [
      working.candidate.validation,
      workingRelationship.validation,
    ];
    const results = validations.flatMap((validation) => validation.results);
    const blocked =
      validations.some((validation) => validation.state === "blocked") ||
      results.some(
        (result) => result.outcome === "failed" || result.outcome === "blocked",
      );
    const passed =
      validations.every((validation) => validation.state === "completed") &&
      results.length > 0 &&
      results.every((result) => result.outcome === "passed");
    const validation: ProjectReviewMemberV130["validation"] = blocked
      ? {
          state: "blocked",
          label: "Validation blocked",
          detail:
            "At least one exact controlled-writing working record is blocked or failed validation. Validation grants no Review decision or mutation authority.",
        }
      : passed
        ? {
            state: "passed",
            label: "Validation passed",
            detail: `${results.length} exact controlled-writing working ${results.length === 1 ? "check passed" : "checks passed"}. This does not approve the Requirement or grant mutation authority.`,
          }
        : {
            state: "needs_judgment",
            label: "Validation pending",
            detail:
              "The exact controlled-writing working records remain pending validation. Review inclusion does not approve the Requirement or create an Apply path.",
          };
    const requirementTerm = definition.content.terms.find(
      (term) => term.semantic_key === requirementBinding.semantic_key,
    );
    const relationshipTerm = definition.content.terms.find(
      (term) => term.semantic_key === governingBinding.semantic_key,
    );
    const sourceTerm = definition.content.terms.find(
      (term) => term.semantic_key === "writing.authority-source",
    );
    const outcome: ProjectReviewMemberV130["outcome"] =
      session.content.lifecycle === "deferred"
        ? "waiting"
        : working.current
          ? "awaiting_decision"
          : "conflicted";
    return {
      review_member_id: member.review_member_id,
      member_role: member.member_role,
      outcome,
      candidate: {
        candidate_id: member.review_member_id,
        revision_label: `Requirement revision ${requirement.revision} · Governing relationship revision ${governing.revision}`,
        kind_label: `${requirementTerm?.singular ?? "Requirement"} and ${relationshipTerm?.singular.toLocaleLowerCase() ?? "governing relationship"}`,
        current:
          "No authoritative controlled-writing representation is installed",
        proposed: requirement.content.statement,
        difference:
          "Adds one non-authoritative Requirement and its exact GOVERNS relationship to Review. No controlled-writing mutation operation or Apply path is installed.",
        origin_label: requirement.created_by.actor_id,
        origin_detail: `Direct edit · ${working.candidate.origin.summary}`,
        profile_payload: {
          payload_kind: "controlled_writing_requirement",
          requirement_ref: {
            ...clone(working.candidate.profile_object.object_record_ref),
            schema_name: "petra.controlled-writing-requirement",
            schema_version: "1.0.0",
          },
          governing_relationship_ref: {
            ...clone(
              workingRelationship.profile_relationship.relationship_record_ref,
            ),
            schema_name: "petra.controlled-writing-governing-relationship",
            schema_version: "1.0.0",
          },
          authority_source_ref: {
            ...clone(governing.content.authority_source_ref),
            schema_name: "petra.project-source",
            schema_version: "1.0.0",
          },
          requirement_kind: requirement.content.requirement_kind,
          relationship_predicate: "GOVERNS",
          apply_available: false,
        },
      },
      basis: [
        {
          basis_id: source.project_source_id,
          label: sourceTerm?.singular ?? "Authority source",
          relation: relationshipTerm?.singular ?? "Governing relationship",
          extent: titleCase(requirement.content.requirement_kind),
          detail: governing.content.rationale,
          project_source_id: source.project_source_id,
          project_source_status: "active",
        },
      ],
      validation,
      consequences: [
        `The exact ${requirementTerm?.singular ?? "Requirement"} remains non-authoritative working state.`,
        "No controlled-writing ChangeSet operation, Approval, or Apply path is installed.",
        "Review composition leaves the authority source, producer provenance, and Project authority unchanged.",
      ],
      change_sets: [],
    };
  }

  async #member(
    client: PoolClient,
    session: PetraReviewSessionRecord,
    definition: PetraProjectDefinition,
    member: ReviewSessionMember | ReviewSessionMemberV110,
    currentStreamRevision: number,
    working?: {
      candidate: PetraWorkingCandidate;
      relationships: PetraWorkingRelationship[];
      current: boolean;
    },
  ): Promise<ProjectReviewMember> {
    const claimBinding = member.candidate_bindings.find(
      (binding) => binding.binding_role === "candidate",
    );
    const assertionBinding = member.candidate_bindings.find(
      (binding) => binding.binding_role === "relationship",
    );
    if (
      claimBinding === undefined ||
      assertionBinding === undefined ||
      member.candidate_bindings.length !== 2
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_RENDERER_UNSUPPORTED",
        "The current M1 Review view requires one candidate and one relationship binding per member.",
      );
    }
    this.#assertRegistration(
      definition,
      claimBinding.semantic_key,
      "object_schema",
      "petra.claim",
    );
    this.#assertRegistration(
      definition,
      assertionBinding.semantic_key,
      "relationship_schema",
      "petra.assertion",
    );
    const claim = await this.#evidence<PetraClaim>(
      client,
      "claim",
      claimBinding.record_ref.record_id,
      claimBinding.record_ref.revision,
      claimBinding.record_ref.record_hash,
    );
    const assertion = await this.#evidence<PetraAssertion>(
      client,
      "assertion",
      assertionBinding.record_ref.record_id,
      assertionBinding.record_ref.revision,
      assertionBinding.record_ref.record_hash,
    );
    const producer = await this.#actor(client, claim.created_by.actor_id);
    if (producer.actor_kind !== claim.created_by.actor_kind) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The Review candidate producer does not resolve to its recorded actor kind.",
      );
    }
    if (
      assertion.predicate !== "ASSERTS" ||
      assertion.object.object_kind !== "entity" ||
      assertion.object.entity_id !== claim.claim_id ||
      claim.basis.basis_kind !== "source" ||
      assertion.subject_id !== claim.basis.work_version_id
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_RENDERER_UNSUPPORTED",
        "The current M1 Review view supports only an exact source-grounded Claim-ASSERTS pair.",
      );
    }

    const basis = await this.#basis(client, session.project_id, claim);
    const changeSets = await this.#changeSets(
      client,
      session.project_id,
      claim,
      assertion,
    );
    const outcome = this.#outcome(changeSets);
    const validation = this.#validation(
      session,
      claim,
      basis,
      changeSets,
      outcome,
      currentStreamRevision,
      working,
    );
    const prior = await this.#priorAcceptedClaim(client, claim);
    const scopeDimensions = [
      ...Object.keys(claim.scope).filter(
        (key) => key !== "unreported_dimensions",
      ),
      ...claim.scope.unreported_dimensions,
    ];
    const findingTerm = definition.content.terms.find(
      (term) => term.semantic_key === claimBinding.semantic_key,
    );
    const relationshipTerm = definition.content.terms.find(
      (term) => term.semantic_key === assertionBinding.semantic_key,
    );
    const kindLabel = `${findingTerm?.singular ?? "Candidate"} and ${
      relationshipTerm?.singular.toLocaleLowerCase() ?? "relationship"
    }`;
    const derivation = claim.basis.derivation;
    const consequences =
      changeSets[0] === undefined
        ? [
            `No ChangeSet is prepared; the exact ${findingTerm?.singular ?? "candidate"} remains non-authoritative.`,
            "The source copy, ProjectSource membership, and quarantine records remain unchanged.",
            "A validated Changes-to-apply preview is required before authority can change.",
          ]
        : [
            changeSets[0].impact_summary,
            "The exact quarantine revisions and source provenance remain retained.",
            "Graph projection begins only after an authoritative event commits.",
          ];

    return {
      review_member_id: member.review_member_id,
      member_role: member.member_role,
      outcome,
      candidate: {
        candidate_id: member.review_member_id,
        revision_label: `Claim revision ${claim.revision} · Assertion revision ${assertion.revision}`,
        kind_label: kindLabel,
        current: prior?.canonical_text ?? "No accepted representation",
        proposed: claim.canonical_text,
        difference:
          prior === undefined
            ? `Adds one source-grounded ${findingTerm?.singular ?? "candidate"} and its ASSERTS relationship to trusted Project state if an exact ChangeSet is approved and applied.`
            : `Replaces the accepted representation with this exact ${findingTerm?.singular ?? "candidate"} revision if an exact ChangeSet is approved and applied.`,
        origin_label: producer.display_name,
        origin_detail: `${titleCase(derivation.derivation_kind)} · ${derivation.derivation_ref}`,
        profile_payload: {
          payload_kind: "scientific_evidence_pair",
          claim_ref: clone(claimBinding.record_ref),
          assertion_ref: clone(assertionBinding.record_ref),
          claim_kind: claim.claim_kind,
          assertion_predicate: "ASSERTS",
          scope_dimensions: [...new Set(scopeDimensions)],
        },
      },
      basis,
      validation,
      consequences: consequences as ProjectReviewMember["consequences"],
      change_sets: changeSets,
    };
  }

  async #workingState(
    client: PoolClient,
    session: PetraReviewSessionV110,
    member: ReviewSessionMemberV110,
  ): Promise<{
    candidate: PetraWorkingCandidate;
    relationships: PetraWorkingRelationship[];
    current: boolean;
  }> {
    const candidateResult = await client.query<
      WorkingRecordRow & { current_revision: string }
    >(
      `SELECT revision.payload, revision.record_hash,
              head.current_revision::text
         FROM petra.review_session_working_candidate_bindings AS binding
         JOIN petra.working_candidate_revisions AS revision
           ON revision.working_candidate_id = binding.working_candidate_id
          AND revision.revision = binding.working_candidate_revision
          AND revision.content_hash = binding.working_candidate_content_hash
         JOIN petra.working_candidates AS head
           ON head.working_candidate_id = revision.working_candidate_id
        WHERE binding.review_session_id = $1
          AND binding.review_session_revision = $2
          AND binding.review_member_id = $3`,
      [session.review_session_id, session.revision, member.review_member_id],
    );
    const candidateRow = candidateResult.rows[0];
    if (candidateRow === undefined) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The Review member has no exact retained WorkingCandidate binding.",
      );
    }
    const candidate = this.#workingRecord<PetraWorkingCandidate>(
      "working-candidate",
      candidateRow,
    );
    const candidateRef = member.working_state.candidate_ref;
    if (
      candidate.working_candidate_id !== candidateRef.working_candidate_id ||
      candidate.revision !== candidateRef.revision ||
      candidate.content_hash !== candidateRef.content_hash
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The retained WorkingCandidate does not match the ReviewSession member binding.",
      );
    }

    const relationshipResult = await client.query<
      WorkingRecordRow & { current_revision: string }
    >(
      `SELECT revision.payload, revision.record_hash,
              head.current_revision::text
         FROM petra.review_session_working_candidate_bindings AS candidate
         JOIN petra.review_session_working_relationship_bindings AS binding
           ON binding.review_session_id = candidate.review_session_id
          AND binding.review_session_revision = candidate.review_session_revision
          AND binding.member_position = candidate.member_position
         JOIN petra.working_relationship_revisions AS revision
           ON revision.working_relationship_id = binding.working_relationship_id
          AND revision.revision = binding.working_relationship_revision
          AND revision.content_hash = binding.working_relationship_content_hash
         JOIN petra.working_relationships AS head
           ON head.working_relationship_id = revision.working_relationship_id
        WHERE candidate.review_session_id = $1
          AND candidate.review_session_revision = $2
          AND candidate.review_member_id = $3
        ORDER BY binding.relationship_position`,
      [session.review_session_id, session.revision, member.review_member_id],
    );
    const relationships = relationshipResult.rows.map((row) =>
      this.#workingRecord<PetraWorkingRelationship>(
        "working-relationship",
        row,
      ),
    );
    if (
      relationships.length !== member.working_state.relationship_refs.length ||
      relationships.length === 0
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The retained WorkingRelationship membership does not match the ReviewSession.",
      );
    }
    for (const [index, relationship] of relationships.entries()) {
      const ref = member.working_state.relationship_refs[index];
      if (
        ref === undefined ||
        relationship.working_relationship_id !== ref.working_relationship_id ||
        relationship.revision !== ref.revision ||
        relationship.content_hash !== ref.content_hash
      ) {
        throw new PostgresProjectReviewViewError(
          "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
          "An exact WorkingRelationship does not match its ordered ReviewSession binding.",
        );
      }
    }

    const claimBinding = member.candidate_bindings.find(
      (binding) => binding.binding_role === "candidate",
    );
    const relationshipBinding = member.candidate_bindings.find(
      (binding) => binding.binding_role === "relationship",
    );
    const relationship = relationships[0];
    if (
      claimBinding === undefined ||
      relationshipBinding === undefined ||
      relationship === undefined ||
      relationships.length !== 1 ||
      candidate.project_id !== session.project_id ||
      relationship.project_id !== session.project_id ||
      candidate.project_definition_ref.project_definition_id !==
        session.project_definition_ref.project_definition_id ||
      candidate.project_definition_ref.revision !==
        session.project_definition_ref.revision ||
      candidate.project_definition_ref.content_hash !==
        session.project_definition_ref.content_hash ||
      relationship.project_definition_ref.project_definition_id !==
        session.project_definition_ref.project_definition_id ||
      relationship.project_definition_ref.revision !==
        session.project_definition_ref.revision ||
      relationship.project_definition_ref.content_hash !==
        session.project_definition_ref.content_hash ||
      candidate.profile_object.registration.semantic_key !==
        claimBinding.semantic_key ||
      candidate.profile_object.object_record_ref.record_id !==
        claimBinding.record_ref.record_id ||
      candidate.profile_object.object_record_ref.revision !==
        claimBinding.record_ref.revision ||
      candidate.profile_object.object_record_ref.record_hash !==
        claimBinding.record_ref.record_hash ||
      relationship.profile_relationship.registration.semantic_key !==
        relationshipBinding.semantic_key ||
      relationship.profile_relationship.relationship_record_ref.record_id !==
        relationshipBinding.record_ref.record_id ||
      relationship.profile_relationship.relationship_record_ref.revision !==
        relationshipBinding.record_ref.revision ||
      relationship.profile_relationship.relationship_record_ref.record_hash !==
        relationshipBinding.record_ref.record_hash ||
      relationship.endpoints.object.endpoint_kind !== "working_candidate" ||
      relationship.endpoints.object.candidate_ref.working_candidate_id !==
        candidate.working_candidate_id ||
      relationship.endpoints.object.candidate_ref.revision !==
        candidate.revision ||
      relationship.endpoints.object.candidate_ref.content_hash !==
        candidate.content_hash ||
      canonicalize(relationship.task_context) !==
        canonicalize(candidate.task_context) ||
      canonicalize(relationship.input_snapshot.snapshot_ref) !==
        canonicalize(candidate.input_snapshot.snapshot_ref)
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_RENDERER_UNSUPPORTED",
        "The Review member does not preserve one exact task-aligned WorkingCandidate and registered relationship.",
      );
    }
    const current =
      Number(candidateRow.current_revision) === candidate.revision &&
      relationshipResult.rows.every(
        (row, index) =>
          Number(row.current_revision) === relationships[index]?.revision,
      );
    return { candidate, relationships, current };
  }

  #workingRecord<
    Value extends PetraWorkingCandidate | PetraWorkingRelationship,
  >(schemaName: string, row: WorkingRecordRow): Value {
    this.#contracts.assertValid(schemaName, "1.0.0", row.payload);
    const record = row.payload as Value;
    if (
      canonicalHash(record) !== row.record_hash ||
      workingContentHash(record) !== record.content_hash
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        `The retained ${schemaName} record has an invalid hash.`,
      );
    }
    return clone(record);
  }

  async #traceChangeSet(
    client: PoolClient,
    projectId: string,
    changeSet: ProjectReviewChangeSetSummary,
  ): Promise<ProjectReviewChangeSetSummaryV110> {
    const changeSetId = changeSet.change_set_ref.record_id;
    const commands = await client.query<CommandTraceRow>(
      `SELECT command_id, command_name, command_fingerprint, outcome_kind,
              submitted_at, completed_at, error_code, error_message, envelope
         FROM petra.command_executions
        WHERE project_id = $1
          AND (
            (command_name = 'SubmitChangeSet'
              AND envelope #>> '{command,change_set,change_set_id}' = $2)
            OR (command_name = 'RecordApproval'
              AND envelope #>> '{command,approval,subject,change_set_id}' = $2)
            OR (command_name = 'ApplyChangeSet'
              AND envelope #>> '{command,change_set_id}' = $2)
          )
        ORDER BY submitted_at, command_id`,
      [projectId, changeSetId],
    );
    const commandTrace = commands.rows.map((row) => {
      const version = (row.envelope as { schema_version?: unknown })
        .schema_version;
      if (version !== "1.0.0" && version !== "1.1.0" && version !== "1.2.0") {
        throw new PostgresProjectReviewViewError(
          "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
          "A Review command has an unsupported stored schema version.",
        );
      }
      this.#contracts.assertValid("command-envelope", version, row.envelope);
      return {
        command_id: row.command_id,
        command_name: row.command_name,
        command_fingerprint: row.command_fingerprint,
        outcome: row.outcome_kind,
        submitted_at: row.submitted_at.toISOString(),
        completed_at: row.completed_at.toISOString(),
        ...(row.error_code === null ? {} : { error_code: row.error_code }),
        ...(row.error_message === null
          ? {}
          : { error_message: row.error_message }),
      } satisfies ProjectReviewCommandTraceV110;
    });
    const commandIds = commands.rows.map((row) => row.command_id);
    const events =
      commandIds.length === 0
        ? { rows: [] as EventTraceRow[] }
        : await client.query<EventTraceRow>(
            `SELECT event_id, event_type, event_position::text,
                    stream_revision::text, command_id, record_hash,
                    recorded_at, payload
               FROM petra.domain_events
              WHERE project_id = $1 AND command_id = ANY($2::text[])
              ORDER BY event_position`,
            [projectId, commandIds],
          );
    const eventTrace = events.rows.map((row) => {
      const version = (row.payload as { schema_version?: unknown })
        .schema_version;
      if (
        (version !== "1.0.0" && version !== "1.1.0" && version !== "1.2.0") ||
        canonicalHash(row.payload) !== row.record_hash
      ) {
        throw new PostgresProjectReviewViewError(
          "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
          "A Review event has an unsupported version or invalid record hash.",
        );
      }
      this.#contracts.assertValid("domain-event", version, row.payload);
      return {
        event_id: row.event_id,
        event_type: row.event_type,
        event_position: Number(row.event_position),
        stream_revision: Number(row.stream_revision),
        command_id: row.command_id,
        record_hash: row.record_hash,
        recorded_at: row.recorded_at.toISOString(),
      } satisfies ProjectReviewEventTraceV110;
    });
    return { ...changeSet, commands: commandTrace, events: eventTrace };
  }

  async #projection(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectReviewProjectionStateV110> {
    const checkpointResult = await client.query<CheckpointRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.projection_checkpoints AS head
         JOIN petra.projection_checkpoint_revisions AS revision
           ON revision.projection_checkpoint_id = head.projection_checkpoint_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.target = 'neo4j_graph'
          AND head.projection_name = 'petra.authority_graph'
        ORDER BY revision.recorded_at DESC
        LIMIT 1`,
      [projectId],
    );
    const checkpointRow = checkpointResult.rows[0];
    if (checkpointRow === undefined) {
      return {
        state: "unavailable",
        reason:
          "No authoritative graph-projection checkpoint is registered for this Project.",
      };
    }
    const checkpoint = this.#record<PetraProjectionCheckpoint>(
      "projection-checkpoint",
      "1.0.0",
      checkpointRow.payload,
    );
    if (
      canonicalHash(checkpoint) !== checkpointRow.record_hash ||
      checkpoint.content_hash !== canonicalHash(checkpoint.content) ||
      checkpoint.project_id !== projectId
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The Review graph-projection checkpoint is corrupt or cross-Project.",
      );
    }
    const observedResult = await client.query<{
      target_sequence: string;
      event_position: string;
      stream_revision: string;
    }>(
      `SELECT head.current_target_sequence::text AS target_sequence,
              event.event_position::text, event.stream_revision::text
         FROM petra.outbox_target_heads AS head
         JOIN petra.outbox_records AS outbox
           ON outbox.target = head.target
          AND outbox.partition_key = head.project_id
          AND outbox.target_sequence = head.current_target_sequence
         JOIN petra.domain_events AS event
           ON event.event_id = outbox.event_id
          AND event.project_id = head.project_id
        WHERE head.target = 'neo4j_graph' AND head.project_id = $1`,
      [projectId],
    );
    const observedRow = observedResult.rows[0];
    if (observedRow === undefined) {
      if (checkpoint.content.position.position_kind === "advanced") {
        throw new PostgresProjectReviewViewError(
          "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
          "The graph checkpoint is advanced without an authoritative Project outbox head.",
        );
      }
      return {
        state: "unavailable",
        reason:
          "The graph checkpoint is empty because no authoritative graph event has been queued.",
      };
    }
    const represented = checkpoint.content.position;
    const representedEventPosition =
      represented.position_kind === "empty" ? 0 : represented.event_position;
    const representedStreamRevision =
      represented.position_kind === "empty" ? 0 : represented.stream_revision;
    const observedTargetSequence = Number(observedRow.target_sequence);
    const observedEventPosition = Number(observedRow.event_position);
    const observedStreamRevision = Number(observedRow.stream_revision);
    if (
      represented.target_sequence > observedTargetSequence ||
      representedEventPosition > observedEventPosition ||
      representedStreamRevision > observedStreamRevision
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The Review graph checkpoint is ahead of the authoritative outbox.",
      );
    }
    const state =
      checkpoint.content.freshness.state === "blocked"
        ? "blocked"
        : represented.target_sequence === observedTargetSequence
          ? "current"
          : "catching_up";
    return {
      state,
      checkpoint_ref: {
        record_id: checkpoint.projection_checkpoint_id,
        revision: checkpoint.revision,
        content_hash: checkpoint.content_hash,
      },
      represented_event_position: representedEventPosition,
      represented_stream_revision: representedStreamRevision,
      represented_target_sequence: represented.target_sequence,
      observed_event_position: observedEventPosition,
      observed_stream_revision: observedStreamRevision,
      observed_target_sequence: observedTargetSequence,
      pending_records: observedTargetSequence - represented.target_sequence,
      ...(checkpoint.content.freshness.state === "blocked"
        ? { failure_code: checkpoint.content.freshness.failure_code }
        : {}),
    };
  }

  #assertRegistration(
    definition: PetraProjectDefinition,
    semanticKey: string,
    registrationKind: "object_schema" | "relationship_schema",
    contractName:
      | "petra.claim"
      | "petra.assertion"
      | "petra.controlled-writing-requirement"
      | "petra.controlled-writing-governing-relationship",
  ): void {
    const matches = definition.content.registrations.filter(
      (registration) =>
        registration.semantic_key === semanticKey &&
        registration.registration_kind === registrationKind &&
        registration.contract.name === contractName &&
        registration.contract.version === "1.0.0",
    );
    if (matches.length !== 1) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_DEFINITION_MISMATCH",
        `Review semantic key ${semanticKey} does not resolve exactly through its bound ProjectDefinition.`,
      );
    }
  }

  async #evidence<Value extends PetraClaim | PetraAssertion>(
    client: PoolClient,
    kind: "claim" | "assertion",
    id: string,
    revision: number,
    expectedHash: string,
  ): Promise<Value> {
    const result = await client.query<EvidenceRow>(
      `SELECT payload, record_hash
         FROM petra.evidence_entity_revisions
        WHERE evidence_id = $1 AND evidence_kind = $2 AND revision = $3`,
      [id, kind, revision],
    );
    const row = result.rows[0];
    if (row === undefined || row.record_hash !== expectedHash) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        `Review candidate ${id} does not resolve to its exact retained revision.`,
      );
    }
    const record = this.#record<Value>(kind, "1.0.0", row.payload);
    if (canonicalHash(record) !== row.record_hash) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        `Review candidate ${id} has an invalid stored record hash.`,
      );
    }
    return record;
  }

  async #controlledWritingRecord<
    Value extends
      | PetraControlledWritingRequirement
      | PetraControlledWritingGoverningRelationship,
  >(
    client: PoolClient,
    table:
      | "controlled_writing_requirement_records"
      | "controlled_writing_governing_relationship_records",
    idColumn: "requirement_id" | "governing_relationship_id",
    contractName:
      | "controlled-writing-requirement"
      | "controlled-writing-governing-relationship",
    projectId: string,
    ref: {
      readonly record_id: string;
      readonly revision: number;
      readonly record_hash: string;
    },
  ): Promise<Value> {
    const result = await client.query<WorkingRecordRow>(
      `SELECT payload, record_hash
         FROM petra.${table}
        WHERE project_id = $1
          AND ${idColumn} = $2
          AND revision = $3`,
      [projectId, ref.record_id, ref.revision],
    );
    const row = result.rows[0];
    if (row === undefined || row.record_hash !== ref.record_hash) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        `Controlled-writing Review candidate ${ref.record_id} does not resolve to its exact retained revision.`,
      );
    }
    const record = this.#record<Value>(contractName, "1.0.0", row.payload);
    if (
      canonicalHash(record) !== row.record_hash ||
      record.content_hash !== canonicalHash(record.content)
    ) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        `Controlled-writing Review candidate ${ref.record_id} has an invalid stored hash.`,
      );
    }
    return record;
  }

  async #basis(
    client: PoolClient,
    projectId: string,
    claim: PetraClaim,
  ): Promise<ProjectReviewMember["basis"]> {
    if (claim.basis.basis_kind !== "source") {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_RENDERER_UNSUPPORTED",
        "The current M1 Review renderer requires exact source basis.",
      );
    }
    const sourceBasis = claim.basis;
    const result = await client.query<BasisRow>(
      `SELECT span.payload AS source_span_payload,
              span.record_hash AS source_span_record_hash,
              block.payload AS structural_block_payload,
              block.record_hash AS structural_block_record_hash,
              source.project_source_id,
              binding.status AS source_status
         FROM petra.claim_source_spans AS grounding
         JOIN petra.source_spans AS span
           ON span.source_span_id = grounding.source_span_id
         JOIN petra.evidence_entity_revisions AS claim_record
           ON claim_record.evidence_id = grounding.claim_id
          AND claim_record.evidence_kind = 'claim'
          AND claim_record.revision = grounding.claim_revision
         JOIN petra.structural_blocks AS block
           ON block.parsed_document_id = span.parsed_document_id
          AND block.structural_block_id = span.structural_block_id
         JOIN petra.parsed_documents AS document
           ON document.parsed_document_id = span.parsed_document_id
         JOIN petra.project_sources AS source
           ON source.project_id = $1
         JOIN petra.project_source_revisions AS binding
           ON binding.project_source_id = source.project_source_id
          AND binding.revision = source.current_revision
          AND binding.work_version_id = document.work_version_id
          AND binding.artifact_manifest_id = document.source_artifact_manifest_id
        WHERE grounding.claim_id = $2 AND grounding.claim_revision = $3
        ORDER BY grounding.position`,
      [projectId, claim.claim_id, claim.revision],
    );
    if (result.rows.length !== claim.basis.source_span_ids.length) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "Review source basis does not resolve through exact ProjectSource membership.",
      );
    }
    return result.rows.map((row) => {
      const span = this.#record<PetraSourceSpan>(
        "source-span",
        "1.0.0",
        row.source_span_payload,
      );
      const block = this.#record<PetraStructuralBlock>(
        "structural-block",
        "1.0.0",
        row.structural_block_payload,
      );
      if (
        canonicalHash(span) !== row.source_span_record_hash ||
        canonicalHash(block) !== row.structural_block_record_hash ||
        block.content.content_kind !== "text"
      ) {
        throw new PostgresProjectReviewViewError(
          "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
          "A Review basis record is corrupt or has no inspectable text.",
        );
      }
      const heading = block.structural_path.join(" / ");
      return {
        basis_id: span.source_span_id,
        label: heading,
        relation: "Principal source basis",
        extent: `${titleCase(sourceBasis.source_scope)} · ${span.verification.status.replaceAll("_", " ")}`,
        detail: block.content.text,
        project_source_id: row.project_source_id,
        project_source_status: row.source_status,
        source_span_ref: {
          record_id: span.source_span_id,
          revision: span.revision,
          record_hash: row.source_span_record_hash,
        },
      };
    }) as ProjectReviewMember["basis"];
  }

  async #changeSets(
    client: PoolClient,
    projectId: string,
    claim: PetraClaim,
    assertion: PetraAssertion,
  ): Promise<ProjectReviewChangeSetSummary[]> {
    const result = await client.query<ChangeSetRow>(
      `SELECT change_set.payload, change_set.record_hash,
              change_set.current_state,
              approval.payload AS approval_payload,
              approval.record_hash AS approval_record_hash
         FROM petra.change_sets AS change_set
         LEFT JOIN LATERAL (
           SELECT candidate.payload, candidate.record_hash
             FROM petra.approvals AS candidate
            WHERE candidate.change_set_id = change_set.change_set_id
            ORDER BY candidate.decided_at DESC, candidate.approval_id DESC
            LIMIT 1
         ) AS approval ON true
        WHERE change_set.project_id = $1
        ORDER BY change_set.proposed_at DESC, change_set.change_set_id DESC`,
      [projectId],
    );
    return result.rows.flatMap((row) => {
      const raw = row.payload as { schema_version?: unknown };
      const version = raw.schema_version;
      if (version !== "1.0.0" && version !== "1.1.0") {
        throw new PostgresProjectReviewViewError(
          "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
          "A Review ChangeSet has an unsupported stored schema version.",
        );
      }
      const changeSet = this.#record<PetraChangeSetRecord>(
        "change-set",
        version,
        row.payload,
      );
      if (
        canonicalHash(changeSet) !== row.record_hash ||
        canonicalHash(changeSet.content) !== changeSet.content_hash
      ) {
        throw new PostgresProjectReviewViewError(
          "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
          "A Review ChangeSet has an invalid stored record hash.",
        );
      }
      const targets = new Map(
        changeSet.content.operations.map((operation) => [
          operation.target_id,
          operation.base_revision,
        ]),
      );
      if (
        changeSet.content.operations.length !== 2 ||
        targets.get(claim.claim_id) !== claim.revision ||
        targets.get(assertion.assertion_id) !== assertion.revision
      ) {
        return [];
      }
      const approval =
        row.approval_payload === null
          ? undefined
          : this.#record<PetraApproval>(
              "approval",
              "1.0.0",
              row.approval_payload,
            );
      if (
        approval !== undefined &&
        (row.approval_record_hash === null ||
          canonicalHash(approval) !== row.approval_record_hash)
      ) {
        throw new PostgresProjectReviewViewError(
          "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
          "A Review Approval has an invalid stored record hash.",
        );
      }
      const changes = changeSet.content.operations.map(
        (operation) =>
          `${titleCase(operation.operation_kind)} ${operation.target_id} revision ${operation.base_revision}.`,
      );
      return [
        {
          change_set_ref: {
            record_id: changeSet.change_set_id,
            revision: changeSet.revision,
            content_hash: changeSet.content_hash,
          },
          state: row.current_state,
          atomicity: `One atomic ChangeSet · ${changes.length} operations`,
          changes: changes as ProjectReviewChangeSetSummary["changes"],
          protected: [
            "Source bytes and ProjectSource membership remain unchanged.",
            "The candidate revisions and provenance remain retained.",
          ],
          impact_summary: changeSet.content.impact.summary,
          ...(approval === undefined
            ? {}
            : {
                approval_ref: {
                  record_id: approval.approval_id,
                  revision: approval.revision,
                  record_hash: row.approval_record_hash!,
                },
              }),
        },
      ];
    });
  }

  #outcome(
    changeSets: readonly ProjectReviewChangeSetSummary[],
  ): ProjectReviewMember["outcome"] {
    const state = changeSets[0]?.state;
    return state === "approved"
      ? "waiting"
      : state === "applied" || state === "rejected" || state === "conflicted"
        ? state
        : "awaiting_decision";
  }

  #validation(
    session: PetraReviewSessionRecord,
    claim: PetraClaim,
    basis: ProjectReviewMember["basis"],
    changeSets: readonly ProjectReviewChangeSetSummary[],
    outcome: ProjectReviewMember["outcome"],
    currentStreamRevision: number,
    working?: {
      candidate: PetraWorkingCandidate;
      relationships: PetraWorkingRelationship[];
      current: boolean;
    },
  ): ProjectReviewValidationSummary {
    const pending = outcome === "awaiting_decision" || outcome === "waiting";
    if (
      pending &&
      session.content.snapshot.stream_revision !== currentStreamRevision
    ) {
      return {
        state: "blocked",
        label: "Review snapshot is stale",
        detail: `The Review binds Project stream revision ${session.content.snapshot.stream_revision}, while authority is now at revision ${currentStreamRevision}.`,
        recovery:
          "Refresh the Review against current authority and rebuild any Changes-to-apply preview before deciding.",
      };
    }
    if (changeSets[0]?.state === "conflicted") {
      return {
        state: "blocked",
        label: "ChangeSet conflicted",
        detail:
          "At least one exact before-state changed before application; nothing in this ChangeSet was partially applied.",
        recovery:
          "Refresh the candidate comparison and prepare a new exact ChangeSet.",
      };
    }
    if (pending && working !== undefined && !working.current) {
      return {
        state: "blocked",
        label: "Working candidate is stale",
        detail:
          "A newer WorkingCandidate or WorkingRelationship revision now exists. This Review still preserves the exact earlier member without rebinding it.",
        recovery:
          "Refresh the Review against the exact current working heads before deciding.",
      };
    }
    const sourceExcluded = basis.some(
      (item) => item.project_source_status === "excluded",
    );
    if (sourceExcluded) {
      return {
        state: "blocked",
        label: "Project source is excluded",
        detail:
          "The exact source remains retained but is excluded from current Project use.",
        recovery:
          "Review the ProjectSource membership before preparing or applying a ChangeSet.",
      };
    }
    if (
      working !== undefined &&
      (working.candidate.disposition !== "available" ||
        working.relationships.some(
          (relationship) => relationship.disposition !== "available",
        ))
    ) {
      return {
        state: "blocked",
        label: "Working member is withdrawn",
        detail:
          "The exact working candidate or relationship is retained but no longer available for a decision.",
        recovery:
          "Refresh the Review or explicitly recover an eligible current working member.",
      };
    }
    const workingValidation =
      working === undefined
        ? undefined
        : [working.candidate, ...working.relationships].map(
            (record) => record.validation,
          );
    if (
      workingValidation?.some((validation) => validation.state === "pending")
    ) {
      return {
        state: "blocked",
        label: "Working validation is pending",
        detail:
          "At least one exact working record has no completed validation receipt. Pending validation does not authorize a decision.",
        recovery:
          "Run the registered checks and refresh the Review with their exact results.",
      };
    }
    const validators =
      workingValidation === undefined
        ? claim.basis.basis_kind === "source"
          ? claim.basis.validator_results
          : []
        : workingValidation.flatMap((validation) => validation.results);
    const failures = validators.filter(
      (result) =>
        result.outcome === "fail" ||
        result.outcome === "failed" ||
        result.outcome === "blocked",
    );
    if (failures.length > 0) {
      return {
        state: "blocked",
        label: "Applicable checks failed",
        detail: `${failures.length} of ${validators.length} exact working checks failed or were blocked. No Review decision or authority follows from validation.`,
        recovery:
          "Correct the candidate or its basis, rerun the applicable checks, and open a fresh Review revision.",
      };
    }
    const warnings = validators.filter(
      (result) => result.outcome === "warning",
    );
    if (warnings.length > 0) {
      return {
        state: "needs_judgment",
        label: "Applicable checks need judgment",
        detail: `${warnings.length} of ${validators.length} exact candidate checks reported a warning. Validation does not approve the candidate.`,
      };
    }
    return {
      state: "passed",
      label: "Applicable checks passed",
      detail: `${validators.length} exact ${working === undefined ? "candidate" : "working"} ${validators.length === 1 ? "check passed" : "checks passed"}. This does not approve the candidate, grant mutation authority, or establish scientific truth.`,
    };
  }

  async #priorAcceptedClaim(
    client: PoolClient,
    claim: PetraClaim,
  ): Promise<PetraClaim | undefined> {
    if (claim.supersedes_claim_id === undefined) return undefined;
    const result = await client.query<EvidenceRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.evidence_entities AS entity
         JOIN petra.evidence_entity_revisions AS revision
           ON revision.evidence_id = entity.evidence_id
          AND revision.evidence_kind = entity.evidence_kind
          AND revision.revision = entity.current_revision
        WHERE entity.evidence_id = $1
          AND entity.evidence_kind = 'claim'
          AND revision.authority_zone = 'trusted'`,
      [claim.supersedes_claim_id],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const prior = this.#record<PetraClaim>("claim", "1.0.0", row.payload);
    if (canonicalHash(prior) !== row.record_hash) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The accepted comparison Claim has an invalid stored record hash.",
      );
    }
    return prior;
  }

  async #actor(client: PoolClient, actorId: string): Promise<PetraActor> {
    const result = await client.query<PayloadRow>(
      "SELECT payload FROM petra.actors WHERE actor_id = $1",
      [actorId],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) {
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        `Review candidate producer ${actorId} is unavailable.`,
      );
    }
    return this.#record<PetraActor>("actor", "1.0.0", payload);
  }

  #sessionStatus(
    session: PetraReviewSessionRecord,
    members: readonly (
      ProjectReviewMember | ProjectReviewMemberV110 | ProjectReviewMemberV130
    )[],
  ): ProjectReviewViewContent["session"]["status"] {
    if (session.content.lifecycle === "deferred") return "waiting";
    if (
      session.content.lifecycle === "completed" ||
      members.every(
        (member) =>
          member.outcome === "applied" || member.outcome === "rejected",
      )
    ) {
      return "completed";
    }
    if (members.every((member) => member.outcome === "waiting")) {
      return "waiting";
    }
    return "needs_decision";
  }

  async #authorityPosition(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectReviewViewContent["authority"]> {
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
      throw new PostgresProjectReviewViewError(
        "PROJECT_REVIEW_VIEW_STORED_RECORD_CORRUPT",
        "The PostgreSQL authority position is unavailable.",
      );
    }
    return {
      isolation: "repeatable_read",
      event_position: Number(row.event_position),
      stream_revision: Number(row.stream_revision ?? 0),
    };
  }

  #record<Value>(name: string, version: string, payload: unknown): Value {
    this.#contracts.assertValid(name, version, payload);
    return clone(payload as Value);
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
