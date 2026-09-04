import { createHash } from "node:crypto";

import type {
  PetraCompositionPlan,
  PetraCompositionRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  CompositionControlAuthorityRepository,
  InMemoryContextPacketRegistry,
} from "@petra/core";
import { InMemoryCompositionRegistry } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type CompositionPersistenceErrorCode =
  | "COMPOSITION_PERSISTENCE_REQUEST_ID_CONFLICT"
  | "COMPOSITION_PERSISTENCE_PLAN_ID_CONFLICT"
  | "COMPOSITION_PERSISTENCE_REFERENCE_MISSING"
  | "COMPOSITION_PERSISTENCE_REFERENCE_MISMATCH"
  | "COMPOSITION_PERSISTENCE_STORED_RECORD_CORRUPT";

export class CompositionPersistenceError extends Error {
  readonly code: CompositionPersistenceErrorCode;

  constructor(code: CompositionPersistenceErrorCode, message: string) {
    super(message);
    this.name = "CompositionPersistenceError";
    this.code = code;
  }
}

interface StoredRow {
  record_hash: string;
  payload: unknown;
}

interface ReferenceStateRow {
  project_exists: boolean;
  actor_exists: boolean;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

export class PostgresCompositionAuthorityRepository implements CompositionControlAuthorityRepository {
  readonly #pool: Pool;
  readonly #packets: InMemoryContextPacketRegistry;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    packets: InMemoryContextPacketRegistry,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#packets = packets;
    this.#contracts = contracts;
  }

