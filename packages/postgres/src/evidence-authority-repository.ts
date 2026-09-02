import { createHash } from "node:crypto";

import type {
  ActorRef,
  AssertionProvenanceRef,
  PetraAssertion,
  PetraClaim,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  EvidenceProposalError,
  validateAssertionProposal,
  validateClaimProposal,
} from "@petra/core";
import type {
  EvidenceAuthorityRepository,
  EvidenceProposalResolver,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresEvidenceAuthorityErrorCode =
  | "EVIDENCE_ID_CONFLICT"
  | "EVIDENCE_REFERENCE_MISSING"
  | "EVIDENCE_RELATION_INVALID"
  | "EVIDENCE_PROPOSAL_ONLY";

export class PostgresEvidenceAuthorityError extends Error {
  readonly code: PostgresEvidenceAuthorityErrorCode;

  constructor(code: PostgresEvidenceAuthorityErrorCode, message: string) {
    super(message);
    this.name = "PostgresEvidenceAuthorityError";
    this.code = code;
  }
}

type EvidenceRecord = PetraClaim | PetraAssertion;
type EvidenceKind = "claim" | "assertion";
type ContractName = "claim" | "assertion";

interface Descriptor {
  id: string;
  kind: EvidenceKind;
  contractName: ContractName;
  revision: number;
  schemaName: PetraClaim["schema_name"] | PetraAssertion["schema_name"];
  schemaVersion: "1.0.0";
  authority: EvidenceRecord["authority"];
  createdBy: ActorRef;
  createdAt: string;
}

interface PayloadRow {
  payload: unknown;
}

interface ExistingRevisionRow {
  evidence_kind: EvidenceKind;
  record_hash: string;
}

interface SourceSpanResolverRow {
  source_span_id: string;
  parsed_document_id: string;
  verification_status: string;
}

interface ParsedDocumentResolverRow {
  parsed_document_id: string;
  work_version_id: string;
}

interface EvidenceResolverRow {
  evidence_id: string;
  evidence_kind: EvidenceKind;
  payload: unknown;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const recordHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const descriptorFor = (record: EvidenceRecord): Descriptor =>
  record.schema_name === "petra.claim"
    ? {
        id: record.claim_id,
        kind: "claim",
        contractName: "claim",
        revision: record.revision,
        schemaName: record.schema_name,
        schemaVersion: record.schema_version,
        authority: record.authority,
        createdBy: record.created_by,
        createdAt: record.created_at,
      }
    : {
        id: record.assertion_id,
        kind: "assertion",
        contractName: "assertion",
        revision: record.revision,
        schemaName: record.schema_name,
        schemaVersion: record.schema_version,
        authority: record.authority,
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

export class PostgresEvidenceAuthorityRepository implements EvidenceAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  proposeClaim(claim: PetraClaim): Promise<PetraClaim> {
    return this.#propose(claim, (client) => this.#insertClaim(client, claim));
  }

  proposeAssertion(assertion: PetraAssertion): Promise<PetraAssertion> {
    return this.#propose(assertion, (client) =>
      this.#insertAssertion(client, assertion),
    );
  }

  getClaim(
    claimId: string,
    revision?: number,
  ): Promise<PetraClaim | undefined> {
    return this.#get("claim", "claim", claimId, revision);
  }

  getAssertion(
    assertionId: string,
    revision?: number,
  ): Promise<PetraAssertion | undefined> {
    return this.#get("assertion", "assertion", assertionId, revision);
  }

  async getClaimsForWorkVersion(workVersionId: string): Promise<PetraClaim[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT revision_record.payload
         FROM petra.claim_revisions AS claim
         JOIN petra.evidence_entities AS entity
           ON entity.evidence_id = claim.claim_id
          AND entity.evidence_kind = claim.evidence_kind
          AND entity.current_revision = claim.revision
         JOIN petra.evidence_entity_revisions AS revision_record
           ON revision_record.evidence_id = claim.claim_id
          AND revision_record.revision = claim.revision
        WHERE claim.source_work_version_id = $1
        ORDER BY entity.created_at, claim.claim_id`,
      [workVersionId],
    );
    return result.rows.map(({ payload }) => this.#readClaim(payload));
  }

  async getAssertionsForEntity(entityId: string): Promise<PetraAssertion[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT revision_record.payload
         FROM petra.assertion_revisions AS assertion
         JOIN petra.evidence_entities AS entity
           ON entity.evidence_id = assertion.assertion_id
          AND entity.evidence_kind = assertion.evidence_kind
          AND entity.current_revision = assertion.revision
         JOIN petra.evidence_entity_revisions AS revision_record
           ON revision_record.evidence_id = assertion.assertion_id
          AND revision_record.revision = assertion.revision
        WHERE assertion.subject_id = $1 OR assertion.object_entity_id = $1
        ORDER BY assertion.recorded_at, assertion.assertion_id`,
      [entityId],
    );
    return result.rows.map(({ payload }) => this.#readAssertion(payload));
  }

  async #propose<RecordType extends EvidenceRecord>(
    record: RecordType,
    insertTyped: (client: PoolClient) => Promise<void>,
  ): Promise<RecordType> {
    const descriptor = descriptorFor(record);
    this.#contracts.assertValid(descriptor.contractName, "1.0.0", record);
    if (
      descriptor.revision !== 1 ||
      descriptor.authority.zone !== "quarantine"
    ) {
      throw new PostgresEvidenceAuthorityError(
        "EVIDENCE_PROPOSAL_ONLY",
        "W05 accepts only revision-1 quarantine proposals; reviewed promotion belongs to ChangeSet authority.",
      );
    }

    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [descriptor.id],
      );

      const existing = await client.query<ExistingRevisionRow>(
        `SELECT evidence_kind, record_hash
           FROM petra.evidence_entity_revisions
          WHERE evidence_id = $1 AND revision = $2`,
        [descriptor.id, descriptor.revision],
      );
      if (existing.rows[0] !== undefined) {
        if (
          existing.rows[0].evidence_kind !== descriptor.kind ||
          existing.rows[0].record_hash !== recordHash(record)
        ) {
          throw new PostgresEvidenceAuthorityError(
            "EVIDENCE_ID_CONFLICT",
            "The evidence ID and revision are already bound to different canonical content.",
          );
        }
        await client.query("COMMIT");
        return clone(record);
      }

      await this.#validateReferences(client, record);
      await this.#insertHeadAndRevision(client, record, descriptor);
      await insertTyped(client);
      await client.query("COMMIT");
      return clone(record);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #get<RecordType extends EvidenceRecord>(
    kind: EvidenceKind,
    contractName: ContractName,
    id: string,
    revision?: number,
  ): Promise<RecordType | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      revision === undefined
        ? `SELECT evidence_revision.payload
             FROM petra.evidence_entities AS entity
             JOIN petra.evidence_entity_revisions AS evidence_revision
               ON evidence_revision.evidence_id = entity.evidence_id
              AND evidence_revision.evidence_kind = entity.evidence_kind
              AND evidence_revision.revision = entity.current_revision
            WHERE entity.evidence_id = $1 AND entity.evidence_kind = $2`
        : `SELECT payload
             FROM petra.evidence_entity_revisions
            WHERE evidence_id = $1 AND evidence_kind = $2 AND revision = $3`,
      revision === undefined ? [id, kind] : [id, kind, revision],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid(contractName, "1.0.0", payload);
    return clone(payload as RecordType);
  }

  async #validateReferences(
    client: PoolClient,
    record: EvidenceRecord,
  ): Promise<void> {
    await this.#requireActor(client, record.created_by);
    if (record.schema_name === "petra.claim") {
      await this.#requireActor(client, basisActor(record));
    } else {
      for (const provenance of record.provenance_refs) {
        if (provenance.provenance_kind === "actor") {
          await this.#requireActor(client, provenance.actor);
        }
      }
    }

    const resolver = await this.#buildResolver(client, record);
    try {
      if (record.schema_name === "petra.claim") {
        validateClaimProposal(record, resolver);
      } else {
        validateAssertionProposal(record, resolver);
      }
    } catch (error) {
      if (error instanceof EvidenceProposalError) {
        throw new PostgresEvidenceAuthorityError(
          error.code.endsWith("NOT_REGISTERED") ||
            error.code.endsWith("REFERENCE_MISSING")
            ? "EVIDENCE_REFERENCE_MISSING"
            : "EVIDENCE_RELATION_INVALID",
          `${error.code}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  async #buildResolver(
    client: PoolClient,
    record: EvidenceRecord,
  ): Promise<EvidenceProposalResolver> {
    const sourceSpanIds = new Set<string>();
    const claimIds = new Set<string>();
    const assertionIds = new Set<string>();

    if (record.schema_name === "petra.claim") {
      if (record.basis.basis_kind === "source") {
        for (const sourceSpanId of record.basis.source_span_ids) {
          sourceSpanIds.add(sourceSpanId);
        }
      } else if (record.basis.basis_kind === "synthesis") {
        for (const claimId of record.basis.basis_claim_ids)
          claimIds.add(claimId);
        for (const assertionId of record.basis.basis_assertion_ids) {
          assertionIds.add(assertionId);
        }
      }
    } else {
      for (const provenance of record.provenance_refs) {
        if (provenance.provenance_kind === "source_span") {
          sourceSpanIds.add(provenance.source_span_id);
        }
      }
      if (
        record.predicate === "ASSERTS" &&
        record.object.object_kind === "entity"
      ) {
        claimIds.add(record.object.entity_id);
      }
    }

    const spanResult =
      sourceSpanIds.size === 0
        ? { rows: [] as SourceSpanResolverRow[] }
        : await client.query<SourceSpanResolverRow>(
            `SELECT source_span_id, parsed_document_id,
                    verification_status
               FROM petra.source_spans
              WHERE source_span_id = ANY($1::text[])`,
            [[...sourceSpanIds]],
          );
    const spans = new Map(
      spanResult.rows.map((row) => [
        row.source_span_id,
        {
          parsed_document_id: row.parsed_document_id,
          verification: { status: row.verification_status },
        },
      ]),
    );
    const parsedDocumentIds = [
      ...new Set(spanResult.rows.map((row) => row.parsed_document_id)),
    ];
    const documentResult =
      parsedDocumentIds.length === 0
        ? { rows: [] as ParsedDocumentResolverRow[] }
        : await client.query<ParsedDocumentResolverRow>(
            `SELECT parsed_document_id, work_version_id
               FROM petra.parsed_documents
              WHERE parsed_document_id = ANY($1::text[])`,
            [parsedDocumentIds],
          );
    const documents = new Map(
      documentResult.rows.map((row) => [
        row.parsed_document_id,
        { work_version_id: row.work_version_id },
      ]),
    );

    const evidenceIds = [...claimIds, ...assertionIds];
    const evidenceResult =
      evidenceIds.length === 0
        ? { rows: [] as EvidenceResolverRow[] }
        : await client.query<EvidenceResolverRow>(
            `SELECT entity.evidence_id, entity.evidence_kind,
                    revision.payload
               FROM petra.evidence_entities AS entity
               JOIN petra.evidence_entity_revisions AS revision
                 ON revision.evidence_id = entity.evidence_id
                AND revision.evidence_kind = entity.evidence_kind
                AND revision.revision = entity.current_revision
              WHERE entity.evidence_id = ANY($1::text[])`,
            [evidenceIds],
          );
    const claims = new Map<string, PetraClaim>();
    const assertions = new Map<string, PetraAssertion>();
    for (const row of evidenceResult.rows) {
      if (row.evidence_kind === "claim") {
        this.#contracts.assertValid("claim", "1.0.0", row.payload);
        claims.set(row.evidence_id, row.payload as PetraClaim);
      } else {
        this.#contracts.assertValid("assertion", "1.0.0", row.payload);
        assertions.set(row.evidence_id, row.payload as PetraAssertion);
      }
    }

    return {
      getSourceSpan: (sourceSpanId) => spans.get(sourceSpanId),
      getParsedDocument: (parsedDocumentId) => documents.get(parsedDocumentId),
      getClaim: (claimId) => claims.get(claimId),
      getAssertion: (assertionId) => assertions.get(assertionId),
    };
  }

  async #requireActor(client: PoolClient, actor: ActorRef): Promise<void> {
    const result = await client.query<{ actor_kind: ActorRef["actor_kind"] }>(
      "SELECT actor_kind FROM petra.actors WHERE actor_id = $1",
      [actor.actor_id],
    );
    if (result.rows[0]?.actor_kind !== actor.actor_kind) {
      throw new PostgresEvidenceAuthorityError(
        "EVIDENCE_REFERENCE_MISSING",
        "Evidence authorship must resolve to the exact registered Actor kind.",
      );
    }
  }

  async #insertHeadAndRevision(
    client: PoolClient,
    record: EvidenceRecord,
    descriptor: Descriptor,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.evidence_entities (
         evidence_id, evidence_kind, current_revision, created_by_actor_id,
         created_by_actor_kind, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
      [
        descriptor.id,
        descriptor.kind,
        descriptor.revision,
        descriptor.createdBy.actor_id,
        descriptor.createdBy.actor_kind,
        descriptor.createdAt,
      ],
    );
    await client.query(
      `INSERT INTO petra.evidence_entity_revisions (
         evidence_id, evidence_kind, revision, authority_zone, review_state,
         admission_kind, schema_name, schema_version, record_hash, payload,
         recorded_at
       ) VALUES ($1, $2, $3, $4, $5, 'proposal', $6, $7, $8, $9::jsonb,
                 $10::timestamptz)`,
      [
        descriptor.id,
        descriptor.kind,
        descriptor.revision,
        descriptor.authority.zone,
        descriptor.authority.review_state,
        descriptor.schemaName,
        descriptor.schemaVersion,
        recordHash(record),
        JSON.stringify(record),
        descriptor.createdAt,
      ],
    );
  }

  async #insertClaim(client: PoolClient, claim: PetraClaim): Promise<void> {
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
      for (const [
        index,
        sourceSpanId,
      ] of claim.basis.source_span_ids.entries()) {
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
      for (const [
        index,
        basisClaimId,
      ] of claim.basis.basis_claim_ids.entries()) {
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
  }

  async #insertAssertion(
    client: PoolClient,
    assertion: PetraAssertion,
  ): Promise<void> {
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
      await this.#insertAssertionProvenance(
        client,
        assertion,
        provenance,
        index + 1,
      );
    }
  }

  async #insertAssertionProvenance(
    client: PoolClient,
    assertion: PetraAssertion,
    provenance: AssertionProvenanceRef,
    position: number,
  ): Promise<void> {
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
  }

  #readClaim(payload: unknown): PetraClaim {
    this.#contracts.assertValid("claim", "1.0.0", payload);
    return clone(payload as PetraClaim);
  }

  #readAssertion(payload: unknown): PetraAssertion {
    this.#contracts.assertValid("assertion", "1.0.0", payload);
    return clone(payload as PetraAssertion);
  }
}
