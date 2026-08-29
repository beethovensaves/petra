import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraAuthor,
  PetraExternalIdentifier,
  PetraWork,
  PetraWorkVersion,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ScholarlyIdentityRepository } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

type ScholarlyRecord =
  PetraAuthor | PetraWork | PetraWorkVersion | PetraExternalIdentifier;
type EntityKind = "author" | "work" | "work_version" | "external_identifier";
type ContractName = "author" | "work" | "work-version" | "external-identifier";

export type PostgresScholarlyIdentityErrorCode =
  | "SCHOLARLY_ENTITY_ID_CONFLICT"
  | "SCHOLARLY_ENTITY_REVISION_CONFLICT"
  | "SCHOLARLY_ENTITY_REVISION_GAP"
  | "SCHOLARLY_REFERENCE_MISSING"
  | "SCHOLARLY_RELATION_INVALID";

export class PostgresScholarlyIdentityError extends Error {
  readonly code: PostgresScholarlyIdentityErrorCode;

  constructor(code: PostgresScholarlyIdentityErrorCode, message: string) {
    super(message);
    this.name = "PostgresScholarlyIdentityError";
    this.code = code;
  }
}

interface Descriptor {
  id: string;
  kind: EntityKind;
  contractName: ContractName;
  revision: number;
  schemaName: string;
  schemaVersion: string;
  createdBy: ActorRef;
  createdAt: string;
  updatedAt: string;
}

interface CurrentEntityRow {
  entity_kind: EntityKind;
  current_revision: string;
  created_by_actor_id: string;
  created_by_actor_kind: ActorRef["actor_kind"];
  created_at: Date;
}

interface HashRow {
  record_hash: string;
}

