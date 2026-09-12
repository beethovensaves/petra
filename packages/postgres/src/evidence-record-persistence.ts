import { createHash } from "node:crypto";

import type {
  ActorRef,
  AssertionProvenanceRef,
  PetraAssertion,
  PetraClaim,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import type { PoolClient } from "pg";

export type PersistedEvidenceRecord = PetraClaim | PetraAssertion;
export type EvidenceAdmissionKind =
  "proposal" | "working_correction" | "promotion" | "reversal";

const recordHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const evidenceDescriptor = (record: PersistedEvidenceRecord) =>
  record.schema_name === "petra.claim"
    ? {
        id: record.claim_id,
        kind: "claim" as const,
        createdBy: record.created_by,
        createdAt: record.created_at,
      }
    : {
        id: record.assertion_id,
        kind: "assertion" as const,
        createdBy: record.created_by,
        createdAt: record.recorded_at,
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

export interface InsertEvidenceRevisionOptions {
  admissionKind: EvidenceAdmissionKind;
  recordedAt: string;
  createIdentity: boolean;
}

/**
 * Package-internal SQL writer shared by proposal and ChangeSet repositories.
 * The caller owns validation, locking, transaction boundaries, and head advance.
 */
export const insertEvidenceRecordRevision = async (
  client: PoolClient,
  record: PersistedEvidenceRecord,
  options: InsertEvidenceRevisionOptions,
): Promise<void> => {
  const descriptor = evidenceDescriptor(record);
  if (options.createIdentity) {
    await client.query(
      `INSERT INTO petra.evidence_entities (
         evidence_id, evidence_kind, current_revision, created_by_actor_id,
         created_by_actor_kind, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
      [
        descriptor.id,
        descriptor.kind,
        record.revision,
        descriptor.createdBy.actor_id,
        descriptor.createdBy.actor_kind,
        descriptor.createdAt,
      ],
    );
  }

  await client.query(
    `INSERT INTO petra.evidence_entity_revisions (
       evidence_id, evidence_kind, revision, authority_zone, review_state,
       admission_kind, schema_name, schema_version, record_hash, payload,
       recorded_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb,
               $11::timestamptz)`,
    [
      descriptor.id,
      descriptor.kind,
      record.revision,
      record.authority.zone,
      record.authority.review_state,
      options.admissionKind,
      record.schema_name,
      record.schema_version,
      recordHash(record),
      JSON.stringify(record),
      options.recordedAt,
    ],
  );

  if (record.schema_name === "petra.claim") {
    await insertClaimRevision(client, record);
  } else {
    await insertAssertionRevision(client, record);
  }
};

const insertClaimRevision = async (
  client: PoolClient,
  claim: PetraClaim,
): Promise<void> => {
  const sourceBasis =
    claim.basis.basis_kind === "source" ? claim.basis : undefined;
  const synthesisBasis =
    claim.basis.basis_kind === "synthesis" ? claim.basis : undefined;
  const claimBasisActor = basisActor(claim);
  const basisRecordedAt =
    claim.basis.basis_kind === "synthesis"
      ? claim.basis.composed_at
      : claim.basis.proposed_at;
  await client.query(
    `INSERT INTO petra.claim_revisions (
       claim_id, revision, canonical_text, claim_kind,
       normalization_status, basis_kind, source_work_version_id,
       source_work_version_kind, source_scope, detail_level, source_stance,
       modality, negated, scope, basis, basis_actor_id, basis_actor_kind,
       basis_recorded_at, derivation_kind, derivation_ref,
       composition_kind, composition_ref, supersedes_claim_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7,
               CASE WHEN $7::text IS NULL THEN NULL ELSE 'work_version' END,
               $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16,
               $17::timestamptz, $18, $19, $20, $21, $22)`,
    [
      claim.claim_id,
      claim.revision,
      claim.canonical_text,
      claim.claim_kind,
      claim.normalization_status,
      claim.basis.basis_kind,
      sourceBasis?.work_version_id ?? null,
      sourceBasis?.source_scope ?? null,
      sourceBasis?.detail_level ?? null,
      sourceBasis?.source_stance ?? null,
      sourceBasis?.modality ?? null,
      sourceBasis?.negated ?? null,
      JSON.stringify(claim.scope),
      JSON.stringify(claim.basis),
      claimBasisActor.actor_id,
      claimBasisActor.actor_kind,
      basisRecordedAt,
      sourceBasis?.derivation.derivation_kind ?? null,
      sourceBasis?.derivation.derivation_ref ?? null,
      synthesisBasis?.composition_kind ?? null,
      synthesisBasis?.composition_ref ?? null,
      claim.supersedes_claim_id ?? null,
    ],
  );

  if (claim.basis.basis_kind === "source") {
    for (const [index, sourceSpanId] of claim.basis.source_span_ids.entries()) {
      await client.query(
        `INSERT INTO petra.claim_source_spans (
           claim_id, claim_revision, position, source_span_id
         ) VALUES ($1, $2, $3, $4)`,
        [claim.claim_id, claim.revision, index + 1, sourceSpanId],
      );
    }
    for (const [index, result] of claim.basis.validator_results.entries()) {
      await client.query(
        `INSERT INTO petra.claim_validator_results (
           claim_id, claim_revision, position, validator_name,
           validator_version, outcome, code, message
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          claim.claim_id,
          claim.revision,
          index + 1,
          result.validator_name,
          result.validator_version,
          result.outcome,
          result.code,
          result.message ?? null,
        ],
      );
    }
  } else if (claim.basis.basis_kind === "synthesis") {
    for (const [index, basisClaimId] of claim.basis.basis_claim_ids.entries()) {
      await client.query(
        `INSERT INTO petra.claim_basis_claims (
           claim_id, claim_revision, position, basis_claim_id
         ) VALUES ($1, $2, $3, $4)`,
        [claim.claim_id, claim.revision, index + 1, basisClaimId],
      );
    }
    for (const [
      index,
      basisAssertionId,
    ] of claim.basis.basis_assertion_ids.entries()) {
      await client.query(
        `INSERT INTO petra.claim_basis_assertions (
           claim_id, claim_revision, position, basis_assertion_id
         ) VALUES ($1, $2, $3, $4)`,
        [claim.claim_id, claim.revision, index + 1, basisAssertionId],
      );
    }
  }
};

const insertAssertionRevision = async (
  client: PoolClient,
  assertion: PetraAssertion,
): Promise<void> => {
  const objectEntityId =
    assertion.object.object_kind === "entity"
      ? assertion.object.entity_id
      : null;
  const objectValue =
    assertion.object.object_kind === "entity"
      ? null
      : JSON.stringify(assertion.object.value);
  await client.query(
    `INSERT INTO petra.assertion_revisions (
       assertion_id, revision, subject_id, predicate, object_kind,
       object_entity_id, object_value, assertion_kind, scope,
       scope_comparison_relation, rationale, occurred_at, recorded_at,
       valid_from, valid_to, supersedes_assertion_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10,
               $11, $12::timestamptz, $13::timestamptz, $14::timestamptz,
               $15::timestamptz, $16)`,
    [
      assertion.assertion_id,
      assertion.revision,
      assertion.subject_id,
      assertion.predicate,
      assertion.object.object_kind,
      objectEntityId,
      objectValue,
      assertion.assertion_kind,
      JSON.stringify(assertion.scope),
      assertion.scope_comparison?.relation ?? null,
      assertion.rationale,
      assertion.occurred_at ?? null,
      assertion.recorded_at,
      assertion.valid_time?.valid_from ?? null,
      assertion.valid_time?.valid_to ?? null,
      assertion.supersedes_assertion_id ?? null,
    ],
  );

  for (const [index, provenance] of assertion.provenance_refs.entries()) {
    await insertAssertionProvenance(client, assertion, provenance, index + 1);
  }
};

const insertAssertionProvenance = async (
  client: PoolClient,
  assertion: PetraAssertion,
  provenance: AssertionProvenanceRef,
  position: number,
): Promise<void> => {
  const sourceSpanId =
    provenance.provenance_kind === "source_span"
      ? provenance.source_span_id
      : null;
  const artifactId =
    provenance.provenance_kind === "structured_field"
      ? provenance.artifact_id
      : null;
  const basisAssertionId =
    provenance.provenance_kind === "basis_assertion"
      ? provenance.assertion_id
      : null;
  const actor =
    provenance.provenance_kind === "actor" ? provenance.actor : null;
  const recordId =
    provenance.provenance_kind === "record" ? provenance.record_id : null;
  const recordRole =
    provenance.provenance_kind === "record" ? provenance.role : null;

  await client.query(
    `INSERT INTO petra.assertion_provenance (
       assertion_id, assertion_revision, position, provenance_kind,
       source_span_id, artifact_id, basis_assertion_id,
       basis_evidence_kind, actor_id, actor_kind, record_id, record_role,
       provenance
     ) VALUES ($1, $2, $3, $4, $5, $6, $7,
               CASE WHEN $7::text IS NULL THEN NULL ELSE 'assertion' END,
               $8, $9, $10, $11, $12::jsonb)`,
    [
      assertion.assertion_id,
      assertion.revision,
      position,
      provenance.provenance_kind,
      sourceSpanId,
      artifactId,
      basisAssertionId,
      actor?.actor_id ?? null,
      actor?.actor_kind ?? null,
      recordId,
      recordRole,
      JSON.stringify(provenance),
    ],
  );
};
