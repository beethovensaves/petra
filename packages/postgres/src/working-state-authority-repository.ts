import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraAssertion,
  PetraClaim,
  PetraControlledWritingGoverningRelationship,
  PetraControlledWritingRequirement,
  PetraProjectDefinition,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  WorkingCandidateExactRecordRef,
  WorkingCandidateNamedVersionHash,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  EvidenceProposalError,
  validateWorkingAssertionRevision,
  validateWorkingClaimRevision,
} from "@petra/core";
import type {
  EvidenceProposalResolver,
  WorkingCandidateAdmission,
  WorkingRelationshipAdmission,
  WorkingStateAuthorityRepository,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import { insertEvidenceRecordRevision } from "./evidence-record-persistence.js";

export type PostgresWorkingStateErrorCode =
  | "WORKING_STATE_CONFLICT"
  | "WORKING_STATE_STALE"
  | "WORKING_STATE_REFERENCE_MISSING"
  | "WORKING_STATE_PROFILE_UNSUPPORTED"
  | "WORKING_STATE_RELATION_INVALID";

export class PostgresWorkingStateError extends Error {
  readonly code: PostgresWorkingStateErrorCode;

  constructor(code: PostgresWorkingStateErrorCode, message: string) {
    super(message);
    this.name = "PostgresWorkingStateError";
    this.code = code;
  }
}

type WorkingRecord = PetraWorkingCandidate | PetraWorkingRelationship;
type ProfileRecord =
  | PetraClaim
  | PetraAssertion
  | PetraControlledWritingRequirement
  | PetraControlledWritingGoverningRelationship;

const isControlledWritingProfileRecord = (
  record: ProfileRecord,
): record is
  | PetraControlledWritingRequirement
  | PetraControlledWritingGoverningRelationship =>
  record.schema_name === "petra.controlled-writing-requirement" ||
  record.schema_name === "petra.controlled-writing-governing-relationship";

interface StoredPayloadRow {
  payload: unknown;
  record_hash?: string;
  current_revision?: string;
}

interface EvidenceRow {
  evidence_kind: "claim" | "assertion";
  revision: string;
  authority_zone: PetraClaim["authority"]["zone"];
  record_hash: string;
  payload: unknown;
}

interface DefinitionRow {
  definition_family: string;
  content_hash: string;
  payload: unknown;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const contentHash = (record: WorkingRecord): string => {
  const projection = clone(record) as unknown as Record<string, unknown>;
  delete projection.content_hash;
  return canonicalHash(projection);
};

const sameNamedRef = (
  left: WorkingCandidateNamedVersionHash,
  right: WorkingCandidateNamedVersionHash,
): boolean =>
  left.name === right.name &&
  left.version === right.version &&
  left.content_hash === right.content_hash;

const profileRecordDescriptor = (record: ProfileRecord) =>
  record.schema_name === "petra.claim"
    ? {
        id: record.claim_id,
        contractName: "claim" as const,
        evidenceKind: "claim" as const,
        revision: record.revision,
        recordedAt: record.created_at,
      }
    : record.schema_name === "petra.assertion"
      ? {
          id: record.assertion_id,
          contractName: "assertion" as const,
          evidenceKind: "assertion" as const,
          revision: record.revision,
          recordedAt: record.recorded_at,
        }
      : record.schema_name === "petra.controlled-writing-requirement"
        ? {
            id: record.requirement_id,
            contractName: "controlled-writing-requirement" as const,
            evidenceKind: undefined,
            revision: record.revision,
            recordedAt: record.created_at,
          }
        : {
            id: record.governing_relationship_id,
            contractName: "controlled-writing-governing-relationship" as const,
            evidenceKind: undefined,
            revision: record.revision,
            recordedAt: record.created_at,
          };

const basisActor = (claim: PetraClaim): ActorRef => {
  switch (claim.basis.basis_kind) {
    case "source":
    case "researcher":
      return claim.basis.proposed_by;
    case "synthesis":
      return claim.basis.composed_by;
  }
};

const workingDescriptor = (record: WorkingRecord) =>
  record.schema_name === "petra.working-candidate"
    ? {
        id: record.working_candidate_id,
        table: "working_candidates" as const,
        revisionTable: "working_candidate_revisions" as const,
        idColumn: "working_candidate_id" as const,
        contractName: "working-candidate" as const,
        profileSemanticKey: record.profile_object.registration.semantic_key,
        profileRecord: record.profile_object.object_record_ref,
      }
    : {
        id: record.working_relationship_id,
        table: "working_relationships" as const,
        revisionTable: "working_relationship_revisions" as const,
        idColumn: "working_relationship_id" as const,
        contractName: "working-relationship" as const,
        profileSemanticKey:
          record.profile_relationship.registration.semantic_key,
        profileRecord: record.profile_relationship.relationship_record_ref,
      };

/**
 * Installed-profile adapter for the shared working-state kernel. Profile
 * payloads remain in their canonical profile storage; this repository adds
 * only durable working bindings and their additive lineage.
 */
export class PostgresWorkingStateAuthorityRepository implements WorkingStateAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  admitWorkingCandidateRevision(
    input: WorkingCandidateAdmission,
  ): Promise<PetraWorkingCandidate> {
    return this.#admit(input.candidate, input.profileRecord);
  }

  admitWorkingRelationshipRevision(
    input: WorkingRelationshipAdmission,
  ): Promise<PetraWorkingRelationship> {
    return this.#admit(input.relationship, input.profileRecord);
  }

  /**
   * Composes canonical candidate admission into a caller-owned transaction.
   * The caller is responsible for BEGIN/COMMIT/ROLLBACK; every ordinary
   * admission continues to use the same validation and persistence path.
   */
  admitWorkingCandidateRevisionInTransaction(
    client: PoolClient,
    input: WorkingCandidateAdmission,
  ): Promise<PetraWorkingCandidate> {
    return this.#admitInTransaction(
      client,
      input.candidate,
      input.profileRecord,
    );
  }

  /** Transaction-composed counterpart for a working relationship revision. */
  admitWorkingRelationshipRevisionInTransaction(
    client: PoolClient,
    input: WorkingRelationshipAdmission,
  ): Promise<PetraWorkingRelationship> {
    return this.#admitInTransaction(
      client,
      input.relationship,
      input.profileRecord,
    );
  }

  getWorkingCandidate(
    projectId: string,
    workingCandidateId: string,
    revision?: number,
  ): Promise<PetraWorkingCandidate | undefined> {
    return this.#getWorkingRecord(
      "working-candidate",
      "working_candidates",
      "working_candidate_revisions",
      "working_candidate_id",
      projectId,
      workingCandidateId,
      revision,
    );
  }

  getWorkingRelationship(
    projectId: string,
    workingRelationshipId: string,
    revision?: number,
  ): Promise<PetraWorkingRelationship | undefined> {
    return this.#getWorkingRecord(
      "working-relationship",
      "working_relationships",
      "working_relationship_revisions",
      "working_relationship_id",
      projectId,
      workingRelationshipId,
      revision,
    );
  }

  async #admit<RecordType extends WorkingRecord>(
    record: RecordType,
    profileRecord: ProfileRecord,
  ): Promise<RecordType> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const admitted = await this.#admitInTransaction(
        client,
        record,
        profileRecord,
      );
      await client.query("COMMIT");
      return admitted;
    } catch (error) {
      await client.query("ROLLBACK");
      throw this.#mappedError(error);
    } finally {
      client.release();
    }
  }

  async #admitInTransaction<RecordType extends WorkingRecord>(
    client: PoolClient,
    record: RecordType,
    profileRecord: ProfileRecord,
  ): Promise<RecordType> {
    const working = workingDescriptor(record);
    const profile = profileRecordDescriptor(profileRecord);
    this.#contracts.assertValid(working.contractName, "1.0.0", record);
    this.#contracts.assertValid(profile.contractName, "1.0.0", profileRecord);
    if (
      isControlledWritingProfileRecord(profileRecord) &&
      profileRecord.content_hash !== canonicalHash(profileRecord.content)
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_CONFLICT",
        "The controlled-writing profile record content_hash is not its exact canonical content projection.",
      );
    }
    if (record.content_hash !== contentHash(record)) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_CONFLICT",
        "The working revision content_hash is not its exact canonical projection.",
      );
    }
    if (
      working.profileRecord.schema_name !== profileRecord.schema_name ||
      working.profileRecord.schema_version !== profileRecord.schema_version ||
      working.profileRecord.record_id !== profile.id ||
      working.profileRecord.revision !== profile.revision ||
      working.profileRecord.record_hash !== canonicalHash(profileRecord) ||
      record.validation.target_record_hash !== canonicalHash(profileRecord)
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_RELATION_INVALID",
        "The profile binding and validation target must name the exact supplied profile record.",
      );
    }
    const profilePairIsSupported =
      (record.schema_name === "petra.working-candidate" &&
        ["petra.claim", "petra.controlled-writing-requirement"].includes(
          profileRecord.schema_name,
        )) ||
      (record.schema_name === "petra.working-relationship" &&
        [
          "petra.assertion",
          "petra.controlled-writing-governing-relationship",
        ].includes(profileRecord.schema_name));
    if (!profilePairIsSupported) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "The WorkingCandidate or WorkingRelationship does not match an installed profile-record adapter.",
      );
    }

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [working.id],
    );

    const retry = await client.query<StoredPayloadRow>(
      `SELECT record_hash, payload
           FROM petra.${working.revisionTable}
          WHERE ${working.idColumn} = $1 AND revision = $2`,
      [working.id, record.revision],
    );
    if (retry.rows[0] !== undefined) {
      if (retry.rows[0].record_hash !== canonicalHash(record)) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_CONFLICT",
          "The working ID and revision are already bound to different canonical content.",
        );
      }
      this.#contracts.assertValid(
        working.contractName,
        "1.0.0",
        retry.rows[0].payload,
      );
      return clone(retry.rows[0].payload as RecordType);
    }

    const definition = await this.#requireCurrentDefinition(client, record);
    this.#requireRegisteredProfile(record, definition);
    await this.#validateAuthoritativeBase(client, record);
    await this.#validateProfileProjectScope(client, record, profileRecord);
    await this.#validateActors(client, record, profileRecord);
    await this.#validateProducer(client, record, definition);
    await this.#validateTaskAndSnapshot(client, record);
    await this.#validateRecordReferences(client, record);
    await this.#validateWorkingLineage(client, record);
    await this.#persistProfileRevision(client, record, profileRecord);
    if (record.schema_name === "petra.working-relationship") {
      await this.#validateRelationshipEndpoints(client, record, profileRecord);
    }
    await this.#insertWorkingRevision(client, record);
    return clone(record);
  }

  #mappedError(error: unknown): unknown {
    if (error instanceof PostgresWorkingStateError || !(error instanceof Error))
      return error;
    const pgCode = (error as Error & { code?: string }).code;
    if (pgCode === "23503") {
      return new PostgresWorkingStateError(
        "WORKING_STATE_REFERENCE_MISSING",
        error.message,
      );
    }
    if (pgCode === "23505") {
      return new PostgresWorkingStateError(
        "WORKING_STATE_CONFLICT",
        error.message,
      );
    }
    if (["23514", "40001", "55000"].includes(pgCode ?? "")) {
      return new PostgresWorkingStateError(
        pgCode === "40001"
          ? "WORKING_STATE_STALE"
          : "WORKING_STATE_RELATION_INVALID",
        error.message,
      );
    }
    return error;
  }

  async #requireCurrentDefinition(
    client: PoolClient,
    record: WorkingRecord,
  ): Promise<PetraProjectDefinition> {
    const ref = record.project_definition_ref;
    const result = await client.query<DefinitionRow>(
      `SELECT revision.definition_family, revision.content_hash,
              revision.payload
         FROM petra.project_definitions AS head
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = head.project_definition_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.project_definition_id = $2
          AND head.current_revision = $3`,
      [record.project_id, ref.project_definition_id, ref.revision],
    );
    const row = result.rows[0];
    if (
      row === undefined ||
      row.content_hash !== ref.content_hash ||
      row.definition_family !== ref.definition_family
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_STALE",
        "Working admission requires the exact current ProjectDefinition revision, family, and content hash.",
      );
    }
    this.#contracts.assertValid("project-definition", "1.0.0", row.payload);
    const definition = row.payload as PetraProjectDefinition;
    if (
      !["petra.scientific-evidence", "petra.controlled-writing"].includes(
        definition.definition_family,
      )
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "No installed working-state adapter supports the current ProjectDefinition family.",
      );
    }
    return definition;
  }

  #requireRegisteredProfile(
    record: WorkingRecord,
    definition: PetraProjectDefinition,
  ): void {
    const binding =
      record.schema_name === "petra.working-candidate"
        ? record.profile_object
        : record.profile_relationship;
    const registration = definition.content.registrations.find(
      (candidate) =>
        candidate.registration_kind ===
          binding.registration.registration_kind &&
        candidate.semantic_key === binding.registration.semantic_key &&
        sameNamedRef(candidate.contract, binding.registration.contract),
    );
    const contract = binding.registration.contract;
    if (contract.name !== workingDescriptor(record).profileRecord.schema_name) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "The working profile record schema does not match its exact registered contract.",
      );
    }
    const installed = this.#contracts.entries.find(
      (entry) =>
        `petra.${entry.name}` === contract.name &&
        entry.version === contract.version &&
        entry.canonical_sha256 === contract.content_hash,
    );
    const supported =
      record.schema_name === "petra.working-candidate"
        ? (definition.definition_family === "petra.scientific-evidence" &&
            binding.registration.semantic_key === "scientific.claim" &&
            contract.name === "petra.claim" &&
            contract.version === "1.0.0") ||
          (definition.definition_family === "petra.controlled-writing" &&
            binding.registration.semantic_key === "writing.requirement" &&
            contract.name === "petra.controlled-writing-requirement" &&
            contract.version === "1.0.0" &&
            installed?.name === "controlled-writing-requirement")
        : (definition.definition_family === "petra.scientific-evidence" &&
            binding.registration.semantic_key === "scientific.assertion" &&
            contract.name === "petra.assertion" &&
            contract.version === "1.0.0" &&
            record.profile_relationship.predicate === "ASSERTS") ||
          (definition.definition_family === "petra.controlled-writing" &&
            binding.registration.semantic_key === "writing.governs" &&
            contract.name ===
              "petra.controlled-writing-governing-relationship" &&
            contract.version === "1.0.0" &&
            installed?.name === "controlled-writing-governing-relationship" &&
            record.profile_relationship.predicate === "GOVERNS");
    if (registration === undefined || !supported) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "The object or predicate is not an exact supported registration in the current ProjectDefinition.",
      );
    }
    for (const result of record.validation.results) {
      const validator = definition.content.registrations.find(
        (candidate) =>
          candidate.registration_kind === "validator" &&
          sameNamedRef(candidate.contract, result.validator_ref),
      );
      if (validator === undefined) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_PROFILE_UNSUPPORTED",
          "Every validation result must resolve to an exact validator registration in the current ProjectDefinition.",
        );
      }
    }
  }

  async #validateAuthoritativeBase(
    client: PoolClient,
    record: WorkingRecord,
  ): Promise<void> {
    const binding =
      record.schema_name === "petra.working-candidate"
        ? record.profile_object
        : record.profile_relationship;
    if (binding.candidate_operation === "create") return;
    const ref = binding.current_authoritative_ref;
    if (
      binding.registration.semantic_key === "writing.requirement" ||
      binding.registration.semantic_key === "writing.governs"
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "Controlled-writing admission is candidate-only; no authoritative revision or Apply path is installed.",
      );
    }
    const expectedSchema =
      record.schema_name === "petra.working-candidate"
        ? "petra.claim"
        : "petra.assertion";
    if (
      ref === undefined ||
      ref.schema_name !== expectedSchema ||
      ref.schema_version !== "1.0.0"
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "A profile revision must name an exact current authoritative record of the registered type.",
      );
    }
    const result = await client.query(
      `SELECT true
         FROM petra.evidence_entities AS head
         JOIN petra.evidence_entity_revisions AS revision
           ON revision.evidence_id = head.evidence_id
          AND revision.evidence_kind = head.evidence_kind
          AND revision.revision = head.current_revision
        WHERE revision.evidence_id = $1
          AND revision.revision = $2
          AND revision.record_hash = $3
          AND revision.evidence_kind = $4
          AND revision.authority_zone = 'trusted'
          AND (
            ($4 = 'claim' AND EXISTS (
              SELECT 1
                FROM petra.claim_revisions AS claim
                JOIN petra.project_sources AS source_head
                  ON source_head.project_id = $5
                JOIN petra.project_source_revisions AS source
                  ON source.project_source_id = source_head.project_source_id
                 AND source.revision = source_head.current_revision
                 AND source.work_version_id = claim.source_work_version_id
               WHERE claim.claim_id = revision.evidence_id
                 AND claim.revision = revision.revision
            ))
            OR ($4 = 'assertion' AND EXISTS (
              SELECT 1
                FROM petra.assertion_revisions AS assertion
                JOIN petra.project_sources AS source_head
                  ON source_head.project_id = $5
                JOIN petra.project_source_revisions AS source
                  ON source.project_source_id = source_head.project_source_id
                 AND source.revision = source_head.current_revision
                 AND source.work_version_id = assertion.subject_id
               WHERE assertion.assertion_id = revision.evidence_id
                 AND assertion.revision = revision.revision
            ))
          )`,
      [
        ref.record_id,
        ref.revision,
        ref.record_hash,
        expectedSchema === "petra.claim" ? "claim" : "assertion",
        record.project_id,
      ],
    );
    if (result.rows[0] === undefined) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_STALE",
        "The current authoritative profile base is missing, historical, mismatched, or not trusted.",
      );
    }
  }

  async #validateProfileProjectScope(
    client: PoolClient,
    record: WorkingRecord,
    profileRecord: ProfileRecord,
  ): Promise<void> {
    if (isControlledWritingProfileRecord(profileRecord)) {
      const definition = profileRecord.project_definition_ref;
      if (
        profileRecord.project_id !== record.project_id ||
        definition.project_definition_id !==
          record.project_definition_ref.project_definition_id ||
        definition.revision !== record.project_definition_ref.revision ||
        definition.content_hash !==
          record.project_definition_ref.content_hash ||
        definition.definition_family !== "petra.controlled-writing" ||
        profileRecord.revision !== 1
      ) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_RELATION_INVALID",
          "The controlled-writing profile payload must bind the same exact Project and current ProjectDefinition as its working record.",
        );
      }
      const refs =
        profileRecord.schema_name === "petra.controlled-writing-requirement"
          ? profileRecord.content.applies_to_refs
          : [
              profileRecord.content.authority_source_ref,
              profileRecord.content.requirement_ref,
            ];
      if (
        profileRecord.schema_name ===
          "petra.controlled-writing-governing-relationship" &&
        (profileRecord.content.authority_source_ref.schema_name !==
          "petra.project-source" ||
          profileRecord.content.authority_source_ref.schema_version !==
            "1.0.0" ||
          profileRecord.content.requirement_ref.schema_name !==
            "petra.controlled-writing-requirement" ||
          profileRecord.content.requirement_ref.schema_version !== "1.0.0")
      ) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_PROFILE_UNSUPPORTED",
          "A controlled-writing GOVERNS payload requires an exact ProjectSource and controlled-writing Requirement.",
        );
      }
      for (const ref of refs) {
        await this.#requireExactRecordRef(
          client,
          record.project_id,
          ref,
          false,
        );
      }
      return;
    }
    const workVersionId =
      profileRecord.schema_name === "petra.claim"
        ? profileRecord.basis.basis_kind === "source"
          ? profileRecord.basis.work_version_id
          : undefined
        : profileRecord.predicate === "ASSERTS"
          ? profileRecord.subject_id
          : undefined;
    if (workVersionId === undefined) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "The first scientific adapter accepts source-derived Claims and ASSERTS relationships only.",
      );
    }
    const result = await client.query(
      `SELECT true
         FROM petra.project_sources AS head
         JOIN petra.project_source_revisions AS revision
           ON revision.project_source_id = head.project_source_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND revision.work_version_id = $2`,
      [record.project_id, workVersionId],
    );
    if (result.rows[0] === undefined) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_REFERENCE_MISSING",
        "The scientific profile record is not grounded in an exact Project-bound WorkVersion.",
      );
    }
  }

  async #validateActors(
    client: PoolClient,
    record: WorkingRecord,
    profileRecord: ProfileRecord,
  ): Promise<void> {
    const actors: ActorRef[] = [
      record.created_by,
      record.producer.actor,
      profileRecord.created_by,
      ...record.validation.results.map((result) => result.validated_by),
    ];
    if (profileRecord.schema_name === "petra.claim") {
      actors.push(basisActor(profileRecord));
    } else if (profileRecord.schema_name === "petra.assertion") {
      for (const provenance of profileRecord.provenance_refs) {
        if (provenance.provenance_kind === "actor")
          actors.push(provenance.actor);
      }
    }
    for (const actor of actors) {
      const result = await client.query<{ actor_kind: ActorRef["actor_kind"] }>(
        "SELECT actor_kind FROM petra.actors WHERE actor_id = $1",
        [actor.actor_id],
      );
      if (result.rows[0]?.actor_kind !== actor.actor_kind) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_REFERENCE_MISSING",
          "Working authorship, production, and validation require exact registered Actor identities.",
        );
      }
    }
  }

  async #validateProducer(
    client: PoolClient,
    record: WorkingRecord,
    definition: PetraProjectDefinition,
  ): Promise<void> {
    if (record.producer.producer_kind === "human") return;
    const roleRef =
      record.producer.producer_kind === "model"
        ? record.producer.model_role_ref
        : record.producer.service_role_ref;
    const roleRegistration = definition.content.registrations.find(
      (registration) =>
        (record.producer.producer_kind === "model"
          ? registration.registration_kind === "model_role"
          : ["tool", "workflow", "extension"].includes(
              registration.registration_kind,
            )) && sameNamedRef(registration.contract, roleRef),
    );
    if (roleRegistration === undefined) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "The producer role must resolve exactly through the current ProjectDefinition.",
      );
    }
    if (record.producer.producer_kind === "model") {
      await this.#requireExactRecordRef(
        client,
        record.project_id,
        record.producer.model_call_ref,
        true,
      );
    }
  }

  async #validateTaskAndSnapshot(
    client: PoolClient,
    record: WorkingRecord,
  ): Promise<void> {
    const task = record.task_context;
    await this.#requireExactRecordRef(
      client,
      record.project_id,
      task.objective_ref,
      true,
    );
    if (task.task_kind !== "thread_turn") {
      await this.#requireExactRecordRef(
        client,
        record.project_id,
        task.work_unit_ref,
        true,
      );
    }
    if (task.task_kind !== "work_unit") {
      await this.#requireExactRecordRef(
        client,
        record.project_id,
        task.thread_binding.project_thread_ref,
        true,
      );
      const turn = await client.query<{ present: boolean }>(
        `SELECT true AS present
           FROM petra.project_thread_turn_bindings
          WHERE project_thread_id = $1
            AND thread_revision = $2
            AND project_turn_id = $3
            AND project_id = $4
            AND snapshot_id = $5
            AND snapshot_revision = $6
            AND snapshot_event_position = $7
            AND snapshot_hash = $8`,
        [
          task.thread_binding.project_thread_ref.record_id,
          task.thread_binding.project_thread_ref.revision,
          task.thread_binding.project_turn_id,
          record.project_id,
          record.input_snapshot.snapshot_ref.snapshot_id,
          record.input_snapshot.snapshot_ref.revision,
          record.input_snapshot.snapshot_ref.event_position,
          record.input_snapshot.snapshot_ref.content_hash,
        ],
      );
      if (turn.rows[0] === undefined) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_REFERENCE_MISSING",
          "The thread turn does not resolve under the supplied exact input snapshot.",
        );
      }
    }
    if (task.task_kind === "interaction_work") {
      await this.#requireExactRecordRef(
        client,
        record.project_id,
        task.interaction_run_ref,
        true,
      );
    }

    const position = await client.query<{ event_position: string }>(
      "SELECT event_position FROM petra.authority_positions WHERE singleton",
    );
    if (
      Number(position.rows[0]?.event_position ?? -1) <
      record.input_snapshot.snapshot_ref.event_position
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_STALE",
        "The input snapshot cannot name an authority position that has not occurred.",
      );
    }
    if (record.input_snapshot.context_packet_ref !== undefined) {
      await this.#requireExactRecordRef(
        client,
        record.project_id,
        record.input_snapshot.context_packet_ref,
        false,
      );
      const context = await client.query<{
        content_hash: string;
        snapshot_id: string;
        snapshot_revision: string;
        snapshot_event_position: string;
        snapshot_hash: string;
      }>(
        `SELECT content_hash, snapshot_id, snapshot_revision, snapshot_event_position,
                snapshot_hash
           FROM petra.context_packets
          WHERE context_packet_id = $1`,
        [record.input_snapshot.context_packet_ref.record_id],
      );
      const row = context.rows[0];
      const snapshot = record.input_snapshot.snapshot_ref;
      if (
        row === undefined ||
        row.snapshot_id !== snapshot.snapshot_id ||
        Number(row.snapshot_revision) !== snapshot.revision ||
        Number(row.snapshot_event_position) !== snapshot.event_position ||
        row.snapshot_hash !== snapshot.content_hash
      ) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_RELATION_INVALID",
          "The ContextPacket and working input snapshot must identify the same exact Project snapshot.",
        );
      }
      if (record.producer.producer_kind === "model") {
        const modelBinding = await client.query(
          `SELECT true
             FROM petra.model_calls AS call
             JOIN petra.model_requests AS request
               ON request.model_request_id = call.model_request_id
            WHERE call.model_call_id = $1
              AND call.payload #>> '{content,input,context_packet_ref,context_packet_id}' = $2
              AND call.payload #>> '{content,input,context_packet_ref,content_hash}' = $3
              AND request.payload #>> '{content,context_packet_ref,context_packet_id}' = $2
              AND request.payload #>> '{content,context_packet_ref,content_hash}' = $3`,
          [
            record.producer.model_call_ref.record_id,
            record.input_snapshot.context_packet_ref.record_id,
            row.content_hash,
          ],
        );
        if (modelBinding.rows[0] === undefined) {
          throw new PostgresWorkingStateError(
            "WORKING_STATE_RELATION_INVALID",
            "The model call, request, and ContextPacket do not share the exact input binding.",
          );
        }
      }
    }
    if (
      record.producer.producer_kind === "model" &&
      record.input_snapshot.context_packet_ref === undefined
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_REFERENCE_MISSING",
        "Model-produced working state requires an exact ContextPacket binding.",
      );
    }
  }

  async #validateRecordReferences(
    client: PoolClient,
    record: WorkingRecord,
  ): Promise<void> {
    const refs: WorkingCandidateExactRecordRef[] = [
      ...record.input_snapshot.input_record_refs,
      ...record.origin.source_record_refs,
      ...record.basis.map((item) => item.record_ref),
      ...record.provenance.map((item) => item.record_ref),
      ...record.qualifications.statements.flatMap((statement) =>
        statement.basis_ref === undefined ? [] : [statement.basis_ref],
      ),
    ];
    for (const ref of refs) {
      await this.#requireExactRecordRef(client, record.project_id, ref, false);
    }
  }

  async #requireExactRecordRef(
    client: PoolClient,
    projectId: string,
    ref: WorkingCandidateExactRecordRef,
    requireCurrent: boolean,
  ): Promise<void> {
    let query: string;
    const values: unknown[] = [ref.record_id, ref.revision, ref.record_hash];
    switch (ref.schema_name) {
      case "petra.project-objective":
        query = `SELECT true
                   FROM petra.project_objective_revisions AS revision
                   JOIN petra.project_objectives AS head
                     ON head.objective_id = revision.objective_id
                  WHERE revision.objective_id = $1 AND revision.revision = $2
                    AND revision.record_hash = $3 AND revision.project_id = $4
                    AND ($5::boolean = false OR head.current_revision = revision.revision)`;
        values.push(projectId, requireCurrent);
        break;
      case "petra.work-unit":
        query = `SELECT true
                   FROM petra.work_unit_revisions AS revision
                   JOIN petra.work_units AS head
                     ON head.work_unit_id = revision.work_unit_id
                  WHERE revision.work_unit_id = $1 AND revision.revision = $2
                    AND revision.record_hash = $3 AND revision.project_id = $4
                    AND ($5::boolean = false OR head.current_revision = revision.revision)`;
        values.push(projectId, requireCurrent);
        break;
      case "petra.project-thread":
        query = `SELECT true
                   FROM petra.project_thread_revisions AS revision
                   JOIN petra.project_threads AS head
                     ON head.project_thread_id = revision.project_thread_id
                  WHERE revision.project_thread_id = $1 AND revision.revision = $2
                    AND revision.record_hash = $3 AND revision.project_id = $4
                    AND ($5::boolean = false OR head.current_revision = revision.revision)`;
        values.push(projectId, requireCurrent);
        break;
      case "petra.interaction-run":
        query = `SELECT true
                   FROM petra.interaction_run_revisions AS revision
                   JOIN petra.interaction_runs AS head
                     ON head.interaction_run_id = revision.interaction_run_id
                  WHERE revision.interaction_run_id = $1 AND revision.revision = $2
                    AND revision.record_hash = $3 AND revision.project_id = $4
                    AND ($5::boolean = false OR head.current_revision = revision.revision)`;
        values.push(projectId, requireCurrent);
        break;
      case "petra.context-packet":
        query = `SELECT true FROM petra.context_packets
                  WHERE context_packet_id = $1 AND revision = $2
                    AND record_hash = $3 AND project_id = $4`;
        values.push(projectId);
        break;
      case "petra.model-call":
        query = `SELECT true
                   FROM petra.model_calls AS call
                   JOIN petra.model_requests AS request
                     ON request.model_request_id = call.model_request_id
                  WHERE call.model_call_id = $1 AND call.revision = $2
                    AND call.record_hash = $3 AND request.project_id = $4
                    AND call.outcome = 'success'
                    AND request.role = 'extractor'
                    AND request.terminal_state = 'completed'`;
        values.push(projectId);
        break;
      case "petra.evidence-proposal-bundle":
        query = `SELECT true FROM petra.model_evidence_proposal_bundles
                  WHERE evidence_proposal_bundle_id = $1 AND revision = $2
                    AND record_hash = $3 AND project_id = $4`;
        values.push(projectId);
        break;
      case "petra.source-span":
        query = `SELECT true
                   FROM petra.source_spans AS span
                   JOIN petra.parsed_documents AS document
                     ON document.parsed_document_id = span.parsed_document_id
                   JOIN petra.project_source_revisions AS source
                     ON source.work_version_id = document.work_version_id
                  WHERE span.source_span_id = $1 AND span.revision = $2
                    AND span.record_hash = $3 AND source.project_id = $4`;
        values.push(projectId);
        break;
      case "petra.work-version":
        query = `SELECT true
                   FROM petra.canonical_entity_revisions AS revision
                   JOIN petra.project_source_revisions AS source
                     ON source.work_version_id = revision.entity_id
                    AND source.work_version_revision = revision.revision
                  WHERE revision.entity_id = $1 AND revision.revision = $2
                    AND revision.record_hash = $3 AND source.project_id = $4`;
        values.push(projectId);
        break;
      case "petra.project-source":
        query = `SELECT true
                   FROM petra.project_source_revisions AS revision
                   JOIN petra.project_sources AS head
                     ON head.project_source_id = revision.project_source_id
                  WHERE revision.project_source_id = $1
                    AND revision.revision = $2
                    AND revision.record_hash = $3
                    AND revision.project_id = $4
                    AND revision.status = 'active'
                    AND ($5::boolean = false OR head.current_revision = revision.revision)`;
        values.push(projectId, requireCurrent);
        break;
      case "petra.claim":
      case "petra.assertion":
        query = `SELECT true
                   FROM petra.evidence_entity_revisions AS revision
                  WHERE revision.evidence_id = $1 AND revision.revision = $2
                    AND revision.record_hash = $3
                    AND revision.evidence_kind = $4
                    AND (
                      ($4 = 'claim' AND EXISTS (
                        SELECT 1
                          FROM petra.claim_revisions AS claim
                          JOIN petra.project_source_revisions AS source
                            ON source.work_version_id = claim.source_work_version_id
                         WHERE claim.claim_id = revision.evidence_id
                           AND claim.revision = revision.revision
                           AND source.project_id = $5
                      ))
                      OR ($4 = 'assertion' AND EXISTS (
                        SELECT 1
                          FROM petra.assertion_revisions AS assertion
                          JOIN petra.project_source_revisions AS source
                            ON source.work_version_id = assertion.subject_id
                         WHERE assertion.assertion_id = revision.evidence_id
                           AND assertion.revision = revision.revision
                           AND source.project_id = $5
                      ))
                    )`;
        values.push(
          ref.schema_name === "petra.claim" ? "claim" : "assertion",
          projectId,
        );
        break;
      case "petra.controlled-writing-requirement":
        query = `SELECT true
                   FROM petra.controlled_writing_requirement_records
                  WHERE requirement_id = $1 AND revision = $2
                    AND record_hash = $3 AND project_id = $4`;
        values.push(projectId);
        break;
      case "petra.controlled-writing-governing-relationship":
        query = `SELECT true
                   FROM petra.controlled_writing_governing_relationship_records
                  WHERE governing_relationship_id = $1 AND revision = $2
                    AND record_hash = $3 AND project_id = $4`;
        values.push(projectId);
        break;
      case "petra.working-candidate":
        query = `SELECT true FROM petra.working_candidate_revisions
                  WHERE working_candidate_id = $1 AND revision = $2
                    AND record_hash = $3 AND project_id = $4`;
        values.push(projectId);
        break;
      case "petra.working-relationship":
        query = `SELECT true FROM petra.working_relationship_revisions
                  WHERE working_relationship_id = $1 AND revision = $2
                    AND record_hash = $3 AND project_id = $4`;
        values.push(projectId);
        break;
      default:
        throw new PostgresWorkingStateError(
          "WORKING_STATE_PROFILE_UNSUPPORTED",
          `Exact working reference schema ${ref.schema_name} has no installed working-state resolver.`,
        );
    }
    if (ref.schema_version !== "1.0.0") {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        `Exact working reference version ${ref.schema_version} is unsupported.`,
      );
    }
    const result = await client.query(query, values);
    if (result.rows[0] === undefined) {
      throw new PostgresWorkingStateError(
        requireCurrent
          ? "WORKING_STATE_STALE"
          : "WORKING_STATE_REFERENCE_MISSING",
        `Exact working reference ${ref.schema_name}/${ref.record_id}/${ref.revision} did not resolve in the Project boundary.`,
      );
    }
  }

  async #validateWorkingLineage(
    client: PoolClient,
    record: WorkingRecord,
  ): Promise<void> {
    const descriptor = workingDescriptor(record);
    const head = await client.query<{
      current_revision: string;
      project_id: string;
      profile_semantic_key: string;
      created_by_actor_id: string;
      created_by_actor_kind: string;
      created_at: Date;
    }>(
      `SELECT current_revision, project_id, profile_semantic_key,
              created_by_actor_id, created_by_actor_kind, created_at
         FROM petra.${descriptor.table}
        WHERE ${descriptor.idColumn} = $1`,
      [descriptor.id],
    );
    const current = head.rows[0];
    if (record.revision === 1) {
      if (current !== undefined || record.lineage.lineage_kind !== "root") {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_CONFLICT",
          "A working root must create a new identity at revision 1.",
        );
      }
      return;
    }
    if (
      current === undefined ||
      Number(current.current_revision) + 1 !== record.revision ||
      current.project_id !== record.project_id ||
      current.profile_semantic_key !== descriptor.profileSemanticKey ||
      current.created_by_actor_id !== record.created_by.actor_id ||
      current.created_by_actor_kind !== record.created_by.actor_kind ||
      current.created_at.toISOString() !== record.created_at ||
      record.lineage.lineage_kind !== "supersession"
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_STALE",
        "A correction must be contiguous with the exact current working head and preserve immutable identity fields.",
      );
    }
    const prior = await client.query<{ content_hash: string }>(
      `SELECT content_hash
         FROM petra.${descriptor.revisionTable}
        WHERE ${descriptor.idColumn} = $1 AND revision = $2`,
      [descriptor.id, record.revision - 1],
    );
    const supersedesId =
      record.schema_name === "petra.working-candidate"
        ? record.lineage.supersedes.working_candidate_id
        : record.lineage.supersedes.working_relationship_id;
    if (
      supersedesId !== descriptor.id ||
      record.lineage.supersedes.revision !== record.revision - 1 ||
      record.lineage.supersedes.content_hash !== prior.rows[0]?.content_hash
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_STALE",
        "Working supersession must name the exact current prior revision and content hash.",
      );
    }
  }

  async #persistProfileRevision(
    client: PoolClient,
    record: WorkingRecord,
    profileRecord: ProfileRecord,
  ): Promise<void> {
    if (isControlledWritingProfileRecord(profileRecord)) {
      await this.#persistControlledWritingProfileRecord(
        client,
        record,
        profileRecord,
      );
      return;
    }
    const descriptor = profileRecordDescriptor(profileRecord);
    const current = await client.query<EvidenceRow>(
      `SELECT revision.evidence_kind, revision.revision,
              revision.authority_zone, revision.record_hash, revision.payload
         FROM petra.evidence_entities AS head
         JOIN petra.evidence_entity_revisions AS revision
           ON revision.evidence_id = head.evidence_id
          AND revision.evidence_kind = head.evidence_kind
          AND revision.revision = head.current_revision
        WHERE head.evidence_id = $1`,
      [descriptor.id],
    );
    const head = current.rows[0];
    if (
      head !== undefined &&
      Number(head.revision) === descriptor.revision &&
      head.evidence_kind === descriptor.evidenceKind &&
      head.record_hash === canonicalHash(profileRecord)
    ) {
      return;
    }
    if (
      descriptor.revision <= 1 ||
      head === undefined ||
      head.evidence_kind !== descriptor.evidenceKind ||
      head.authority_zone !== "quarantine" ||
      Number(head.revision) + 1 !== descriptor.revision
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_STALE",
        "The profile correction must advance the exact current quarantine evidence head once.",
      );
    }
    const expectedSupersedes =
      profileRecord.schema_name === "petra.claim"
        ? profileRecord.supersedes_claim_id
        : profileRecord.supersedes_assertion_id;
    if (expectedSupersedes !== descriptor.id) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_RELATION_INVALID",
        "A corrected scientific profile record must supersede its stable evidence identity.",
      );
    }
    const resolver = await this.#buildEvidenceResolver(client, profileRecord);
    try {
      if (profileRecord.schema_name === "petra.claim") {
        validateWorkingClaimRevision(profileRecord, resolver);
      } else {
        validateWorkingAssertionRevision(profileRecord, resolver);
      }
    } catch (error) {
      if (error instanceof EvidenceProposalError) {
        throw new PostgresWorkingStateError(
          error.code.endsWith("NOT_REGISTERED")
            ? "WORKING_STATE_REFERENCE_MISSING"
            : "WORKING_STATE_RELATION_INVALID",
          `${error.code}: ${error.message}`,
        );
      }
      throw error;
    }
    await insertEvidenceRecordRevision(client, profileRecord, {
      admissionKind: "working_correction",
      recordedAt: descriptor.recordedAt,
      createIdentity: false,
    });
    await client.query(
      `UPDATE petra.evidence_entities
          SET current_revision = $2
        WHERE evidence_id = $1 AND current_revision = $3`,
      [descriptor.id, descriptor.revision, descriptor.revision - 1],
    );
  }

  async #persistControlledWritingProfileRecord(
    client: PoolClient,
    workingRecord: WorkingRecord,
    profileRecord:
      | PetraControlledWritingRequirement
      | PetraControlledWritingGoverningRelationship,
  ): Promise<void> {
    if (
      workingRecord.revision !== 1 ||
      profileRecord.revision !== 1 ||
      (workingRecord.schema_name === "petra.working-candidate"
        ? workingRecord.profile_object.candidate_operation !== "create"
        : workingRecord.profile_relationship.candidate_operation !== "create")
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "Controlled-writing profile storage accepts root candidates only; no correction or Apply path is installed.",
      );
    }
    const descriptor = profileRecordDescriptor(profileRecord);
    const table =
      profileRecord.schema_name === "petra.controlled-writing-requirement"
        ? "controlled_writing_requirement_records"
        : "controlled_writing_governing_relationship_records";
    const idColumn =
      profileRecord.schema_name === "petra.controlled-writing-requirement"
        ? "requirement_id"
        : "governing_relationship_id";
    const existing = await client.query<StoredPayloadRow>(
      `SELECT record_hash, payload
         FROM petra.${table}
        WHERE ${idColumn} = $1 AND revision = $2`,
      [descriptor.id, descriptor.revision],
    );
    if (existing.rows[0] !== undefined) {
      if (existing.rows[0].record_hash !== canonicalHash(profileRecord)) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_CONFLICT",
          "The controlled-writing profile record identity is already bound to different canonical content.",
        );
      }
      return;
    }
    const commonValues = [
      descriptor.id,
      descriptor.revision,
      profileRecord.project_id,
      profileRecord.project_definition_ref.project_definition_id,
      profileRecord.project_definition_ref.revision,
      profileRecord.project_definition_ref.content_hash,
    ];
    if (profileRecord.schema_name === "petra.controlled-writing-requirement") {
      await client.query(
        `INSERT INTO petra.controlled_writing_requirement_records (
           requirement_id, revision, project_id, project_definition_id,
           project_definition_revision, project_definition_content_hash,
           content_hash, record_hash, created_by_actor_id,
           created_by_actor_kind, created_at, schema_name, schema_version,
           payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11::timestamptz, $12, $13, $14::jsonb
         )`,
        [
          ...commonValues,
          profileRecord.content_hash,
          canonicalHash(profileRecord),
          profileRecord.created_by.actor_id,
          profileRecord.created_by.actor_kind,
          profileRecord.created_at,
          profileRecord.schema_name,
          profileRecord.schema_version,
          JSON.stringify(profileRecord),
        ],
      );
      return;
    }
    await client.query(
      `INSERT INTO petra.controlled_writing_governing_relationship_records (
         governing_relationship_id, revision, project_id,
         project_definition_id, project_definition_revision,
         project_definition_content_hash, requirement_id,
         requirement_revision, requirement_record_hash, content_hash,
         record_hash, created_by_actor_id, created_by_actor_kind, created_at,
         schema_name, schema_version, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13, $14::timestamptz, $15, $16, $17::jsonb
       )`,
      [
        ...commonValues,
        profileRecord.content.requirement_ref.record_id,
        profileRecord.content.requirement_ref.revision,
        profileRecord.content.requirement_ref.record_hash,
        profileRecord.content_hash,
        canonicalHash(profileRecord),
        profileRecord.created_by.actor_id,
        profileRecord.created_by.actor_kind,
        profileRecord.created_at,
        profileRecord.schema_name,
        profileRecord.schema_version,
        JSON.stringify(profileRecord),
      ],
    );
  }

  async #buildEvidenceResolver(
    client: PoolClient,
    record: PetraClaim | PetraAssertion,
  ): Promise<EvidenceProposalResolver> {
    const sourceSpanIds = new Set<string>();
    const claimIds = new Set<string>();
    const assertionIds = new Set<string>();
    if (record.schema_name === "petra.claim") {
      if (record.basis.basis_kind === "source") {
        record.basis.source_span_ids.forEach((id) => sourceSpanIds.add(id));
      } else if (record.basis.basis_kind === "synthesis") {
        record.basis.basis_claim_ids.forEach((id) => claimIds.add(id));
        record.basis.basis_assertion_ids.forEach((id) => assertionIds.add(id));
      }
    } else {
      for (const provenance of record.provenance_refs) {
        if (provenance.provenance_kind === "source_span") {
          sourceSpanIds.add(provenance.source_span_id);
        }
      }
      if (record.object.object_kind === "entity") {
        claimIds.add(record.object.entity_id);
      }
    }
    const spans =
      sourceSpanIds.size === 0
        ? {
            rows: [] as {
              source_span_id: string;
              parsed_document_id: string;
              verification_status: string;
            }[],
          }
        : await client.query<{
            source_span_id: string;
            parsed_document_id: string;
            verification_status: string;
          }>(
            `SELECT source_span_id, parsed_document_id, verification_status
               FROM petra.source_spans
              WHERE source_span_id = ANY($1::text[])`,
            [[...sourceSpanIds]],
          );
    const documents =
      spans.rows.length === 0
        ? {
            rows: [] as {
              parsed_document_id: string;
              work_version_id: string;
            }[],
          }
        : await client.query<{
            parsed_document_id: string;
            work_version_id: string;
          }>(
            `SELECT parsed_document_id, work_version_id
               FROM petra.parsed_documents
              WHERE parsed_document_id = ANY($1::text[])`,
            [[...new Set(spans.rows.map((row) => row.parsed_document_id))]],
          );
    const evidenceIds = [...claimIds, ...assertionIds];
    const evidence =
      evidenceIds.length === 0
        ? {
            rows: [] as {
              evidence_id: string;
              evidence_kind: string;
              payload: unknown;
            }[],
          }
        : await client.query<{
            evidence_id: string;
            evidence_kind: string;
            payload: unknown;
          }>(
            `SELECT head.evidence_id, head.evidence_kind, revision.payload
               FROM petra.evidence_entities AS head
               JOIN petra.evidence_entity_revisions AS revision
                 ON revision.evidence_id = head.evidence_id
                AND revision.revision = head.current_revision
              WHERE head.evidence_id = ANY($1::text[])`,
            [evidenceIds],
          );
    const claims = new Map<string, PetraClaim>();
    const assertions = new Map<string, PetraAssertion>();
    for (const row of evidence.rows) {
      if (row.evidence_kind === "claim") {
        this.#contracts.assertValid("claim", "1.0.0", row.payload);
        claims.set(row.evidence_id, row.payload as PetraClaim);
      } else {
        this.#contracts.assertValid("assertion", "1.0.0", row.payload);
        assertions.set(row.evidence_id, row.payload as PetraAssertion);
      }
    }
    return {
      getSourceSpan: (id) => {
        const row = spans.rows.find(
          (candidate) => candidate.source_span_id === id,
        );
        return row === undefined
          ? undefined
          : {
              parsed_document_id: row.parsed_document_id,
              verification: { status: row.verification_status },
            };
      },
      getParsedDocument: (id) => {
        const row = documents.rows.find(
          (candidate) => candidate.parsed_document_id === id,
        );
        return row === undefined
          ? undefined
          : { work_version_id: row.work_version_id };
      },
      getClaim: (id) => claims.get(id),
      getAssertion: (id) => assertions.get(id),
    };
  }

  async #validateRelationshipEndpoints(
    client: PoolClient,
    relationship: PetraWorkingRelationship,
    profileRecord: ProfileRecord,
  ): Promise<void> {
    if (
      profileRecord.schema_name ===
      "petra.controlled-writing-governing-relationship"
    ) {
      if (
        relationship.profile_relationship.predicate !== "GOVERNS" ||
        profileRecord.content.predicate !== "GOVERNS" ||
        relationship.endpoints.subject.endpoint_kind !== "profile_record" ||
        relationship.endpoints.object.endpoint_kind !== "working_candidate"
      ) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_RELATION_INVALID",
          "The registered controlled-writing adapter requires an exact authority-source subject and WorkingCandidate Requirement object.",
        );
      }
      await this.#requireExactRecordRef(
        client,
        relationship.project_id,
        relationship.endpoints.subject.record_ref,
        false,
      );
      const authoritySource = await client.query<{ source_role: string }>(
        `SELECT source_role
           FROM petra.project_source_revisions
          WHERE project_source_id = $1
            AND revision = $2
            AND record_hash = $3
            AND project_id = $4
            AND status = 'active'`,
        [
          profileRecord.content.authority_source_ref.record_id,
          profileRecord.content.authority_source_ref.revision,
          profileRecord.content.authority_source_ref.record_hash,
          relationship.project_id,
        ],
      );
      const candidate = await client.query<{
        content_hash: string;
        profile_record_schema_name: string;
        profile_record_id: string;
        profile_record_revision: string;
        profile_record_hash: string;
      }>(
        `SELECT content_hash, profile_record_schema_name, profile_record_id,
                profile_record_revision, profile_record_hash
           FROM petra.working_candidate_revisions
          WHERE working_candidate_id = $1 AND revision = $2
            AND project_id = $3`,
        [
          relationship.endpoints.object.candidate_ref.working_candidate_id,
          relationship.endpoints.object.candidate_ref.revision,
          relationship.project_id,
        ],
      );
      const sourceRef = profileRecord.content.authority_source_ref;
      const requirementRef = profileRecord.content.requirement_ref;
      const subjectRef = relationship.endpoints.subject.record_ref;
      const target = candidate.rows[0];
      if (
        subjectRef.schema_name !== sourceRef.schema_name ||
        subjectRef.schema_version !== sourceRef.schema_version ||
        subjectRef.record_id !== sourceRef.record_id ||
        subjectRef.revision !== sourceRef.revision ||
        subjectRef.record_hash !== sourceRef.record_hash ||
        authoritySource.rows[0]?.source_role !== "writing.authority-source" ||
        target === undefined ||
        target.content_hash !==
          relationship.endpoints.object.candidate_ref.content_hash ||
        target.profile_record_schema_name !== requirementRef.schema_name ||
        target.profile_record_id !== requirementRef.record_id ||
        Number(target.profile_record_revision) !== requirementRef.revision ||
        target.profile_record_hash !== requirementRef.record_hash
      ) {
        throw new PostgresWorkingStateError(
          "WORKING_STATE_RELATION_INVALID",
          "The controlled-writing working endpoints must match the exact governing authority source and candidate-bound Requirement.",
        );
      }
      return;
    }
    if (profileRecord.schema_name !== "petra.assertion") {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_PROFILE_UNSUPPORTED",
        "The supplied profile record is not an installed WorkingRelationship payload.",
      );
    }
    const assertion = profileRecord;
    if (
      relationship.profile_relationship.predicate !== "ASSERTS" ||
      assertion.predicate !== "ASSERTS" ||
      assertion.object.object_kind !== "entity" ||
      relationship.endpoints.subject.endpoint_kind !== "profile_record" ||
      relationship.endpoints.object.endpoint_kind !== "working_candidate"
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_RELATION_INVALID",
        "The registered ASSERTS adapter requires a WorkVersion subject and WorkingCandidate object.",
      );
    }
    await this.#requireExactRecordRef(
      client,
      relationship.project_id,
      relationship.endpoints.subject.record_ref,
      false,
    );
    const candidate = await client.query<{
      content_hash: string;
      profile_evidence_id: string;
    }>(
      `SELECT content_hash, profile_evidence_id
         FROM petra.working_candidate_revisions
        WHERE working_candidate_id = $1 AND revision = $2
          AND project_id = $3`,
      [
        relationship.endpoints.object.candidate_ref.working_candidate_id,
        relationship.endpoints.object.candidate_ref.revision,
        relationship.project_id,
      ],
    );
    const target = candidate.rows[0];
    if (
      relationship.endpoints.subject.record_ref.schema_name !==
        "petra.work-version" ||
      relationship.endpoints.subject.record_ref.record_id !==
        assertion.subject_id ||
      target === undefined ||
      target.content_hash !==
        relationship.endpoints.object.candidate_ref.content_hash ||
      target.profile_evidence_id !== assertion.object.entity_id
    ) {
      throw new PostgresWorkingStateError(
        "WORKING_STATE_RELATION_INVALID",
        "Working endpoints must resolve exactly to the Assertion subject and candidate-bound Claim object.",
      );
    }
  }

  async #insertWorkingRevision(
    client: PoolClient,
    record: WorkingRecord,
  ): Promise<void> {
    const descriptor = workingDescriptor(record);
    if (record.revision === 1) {
      await client.query(
        `INSERT INTO petra.${descriptor.table} (
           ${descriptor.idColumn}, project_id, current_revision,
           profile_semantic_key, created_by_actor_id, created_by_actor_kind,
           created_at
         ) VALUES ($1, $2, 1, $3, $4, $5, $6::timestamptz)`,
        [
          descriptor.id,
          record.project_id,
          descriptor.profileSemanticKey,
          record.created_by.actor_id,
          record.created_by.actor_kind,
          record.created_at,
        ],
      );
    }
    const profileSchemaName = descriptor.profileRecord.schema_name;
    const profileKind =
      profileSchemaName === "petra.claim"
        ? "claim"
        : profileSchemaName === "petra.assertion"
          ? "assertion"
          : null;
    const predicate =
      record.schema_name === "petra.working-relationship"
        ? record.profile_relationship.predicate
        : undefined;
    const columns =
      record.schema_name === "petra.working-relationship"
        ? "profile_semantic_key, predicate,"
        : "profile_semantic_key,";
    const values =
      record.schema_name === "petra.working-relationship"
        ? [descriptor.profileSemanticKey, predicate]
        : [descriptor.profileSemanticKey];
    await client.query(
      `INSERT INTO petra.${descriptor.revisionTable} (
         ${descriptor.idColumn}, revision, project_id,
         project_definition_id, project_definition_revision,
         project_definition_content_hash, definition_family,
         ${columns}
         profile_record_schema_name, profile_record_id,
         profile_record_revision, profile_record_hash,
         profile_evidence_id, profile_evidence_kind,
         profile_evidence_revision, profile_evidence_record_hash,
         producer_actor_id, producer_actor_kind, task_kind,
         snapshot_id, snapshot_revision, snapshot_event_position,
         snapshot_hash, validation_state, disposition,
         schema_name, schema_version, content_hash, record_hash, payload,
         recorded_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         ${record.schema_name === "petra.working-relationship" ? "$8, $9," : "$8,"}
         $${8 + values.length}, $${9 + values.length},
         $${10 + values.length}, $${11 + values.length},
         $${12 + values.length}, $${13 + values.length}, $${14 + values.length},
         $${15 + values.length}, $${16 + values.length}, $${17 + values.length},
         $${18 + values.length}, $${19 + values.length}, $${20 + values.length},
         $${21 + values.length}, $${22 + values.length}, $${23 + values.length},
         $${24 + values.length}, $${25 + values.length}, $${26 + values.length},
         $${27 + values.length}, $${28 + values.length},
         $${29 + values.length}::jsonb, $${30 + values.length}::timestamptz
       )`,
      [
        descriptor.id,
        record.revision,
        record.project_id,
        record.project_definition_ref.project_definition_id,
        record.project_definition_ref.revision,
        record.project_definition_ref.content_hash,
        record.project_definition_ref.definition_family,
        ...values,
        profileSchemaName,
        descriptor.profileRecord.record_id,
        descriptor.profileRecord.revision,
        descriptor.profileRecord.record_hash,
        profileKind === null ? null : descriptor.profileRecord.record_id,
        profileKind,
        profileKind === null ? null : descriptor.profileRecord.revision,
        profileKind === null ? null : descriptor.profileRecord.record_hash,
        record.producer.actor.actor_id,
        record.producer.actor.actor_kind,
        record.task_context.task_kind,
        record.input_snapshot.snapshot_ref.snapshot_id,
        record.input_snapshot.snapshot_ref.revision,
        record.input_snapshot.snapshot_ref.event_position,
        record.input_snapshot.snapshot_ref.content_hash,
        record.validation.state,
        record.disposition,
        record.schema_name,
        record.schema_version,
        record.content_hash,
        canonicalHash(record),
        JSON.stringify(record),
        record.recorded_at,
      ],
    );
    if (record.revision > 1) {
      await client.query(
        `UPDATE petra.${descriptor.table}
            SET current_revision = $2
          WHERE ${descriptor.idColumn} = $1
            AND current_revision = $3`,
        [descriptor.id, record.revision, record.revision - 1],
      );
    }
  }

  async #getWorkingRecord<RecordType extends WorkingRecord>(
    contractName: "working-candidate" | "working-relationship",
    headTable: "working_candidates" | "working_relationships",
    revisionTable:
      "working_candidate_revisions" | "working_relationship_revisions",
    idColumn: "working_candidate_id" | "working_relationship_id",
    projectId: string,
    id: string,
    revision?: number,
  ): Promise<RecordType | undefined> {
    const result = await this.#pool.query<StoredPayloadRow>(
      revision === undefined
        ? `SELECT revision.payload
             FROM petra.${headTable} AS head
             JOIN petra.${revisionTable} AS revision
               ON revision.${idColumn} = head.${idColumn}
              AND revision.revision = head.current_revision
            WHERE head.project_id = $1 AND head.${idColumn} = $2`
        : `SELECT payload FROM petra.${revisionTable}
            WHERE project_id = $1 AND ${idColumn} = $2 AND revision = $3`,
      revision === undefined ? [projectId, id] : [projectId, id, revision],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid(contractName, "1.0.0", payload);
    return clone(payload as RecordType);
  }
}