  async registerRequest(
    request: PetraCompositionRequest,
  ): Promise<PetraCompositionRequest> {
    this.#contracts.assertValid(
      "composition-request",
      request.schema_version,
      request,
    );
    const validator = new InMemoryCompositionRegistry(this.#packets);
    const validated = clone(request);
    validator.registerRequest(clone(validated));
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `composition-project:${validated.project_id}`,
        `composition-request:${validated.composition_request_id}`,
      ]);
      const existing = await this.#selectStored(
        client,
        "petra.composition_requests",
        "composition_request_id",
        validated.composition_request_id,
      );
      if (existing !== undefined) {
        if (!same(existing.payload, validated)) {
          throw new CompositionPersistenceError(
            "COMPOSITION_PERSISTENCE_REQUEST_ID_CONFLICT",
            "The CompositionRequest ID is already bound to different content.",
          );
        }
        this.#assertStoredRecord(existing, "CompositionRequest");
        return this.#asRequest(existing.payload);
      }
      await this.#requireRequestReferences(client, validated);
      await client.query(
        `INSERT INTO petra.composition_requests (
           composition_request_id, revision, project_id, snapshot_id,
           snapshot_revision, snapshot_event_position, snapshot_hash,
           content_hash, requested_by_actor_id, requested_by_actor_kind,
           requested_at, record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11::timestamptz, $12, $13::jsonb
         )`,
        [
          validated.composition_request_id,
          validated.revision,
          validated.project_id,
          validated.snapshot_ref.snapshot_id,
          validated.snapshot_ref.snapshot_revision,
          validated.snapshot_ref.event_position,
          validated.snapshot_ref.content_hash,
          validated.content_hash,
          validated.requested_by.actor_id,
          validated.requested_by.actor_kind,
          validated.requested_at,
          canonicalHash(validated),
          JSON.stringify(validated),
        ],
      );
      for (const [index, subject] of validated.content.subject_refs.entries()) {
        await client.query(
          `INSERT INTO petra.composition_request_subjects (
             composition_request_id, position, object_kind, object_id,
             object_revision, object_hash
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            validated.composition_request_id,
            index + 1,
            subject.object_kind,
            subject.object_id,
            subject.object_revision,
            subject.object_hash,
          ],
        );
      }
      return clone(validated);
    });
  }

  async registerPlan(
    plan: PetraCompositionPlan,
  ): Promise<PetraCompositionPlan> {
    this.#contracts.assertValid("composition-plan", plan.schema_version, plan);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `composition-plan:${plan.composition_plan_id}`,
        `composition-request:${plan.composition_request_ref.composition_request_id}`,
        `evidence-packet:${plan.evidence_packet_ref.evidence_packet_id}`,
      ]);
      const existing = await this.#selectStored(
        client,
        "petra.composition_plans",
        "composition_plan_id",
        plan.composition_plan_id,
      );
      if (existing !== undefined) {
        if (!same(existing.payload, plan)) {
          throw new CompositionPersistenceError(
            "COMPOSITION_PERSISTENCE_PLAN_ID_CONFLICT",
            "The CompositionPlan ID is already bound to different content.",
          );
        }
        this.#assertStoredRecord(existing, "CompositionPlan");
        return this.#asPlan(existing.payload);
      }

      const requestRow = await this.#selectStored(
        client,
        "petra.composition_requests",
        "composition_request_id",
        plan.composition_request_ref.composition_request_id,
      );
      const evidenceRow = await this.#selectStored(
        client,
        "petra.evidence_packets",
        "evidence_packet_id",
        plan.evidence_packet_ref.evidence_packet_id,
      );
      const evidence = this.#packets.getEvidencePacket(
        plan.evidence_packet_ref.evidence_packet_id,
      );
      if (
        requestRow === undefined ||
        evidenceRow === undefined ||
        evidence === undefined
      ) {
        throw new CompositionPersistenceError(
          "COMPOSITION_PERSISTENCE_REFERENCE_MISSING",
          "The exact durable request and EvidencePacket must exist before a new CompositionPlan is stored.",
        );
      }
      this.#assertStoredRecord(requestRow, "CompositionRequest");
      this.#assertStoredRecord(evidenceRow, "EvidencePacket");
      if (!same(evidenceRow.payload, evidence)) {
        throw new CompositionPersistenceError(
          "COMPOSITION_PERSISTENCE_REFERENCE_MISMATCH",
          "The in-memory EvidencePacket differs from its durable record.",
        );
      }
      const request = this.#asRequest(requestRow.payload);
      const validator = new InMemoryCompositionRegistry(this.#packets);
      validator.registerRequest(clone(request));
      const validated = clone(plan);
      validator.registerPlan(clone(validated));
      await this.#requirePlanActor(client, validated);
      await client.query(
        `INSERT INTO petra.composition_plans (
           composition_plan_id, revision, project_id,
           composition_request_id, composition_request_hash,
           evidence_packet_id, evidence_packet_hash,
           snapshot_id, snapshot_revision, snapshot_event_position,
           snapshot_hash, plan_state, content_hash,
           compiled_by_actor_id, compiled_by_actor_kind, compiled_at,
           record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           $12, $13, $14, $15, $16::timestamptz, $17, $18::jsonb
         )`,
        [
          validated.composition_plan_id,
          validated.revision,
          validated.project_id,
          validated.composition_request_ref.composition_request_id,
          validated.composition_request_ref.content_hash,
          validated.evidence_packet_ref.evidence_packet_id,
          validated.evidence_packet_ref.content_hash,
          validated.snapshot_ref.snapshot_id,
          validated.snapshot_ref.snapshot_revision,
          validated.snapshot_ref.event_position,
          validated.snapshot_ref.content_hash,
          validated.content.state,
          validated.content_hash,
          validated.compiled_by.actor_id,
          validated.compiled_by.actor_kind,
          validated.compiled_at,
          canonicalHash(validated),
          JSON.stringify(validated),
        ],
      );
      for (const section of validated.content.sections) {
        for (const move of section.moves) {
          for (const [index, reference] of move.evidence_refs.entries()) {
            await client.query(
              `INSERT INTO petra.composition_plan_evidence_refs (
                 composition_plan_id, section_position, move_position,
                 evidence_position, context_selection_order, object_kind,
                 object_id, object_revision, object_hash, relation
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                validated.composition_plan_id,
                section.position,
                move.position,
                index + 1,
                reference.context_selection_order,
                reference.object_ref.object_kind,
                reference.object_ref.object_id,
                reference.object_ref.object_revision,
                reference.object_ref.object_hash,
                reference.relation,
              ],
            );
          }
        }
      }
      return clone(validated);
    });
  }

  async getRequest(
    compositionRequestId: string,
  ): Promise<PetraCompositionRequest | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT record_hash, payload
         FROM petra.composition_requests
        WHERE composition_request_id = $1`,
      [compositionRequestId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    this.#assertStoredRecord(row, "CompositionRequest");
    return this.#asRequest(row.payload);
  }

  async getPlan(
    compositionPlanId: string,
  ): Promise<PetraCompositionPlan | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT record_hash, payload
         FROM petra.composition_plans
        WHERE composition_plan_id = $1`,
      [compositionPlanId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    this.#assertStoredRecord(row, "CompositionPlan");
    return this.#asPlan(row.payload);
  }

  async #requireRequestReferences(
    client: PoolClient,
    request: PetraCompositionRequest,
  ): Promise<void> {
    const result = await client.query<ReferenceStateRow>(
      `SELECT
         EXISTS (
           SELECT 1 FROM petra.projects WHERE project_id = $1
         ) AS project_exists,
         EXISTS (
           SELECT 1 FROM petra.actors
            WHERE actor_id = $2 AND actor_kind = $3
         ) AS actor_exists`,
      [
        request.project_id,
        request.requested_by.actor_id,
        request.requested_by.actor_kind,
      ],
    );
    if (
      result.rows[0]?.project_exists !== true ||
      result.rows[0].actor_exists !== true
    ) {
      throw new CompositionPersistenceError(
        "COMPOSITION_PERSISTENCE_REFERENCE_MISSING",
        "The request's exact Project and requesting Actor must exist first.",
      );
    }
  }

  async #requirePlanActor(
    client: PoolClient,
    plan: PetraCompositionPlan,
  ): Promise<void> {
    const result = await client.query<{ actor_exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM petra.actors
          WHERE actor_id = $1 AND actor_kind = $2
       ) AS actor_exists`,
      [plan.compiled_by.actor_id, plan.compiled_by.actor_kind],
    );
    if (result.rows[0]?.actor_exists !== true) {
      throw new CompositionPersistenceError(
        "COMPOSITION_PERSISTENCE_REFERENCE_MISSING",
        "The CompositionPlan compiler must be a registered service Actor.",
      );
    }
  }

  async #selectStored(
    client: PoolClient,
    table: string,
    idColumn: string,
    id: string,
  ): Promise<StoredRow | undefined> {
    const allowed = new Map([
      ["petra.composition_requests", "composition_request_id"],
      ["petra.composition_plans", "composition_plan_id"],
      ["petra.evidence_packets", "evidence_packet_id"],
    ]);
    if (allowed.get(table) !== idColumn) {
      throw new Error("Unsupported composition persistence table selection.");
    }
    const result = await client.query<StoredRow>(
      `SELECT record_hash, payload FROM ${table} WHERE ${idColumn} = $1`,
      [id],
    );
    return result.rows[0];
  }

  #assertStoredRecord(row: StoredRow, label: string): void {
    if (row.record_hash !== canonicalHash(row.payload)) {
      throw new CompositionPersistenceError(
        "COMPOSITION_PERSISTENCE_STORED_RECORD_CORRUPT",
        `${label} payload no longer matches its stored canonical record hash.`,
      );
    }
  }

  #asRequest(value: unknown): PetraCompositionRequest {
    this.#contracts.assertValid("composition-request", "1.0.0", value);
    return clone(value) as PetraCompositionRequest;
  }

  #asPlan(value: unknown): PetraCompositionPlan {
    this.#contracts.assertValid("composition-plan", "1.0.0", value);
    return clone(value) as PetraCompositionPlan;
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #transaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      const value = await operation(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
