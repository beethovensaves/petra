import { createHash } from "node:crypto";

import type {
  PetraActor,
  PetraApproval,
  PetraAssertion,
  PetraChangeSetRecord,
  PetraClaim,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectReviewView,
  PetraReviewSession,
  PetraSourceSpan,
  PetraStructuralBlock,
  ProjectReviewChangeSetSummary,
  ProjectReviewMember,
  ProjectReviewValidationSummary,
  ProjectReviewViewContent,
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

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const titleCase = (value: string): string =>
  value
    .split("_")
    .map((part) => `${part.slice(0, 1).toLocaleUpperCase()}${part.slice(1)}`)
    .join(" ");

const originLabel = (
  kind: PetraReviewSession["content"]["origin"]["origin_kind"],
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
  ): Promise<PetraProjectReviewView[]> {
    return this.#readTransaction(async (client, readAt) => {
      const rows = await this.#selectSessionRows(client, projectId);
      const views: PetraProjectReviewView[] = [];
      for (const row of rows) {
        views.push(await this.#compose(client, row, readAt));
      }
      return views;
    });
  }

  async getProjectReviewView(
    projectId: string,
    reviewSessionId: string,
  ): Promise<PetraProjectReviewView | undefined> {
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
  ): Promise<PetraProjectReviewView> {
    const session = this.#record<PetraReviewSession>(
      "review-session",
      "1.0.0",
      row.session_payload,
    );
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
    const members: ProjectReviewMember[] = [];
    for (const member of session.content.members) {
      members.push(
        await this.#member(
          client,
          session,
          definition,
          member,
          authority.stream_revision,
        ),
      );
    }
    const status = this.#sessionStatus(session, members);
    const content: ProjectReviewViewContent = {
      session: {
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
      },
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

  async #member(
    client: PoolClient,
    session: PetraReviewSession,
    definition: PetraProjectDefinition,
    member: ReviewSessionMember,
    currentStreamRevision: number,
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

  #assertRegistration(
    definition: PetraProjectDefinition,
    semanticKey: string,
    registrationKind: "object_schema" | "relationship_schema",
    contractName: "petra.claim" | "petra.assertion",
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
    session: PetraReviewSession,
    claim: PetraClaim,
    basis: ProjectReviewMember["basis"],
    changeSets: readonly ProjectReviewChangeSetSummary[],
    outcome: ProjectReviewMember["outcome"],
    currentStreamRevision: number,
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
    const validators =
      claim.basis.basis_kind === "source" ? claim.basis.validator_results : [];
    const failures = validators.filter((result) => result.outcome === "fail");
    if (failures.length > 0) {
      return {
        state: "blocked",
        label: "Applicable checks failed",
        detail: `${failures.length} of ${validators.length} exact candidate checks failed. Validation does not permit a ChangeSet to be prepared or applied.`,
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
      detail: `${validators.length} exact candidate ${validators.length === 1 ? "check passed" : "checks passed"}. This does not approve the candidate or establish scientific truth.`,
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
    session: PetraReviewSession,
    members: readonly ProjectReviewMember[],
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
