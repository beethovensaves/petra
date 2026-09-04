import { createHash } from "node:crypto";

import type { ActorRef, PetraAssertion, PetraClaim } from "@petra/contracts";
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

import { insertEvidenceRecordRevision } from "./evidence-record-persistence.js";

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
    return this.#propose(claim);
  }

  proposeAssertion(assertion: PetraAssertion): Promise<PetraAssertion> {
    return this.#propose(assertion);
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
      await insertEvidenceRecordRevision(client, record, {
        admissionKind: "proposal",
        recordedAt: descriptor.createdAt,
        createIdentity: true,
      });
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

  #readClaim(payload: unknown): PetraClaim {
    this.#contracts.assertValid("claim", "1.0.0", payload);
    return clone(payload as PetraClaim);
  }

  #readAssertion(payload: unknown): PetraAssertion {
    this.#contracts.assertValid("assertion", "1.0.0", payload);
    return clone(payload as PetraAssertion);
  }
}