interface PayloadRow {
  payload: unknown;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const recordHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const descriptorFor = (record: ScholarlyRecord): Descriptor => {
  switch (record.schema_name) {
    case "petra.author":
      return {
        id: record.author_id,
        kind: "author",
        contractName: "author",
        revision: record.revision,
        schemaName: record.schema_name,
        schemaVersion: record.schema_version,
        createdBy: record.created_by,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      };
    case "petra.work":
      return {
        id: record.work_id,
        kind: "work",
        contractName: "work",
        revision: record.revision,
        schemaName: record.schema_name,
        schemaVersion: record.schema_version,
        createdBy: record.created_by,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      };
    case "petra.work-version":
      return {
        id: record.work_version_id,
        kind: "work_version",
        contractName: "work-version",
        revision: record.revision,
        schemaName: record.schema_name,
        schemaVersion: record.schema_version,
        createdBy: record.created_by,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      };
    case "petra.external-identifier":
      return {
        id: record.external_identifier_id,
        kind: "external_identifier",
        contractName: "external-identifier",
        revision: record.revision,
        schemaName: record.schema_name,
        schemaVersion: record.schema_version,
        createdBy: record.created_by,
        createdAt: record.created_at,
        updatedAt: record.created_at,
      };
  }
};

const subjectIdentity = (
  subject: PetraExternalIdentifier["subject"],
): { kind: "author" | "work" | "work_version"; id: string } => {
  switch (subject.subject_kind) {
    case "author":
      return { kind: "author", id: subject.author_id };
    case "work":
      return { kind: "work", id: subject.work_id };
    case "work_version":
      return { kind: "work_version", id: subject.work_version_id };
  }
};

export class PostgresScholarlyIdentityRepository implements ScholarlyIdentityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  registerAuthorRevision(author: PetraAuthor): Promise<PetraAuthor> {
    return this.#register(author, (client) =>
      this.#insertAuthor(client, author),
    );
  }

  getAuthor(
    authorId: string,
    revision?: number,
  ): Promise<PetraAuthor | undefined> {
    return this.#get("author", "author", authorId, revision);
  }

  registerWorkRevision(work: PetraWork): Promise<PetraWork> {
    return this.#register(work, async (client) => {
      const positions = new Set<number>();
      for (const credit of work.author_credits) {
        if (positions.has(credit.position)) {
          throw new PostgresScholarlyIdentityError(
            "SCHOLARLY_RELATION_INVALID",
            "A Work revision cannot assign two credits to the same position.",
          );
        }
        positions.add(credit.position);
        await this.#requireEntity(client, credit.author_id, "author");
      }
      await this.#insertWork(client, work);
    });
  }

  getWork(workId: string, revision?: number): Promise<PetraWork | undefined> {
    return this.#get("work", "work", workId, revision);
  }

  registerWorkVersionRevision(
    workVersion: PetraWorkVersion,
  ): Promise<PetraWorkVersion> {
    return this.#register(workVersion, async (client) => {
      await this.#requireEntity(client, workVersion.work_id, "work");
      await this.#insertWorkVersion(client, workVersion);
    });
  }

  getWorkVersion(
    workVersionId: string,
    revision?: number,
  ): Promise<PetraWorkVersion | undefined> {
    return this.#get("work_version", "work-version", workVersionId, revision);
  }

  registerExternalIdentifierRevision(
    identifier: PetraExternalIdentifier,
  ): Promise<PetraExternalIdentifier> {
    return this.#register(identifier, async (client) => {
      const subject = subjectIdentity(identifier.subject);
      await this.#requireEntity(client, subject.id, subject.kind);
      await this.#insertExternalIdentifier(client, identifier, subject);
    });
  }

  getExternalIdentifier(
    externalIdentifierId: string,
    revision?: number,
  ): Promise<PetraExternalIdentifier | undefined> {
    return this.#get(
      "external_identifier",
      "external-identifier",
      externalIdentifierId,
      revision,
    );
  }

  async #register<RecordType extends ScholarlyRecord>(
    record: RecordType,
    insertTyped: (client: PoolClient) => Promise<void>,
  ): Promise<RecordType> {
    const descriptor = descriptorFor(record);
    this.#contracts.assertValid(descriptor.contractName, "1.0.0", record);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [descriptor.id],
      );
      await this.#requireActor(client, descriptor.createdBy);
      const outcome = await this.#prepareRevision(client, record, descriptor);
      if (outcome === "insert") {
        await insertTyped(client);
        await this.#advanceCurrentRevision(client, descriptor);
      }
      await client.query("COMMIT");
      return clone(record);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #get<RecordType extends ScholarlyRecord>(
    kind: EntityKind,
    contractName: ContractName,
    id: string,
    revision?: number,
  ): Promise<RecordType | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      revision === undefined
        ? `SELECT revision.payload
             FROM petra.canonical_entities AS entity
             JOIN petra.canonical_entity_revisions AS revision
               ON revision.entity_id = entity.entity_id
              AND revision.entity_kind = entity.entity_kind
              AND revision.revision = entity.current_revision
            WHERE entity.entity_id = $1 AND entity.entity_kind = $2`
        : `SELECT payload
             FROM petra.canonical_entity_revisions
            WHERE entity_id = $1 AND entity_kind = $2 AND revision = $3`,
      revision === undefined ? [id, kind] : [id, kind, revision],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid(contractName, "1.0.0", payload);
    return clone(payload as RecordType);
  }

  async #requireActor(client: PoolClient, actor: ActorRef): Promise<void> {
    const result = await client.query<{ actor_kind: ActorRef["actor_kind"] }>(
      "SELECT actor_kind FROM petra.actors WHERE actor_id = $1",
      [actor.actor_id],
    );
    if (result.rows[0]?.actor_kind !== actor.actor_kind) {
      throw new PostgresScholarlyIdentityError(
        "SCHOLARLY_REFERENCE_MISSING",
        "The scholarly record creator must resolve to the exact registered Actor kind.",
      );
    }
  }

  async #requireEntity(
    client: PoolClient,
    id: string,
    kind: Exclude<EntityKind, "external_identifier">,
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1
         FROM petra.canonical_entities
        WHERE entity_id = $1 AND entity_kind = $2`,
      [id, kind],
    );
    if (result.rowCount !== 1) {
      throw new PostgresScholarlyIdentityError(
        "SCHOLARLY_REFERENCE_MISSING",
        `The ${kind} reference does not resolve to a canonical entity.`,
      );
    }
  }

  async #prepareRevision(
    client: PoolClient,
    record: ScholarlyRecord,
    descriptor: Descriptor,
  ): Promise<"insert" | "replay"> {
    const currentResult = await client.query<CurrentEntityRow>(
      `SELECT entity_kind, current_revision, created_by_actor_id,
              created_by_actor_kind, created_at
         FROM petra.canonical_entities
        WHERE entity_id = $1
        FOR UPDATE`,
      [descriptor.id],
    );
    const current = currentResult.rows[0];
    const hash = recordHash(record);

    if (current === undefined) {
      if (descriptor.revision !== 1) {
        throw new PostgresScholarlyIdentityError(
          "SCHOLARLY_ENTITY_REVISION_GAP",
          "A new scholarly entity must begin at revision one.",
        );
      }
      await client.query(
        `INSERT INTO petra.canonical_entities (
           entity_id, entity_kind, current_revision, created_by_actor_id,
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
    } else {
      const stableIdentity =
        current.entity_kind === descriptor.kind &&
        current.created_by_actor_id === descriptor.createdBy.actor_id &&
        current.created_by_actor_kind === descriptor.createdBy.actor_kind &&
        current.created_at.toISOString() === descriptor.createdAt;
      if (!stableIdentity) {
        throw new PostgresScholarlyIdentityError(
          "SCHOLARLY_ENTITY_ID_CONFLICT",
          "A scholarly entity revision cannot change its kind, creator, or creation time.",
        );
      }
      const currentRevision = Number(current.current_revision);
      if (descriptor.revision <= currentRevision) {
        const existing = await client.query<HashRow>(
          `SELECT record_hash
             FROM petra.canonical_entity_revisions
            WHERE entity_id = $1 AND revision = $2`,
          [descriptor.id, descriptor.revision],
        );
        if (existing.rows[0]?.record_hash === hash) return "replay";
        throw new PostgresScholarlyIdentityError(
          "SCHOLARLY_ENTITY_REVISION_CONFLICT",
          "The scholarly entity revision is already bound to different canonical content.",
        );
      }
      if (descriptor.revision !== currentRevision + 1) {
        throw new PostgresScholarlyIdentityError(
          "SCHOLARLY_ENTITY_REVISION_GAP",
          "Scholarly entity revisions must advance exactly once from the current revision.",
        );
      }
    }

    await client.query(
      `INSERT INTO petra.canonical_entity_revisions (
         entity_id, entity_kind, revision, schema_name, schema_version,
         record_hash, payload, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)`,
      [
        descriptor.id,
        descriptor.kind,
        descriptor.revision,
        descriptor.schemaName,
        descriptor.schemaVersion,
        hash,
        JSON.stringify(record),
        descriptor.updatedAt,
      ],
    );
    return "insert";
  }

  async #advanceCurrentRevision(
    client: PoolClient,
    descriptor: Descriptor,
  ): Promise<void> {
    if (descriptor.revision === 1) return;
    await client.query(
      `UPDATE petra.canonical_entities
          SET current_revision = $2
        WHERE entity_id = $1`,
      [descriptor.id, descriptor.revision],
    );
  }

  async #insertAuthor(client: PoolClient, author: PetraAuthor): Promise<void> {
    await client.query(
      `INSERT INTO petra.author_revisions (
         author_id, revision, author_kind, display_name, identity_status
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        author.author_id,
        author.revision,
        author.author_kind,
        author.display_name,
        author.identity_status,
      ],
    );
  }

  async #insertWork(client: PoolClient, work: PetraWork): Promise<void> {
    await client.query(
      `INSERT INTO petra.work_revisions (
         work_id, revision, title, work_kind, identity_status
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        work.work_id,
        work.revision,
        work.title,
        work.work_kind,
        work.identity_status,
      ],
    );
    for (const credit of work.author_credits) {
      await client.query(
        `INSERT INTO petra.work_author_credits (
           work_id, work_revision, author_id, position, credit_role,
           corresponding
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          work.work_id,
          work.revision,
          credit.author_id,
          credit.position,
          credit.credit_role,
          credit.corresponding ?? null,
        ],
      );
    }
  }

  async #insertWorkVersion(
    client: PoolClient,
    workVersion: PetraWorkVersion,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.work_version_revisions (
         work_version_id, revision, work_id, version_label,
         publication_status, published_date_precision, published_date_value,
         metadata_source_kind, metadata_source_name,
         metadata_source_record_id, metadata_retrieved_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                 $11::timestamptz)`,
      [
        workVersion.work_version_id,
        workVersion.revision,
        workVersion.work_id,
        workVersion.version_label,
        workVersion.publication_status,
        workVersion.published_date?.precision ?? null,
        workVersion.published_date?.value ?? null,
        workVersion.metadata_source.source_kind,
        workVersion.metadata_source.source_name,
        workVersion.metadata_source.source_record_id ?? null,
        workVersion.metadata_retrieved_at,
      ],
    );
  }

  async #insertExternalIdentifier(
    client: PoolClient,
    identifier: PetraExternalIdentifier,
    subject: ReturnType<typeof subjectIdentity>,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.external_identifier_revisions (
         external_identifier_id, revision, subject_kind, subject_id,
         namespace, normalized_value, source_name, verification_status,
         observed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)`,
      [
        identifier.external_identifier_id,
        identifier.revision,
        subject.kind,
        subject.id,
        identifier.namespace,
        identifier.normalized_value,
        identifier.source_name,
        identifier.verification_status,
        identifier.observed_at,
      ],
    );
  }
}
