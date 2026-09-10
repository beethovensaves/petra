import { createHash } from "node:crypto";

import type {
  PetraCapabilityGrantRecord,
  PetraCapabilityGrantRevocation,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  CapabilityGrantAuthorityRepository,
  CommandAuthorizationRequest,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

export type PostgresCapabilityGrantErrorCode =
  | "CAPABILITY_GRANT_CONTENT_HASH_MISMATCH"
  | "CAPABILITY_GRANT_TIME_INVALID"
  | "CAPABILITY_GRANT_REFERENCE_MISSING"
  | "CAPABILITY_GRANT_ISSUER_NOT_PROJECT_OWNER"
  | "CAPABILITY_GRANT_ID_CONFLICT"
  | "CAPABILITY_GRANT_REVOCATION_CONTENT_HASH_MISMATCH"
  | "CAPABILITY_GRANT_REVOCATION_GRANT_MISMATCH"
  | "CAPABILITY_GRANT_REVOCATION_TIME_INVALID"
  | "CAPABILITY_GRANT_REVOCATION_ID_CONFLICT";

export class PostgresCapabilityGrantError extends Error {
  readonly code: PostgresCapabilityGrantErrorCode;

  constructor(code: PostgresCapabilityGrantErrorCode, message: string) {
    super(message);
    this.name = "PostgresCapabilityGrantError";
    this.code = code;
  }
}

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface ProjectOwnerRow {
  created_by_actor_id: string;
  created_by_actor_kind: string;
}

interface EvaluationRow extends StoredRow {
  evaluated_at: Date;
}

interface TransactionTimeRow {
  transaction_time: Date;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const sameActor = (
  left: { readonly actor_id: string; readonly actor_kind: string },
  right: { readonly actor_id: string; readonly actor_kind: string },
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

export class PostgresCapabilityGrantAuthorityRepository implements CapabilityGrantAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerCapabilityGrant(
    grant: PetraCapabilityGrantRecord,
  ): Promise<PetraCapabilityGrantRecord> {
    this.#assertGrant(grant);
    const recordHash = canonicalHash(grant);

    return this.#transaction(async (client) => {
      await this.#lock(client, `capability-grant:${grant.capability_grant_id}`);
      await this.#requireProjectOwner(
        client,
        grant.project_id,
        grant.issued_by,
      );
      await this.#requireActor(client, grant.grantee);
      if (Date.parse(grant.issued_at) > (await this.#transactionTime(client))) {
        throw new PostgresCapabilityGrantError(
          "CAPABILITY_GRANT_TIME_INVALID",
          "A CapabilityGrant cannot claim issuance after its registration transaction.",
        );
      }

      const existing = await client.query<StoredRow>(
        `SELECT payload, record_hash
           FROM petra.capability_grants
          WHERE capability_grant_id = $1
          FOR UPDATE`,
        [grant.capability_grant_id],
      );
      if (existing.rows[0] !== undefined) {
        if (existing.rows[0].record_hash === recordHash) return clone(grant);
        throw new PostgresCapabilityGrantError(
          "CAPABILITY_GRANT_ID_CONFLICT",
          "A CapabilityGrant identity is already bound to different immutable content.",
        );
      }

      await client.query(
        `INSERT INTO petra.capability_grants (
           capability_grant_id, revision, project_id, grantee_actor_id,
           grantee_actor_kind, scope_kind, allowed_commands, valid_from,
           expires_at, content_hash, issued_by_actor_id, issued_by_actor_kind,
           issued_at, schema_name, schema_version, record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7::text[], $8::timestamptz,
           $9::timestamptz, $10, $11, $12, $13::timestamptz, $14, $15,
           $16, $17::jsonb
         )`,
        [
          grant.capability_grant_id,
          grant.revision,
          grant.project_id,
          grant.grantee.actor_id,
          grant.grantee.actor_kind,
          grant.content.scope_kind,
          grant.content.allowed_commands,
          grant.content.valid_from,
          grant.content.expires_at ?? null,
          grant.content_hash,
          grant.issued_by.actor_id,
          grant.issued_by.actor_kind,
          grant.issued_at,
          grant.schema_name,
          grant.schema_version,
          recordHash,
          JSON.stringify(grant),
        ],
      );
      return clone(grant);
    });
  }

  async registerCapabilityGrantRevocation(
    revocation: PetraCapabilityGrantRevocation,
  ): Promise<PetraCapabilityGrantRevocation> {
    this.#assertRevocation(revocation);
    const recordHash = canonicalHash(revocation);

    return this.#transaction(async (client) => {
      await this.#lock(
        client,
        `capability-grant:${revocation.grant_ref.capability_grant_id}`,
      );
      const grantResult = await client.query<StoredRow>(
        `SELECT payload, record_hash
           FROM petra.capability_grants
          WHERE capability_grant_id = $1
          FOR UPDATE`,
        [revocation.grant_ref.capability_grant_id],
      );
      const grantRow = grantResult.rows[0];
      if (grantRow === undefined) {
        throw new PostgresCapabilityGrantError(
          "CAPABILITY_GRANT_REFERENCE_MISSING",
          "The CapabilityGrant to revoke is not registered.",
        );
      }
      const grant = this.#grantFrom(grantRow);
      if (
        grant.project_id !== revocation.project_id ||
        grant.revision !== revocation.grant_ref.revision ||
        grant.content_hash !== revocation.grant_ref.content_hash ||
        grantRow.record_hash !== revocation.grant_ref.record_hash
      ) {
        throw new PostgresCapabilityGrantError(
          "CAPABILITY_GRANT_REVOCATION_GRANT_MISMATCH",
          "A revocation must bind the exact immutable grant and Project.",
        );
      }
      const revokedAt = Date.parse(revocation.revoked_at);
      if (
        revokedAt < Date.parse(grant.issued_at) ||
        revokedAt > (await this.#transactionTime(client))
      ) {
        throw new PostgresCapabilityGrantError(
          "CAPABILITY_GRANT_REVOCATION_TIME_INVALID",
          "A grant revocation must occur between grant issuance and its registration transaction.",
        );
      }
      await this.#requireProjectOwner(
        client,
        revocation.project_id,
        revocation.revoked_by,
      );

      const existing = await client.query<
        StoredRow & {
          capability_grant_revocation_id: string;
          capability_grant_id: string;
        }
      >(
        `SELECT capability_grant_revocation_id, capability_grant_id,
                payload, record_hash
           FROM petra.capability_grant_revocations
          WHERE capability_grant_revocation_id = $1
             OR capability_grant_id = $2
          FOR UPDATE`,
        [
          revocation.capability_grant_revocation_id,
          revocation.grant_ref.capability_grant_id,
        ],
      );
      const exact = existing.rows.find(
        (row) =>
          row.capability_grant_revocation_id ===
            revocation.capability_grant_revocation_id &&
          row.capability_grant_id ===
            revocation.grant_ref.capability_grant_id &&
          row.record_hash === recordHash,
      );
      if (exact !== undefined) return clone(revocation);
      if (existing.rowCount !== 0) {
        throw new PostgresCapabilityGrantError(
          "CAPABILITY_GRANT_REVOCATION_ID_CONFLICT",
          "A revocation identity or CapabilityGrant is already bound to another retained revocation.",
        );
      }

      await client.query(
        `INSERT INTO petra.capability_grant_revocations (
           capability_grant_revocation_id, revision, capability_grant_id,
           capability_grant_revision, project_id, grant_content_hash,
           grant_record_hash, content_hash,
           revoked_by_actor_id, revoked_by_actor_kind, revoked_at,
           schema_name, schema_version, record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11::timestamptz, $12, $13, $14, $15::jsonb
         )`,
        [
          revocation.capability_grant_revocation_id,
          revocation.revision,
          revocation.grant_ref.capability_grant_id,
          revocation.grant_ref.revision,
          revocation.project_id,
          revocation.grant_ref.content_hash,
          revocation.grant_ref.record_hash,
          revocation.content_hash,
          revocation.revoked_by.actor_id,
          revocation.revoked_by.actor_kind,
          revocation.revoked_at,
          revocation.schema_name,
          revocation.schema_version,
          recordHash,
          JSON.stringify(revocation),
        ],
      );
      return clone(revocation);
    });
  }

  async getCapabilityGrant(
    capabilityGrantId: string,
  ): Promise<PetraCapabilityGrantRecord | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.capability_grants
        WHERE capability_grant_id = $1`,
      [capabilityGrantId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : this.#grantFrom(row);
  }

  async listProjectCapabilityGrants(
    projectId: string,
  ): Promise<readonly PetraCapabilityGrantRecord[]> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.capability_grants
        WHERE project_id = $1
        ORDER BY issued_at DESC, capability_grant_id ASC`,
      [projectId],
    );
    return result.rows.map((row) => this.#grantFrom(row));
  }

  async getCapabilityGrantRevocation(
    capabilityGrantRevocationId: string,
  ): Promise<PetraCapabilityGrantRevocation | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.capability_grant_revocations
        WHERE capability_grant_revocation_id = $1`,
      [capabilityGrantRevocationId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : this.#revocationFrom(row);
  }

  async getRevocationForCapabilityGrant(
    capabilityGrantId: string,
  ): Promise<PetraCapabilityGrantRevocation | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.capability_grant_revocations
        WHERE capability_grant_id = $1`,
      [capabilityGrantId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : this.#revocationFrom(row);
  }

  #assertGrant(grant: PetraCapabilityGrantRecord): void {
    this.#contracts.assertValid(
      "capability-grant",
      grant.schema_version,
      grant,
    );
    if (grant.content_hash !== canonicalHash(grant.content)) {
      throw new PostgresCapabilityGrantError(
        "CAPABILITY_GRANT_CONTENT_HASH_MISMATCH",
        "The CapabilityGrant content hash must identify its exact canonical content.",
      );
    }
    const issuedAt = Date.parse(grant.issued_at);
    const validFrom = Date.parse(grant.content.valid_from);
    const expiresAt =
      grant.content.expires_at === undefined
        ? undefined
        : Date.parse(grant.content.expires_at);
    if (
      issuedAt > validFrom ||
      (expiresAt !== undefined && expiresAt <= validFrom)
    ) {
      throw new PostgresCapabilityGrantError(
        "CAPABILITY_GRANT_TIME_INVALID",
        "CapabilityGrant validity must begin at or after issuance and expire strictly after it begins.",
      );
    }
  }

  #assertRevocation(revocation: PetraCapabilityGrantRevocation): void {
    this.#contracts.assertValid(
      "capability-grant-revocation",
      "1.0.0",
      revocation,
    );
    if (revocation.content_hash !== canonicalHash(revocation.content)) {
      throw new PostgresCapabilityGrantError(
        "CAPABILITY_GRANT_REVOCATION_CONTENT_HASH_MISMATCH",
        "The revocation content hash must identify its exact canonical content.",
      );
    }
  }

  #grantFrom(row: StoredRow): PetraCapabilityGrantRecord {
    const grant = clone(row.payload) as PetraCapabilityGrantRecord;
    this.#assertGrant(grant);
    if (row.record_hash !== canonicalHash(grant)) {
      throw new PostgresCapabilityGrantError(
        "CAPABILITY_GRANT_ID_CONFLICT",
        "The stored CapabilityGrant record hash does not match its payload.",
      );
    }
    return grant;
  }

  #revocationFrom(row: StoredRow): PetraCapabilityGrantRevocation {
    const revocation = clone(row.payload) as PetraCapabilityGrantRevocation;
    this.#assertRevocation(revocation);
    if (row.record_hash !== canonicalHash(revocation)) {
      throw new PostgresCapabilityGrantError(
        "CAPABILITY_GRANT_REVOCATION_ID_CONFLICT",
        "The stored revocation record hash does not match its payload.",
      );
    }
    return revocation;
  }

  async #requireProjectOwner(
    client: PoolClient,
    projectId: string,
    actor: { readonly actor_id: string; readonly actor_kind: string },
  ): Promise<void> {
    const result = await client.query<ProjectOwnerRow>(
      `SELECT created_by_actor_id, created_by_actor_kind
         FROM petra.projects
        WHERE project_id = $1
        FOR SHARE`,
      [projectId],
    );
    const owner = result.rows[0];
    if (owner === undefined) {
      throw new PostgresCapabilityGrantError(
        "CAPABILITY_GRANT_REFERENCE_MISSING",
        "The CapabilityGrant Project is not registered.",
      );
    }
    if (
      owner.created_by_actor_id !== actor.actor_id ||
      owner.created_by_actor_kind !== actor.actor_kind
    ) {
      throw new PostgresCapabilityGrantError(
        "CAPABILITY_GRANT_ISSUER_NOT_PROJECT_OWNER",
        "Only the local Project owner may issue or revoke this version of a CapabilityGrant.",
      );
    }
  }

  async #requireActor(
    client: PoolClient,
    actor: { readonly actor_id: string; readonly actor_kind: string },
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1
         FROM petra.actors
        WHERE actor_id = $1 AND actor_kind = $2
        FOR SHARE`,
      [actor.actor_id, actor.actor_kind],
    );
    if (result.rowCount !== 1) {
      throw new PostgresCapabilityGrantError(
        "CAPABILITY_GRANT_REFERENCE_MISSING",
        "The CapabilityGrant grantee Actor is not registered.",
      );
    }
  }

  async #lock(client: PoolClient, key: string): Promise<void> {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [key],
    );
  }

  async #transactionTime(client: PoolClient): Promise<number> {
    const result = await client.query<TransactionTimeRow>(
      "SELECT CURRENT_TIMESTAMP AS transaction_time",
    );
    const timestamp = result.rows[0]?.transaction_time.getTime();
    if (timestamp === undefined) {
      throw new Error("PostgreSQL did not provide a transaction timestamp.");
    }
    return timestamp;
  }

  async #transaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const result = await operation(client);
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

/**
 * Fails closed against one exact immutable command grant. A shared lock keeps a
 * concurrent revocation from committing until the owning command transaction
 * completes; revocation registration takes the corresponding exclusive lock.
 */
export class PostgresCapabilityGrantCommandAuthorizer implements PostgresCommandAuthorizer {
  readonly #contracts: PetraContractRegistry;

  constructor(contracts = new PetraContractRegistry()) {
    this.#contracts = contracts;
  }

  async authorize(
    request: CommandAuthorizationRequest,
    transaction: PoolClient,
  ): Promise<boolean> {
    const result = await transaction.query<EvaluationRow>(
      `SELECT payload, record_hash, CURRENT_TIMESTAMP AS evaluated_at
         FROM petra.capability_grants
        WHERE capability_grant_id = $1
        FOR SHARE`,
      [request.capabilityGrantId],
    );
    const row = result.rows[0];
    if (row === undefined) return false;

    let grant: PetraCapabilityGrantRecord;
    try {
      grant = clone(row.payload) as PetraCapabilityGrantRecord;
      this.#contracts.assertValid(
        "capability-grant",
        grant.schema_version,
        grant,
      );
      if (
        grant.content_hash !== canonicalHash(grant.content) ||
        row.record_hash !== canonicalHash(grant)
      ) {
        return false;
      }
    } catch {
      return false;
    }

    if (
      grant.project_id !== request.projectId ||
      !sameActor(grant.grantee, request.actor) ||
      !(grant.content.allowed_commands as readonly string[]).includes(
        request.commandName,
      )
    ) {
      return false;
    }
    const evaluatedAt = row.evaluated_at.getTime();
    if (
      Date.parse(grant.content.valid_from) > evaluatedAt ||
      (grant.content.expires_at !== undefined &&
        Date.parse(grant.content.expires_at) <= evaluatedAt)
    ) {
      return false;
    }

    const revocation = await transaction.query(
      `SELECT 1
         FROM petra.capability_grant_revocations
        WHERE capability_grant_id = $1`,
      [request.capabilityGrantId],
    );
    return revocation.rowCount === 0;
  }
}
