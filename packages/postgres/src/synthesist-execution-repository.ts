import { createHash } from "node:crypto";

import type {
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  PersistSynthesistExecutionInput,
  SynthesistExecutionRepository,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type SynthesistExecutionPersistenceErrorCode =
  | "SYNTHESIST_CERTIFICATION_HASH_MISMATCH"
  | "SYNTHESIST_CERTIFICATION_ID_REUSED"
  | "SYNTHESIST_REQUEST_HASH_MISMATCH"
  | "SYNTHESIST_REQUEST_ID_REUSED"
  | "SYNTHESIST_CALL_HASH_MISMATCH"
  | "SYNTHESIST_CALL_SET_MISMATCH"
  | "SYNTHESIST_OUTPUT_HASH_MISMATCH";

export class SynthesistExecutionPersistenceError extends Error {
  readonly code: SynthesistExecutionPersistenceErrorCode;

  constructor(code: SynthesistExecutionPersistenceErrorCode, message: string) {
    super(message);
    this.name = "SynthesistExecutionPersistenceError";
    this.code = code;
  }
}

interface PayloadRow {
  payload: unknown;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const certificationHash = (
  certification: PetraSynthesistRoleCertification,
): string =>
  canonicalHash({
    deployment: certification.deployment,
    role_profile: certification.role_profile,
    scope: certification.scope,
    evaluation: certification.evaluation,
    decision: certification.decision,
  });

const sameMembersInOrder = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const asCertification = (payload: unknown): PetraSynthesistRoleCertification =>
  clone(payload) as PetraSynthesistRoleCertification;

const asRequest = (payload: unknown): PetraSynthesistModelRequest =>
  clone(payload) as PetraSynthesistModelRequest;

const asCall = (payload: unknown): PetraSynthesistModelCall =>
  clone(payload) as PetraSynthesistModelCall;

export class PostgresSynthesistExecutionRepository implements SynthesistExecutionRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerCertification(
    certification: PetraSynthesistRoleCertification,
  ): Promise<PetraSynthesistRoleCertification> {
    this.#contracts.assertValid(
      "model-role-certification",
      "1.1.0",
      certification,
    );
    if (certification.content_hash !== certificationHash(certification)) {
      throw new SynthesistExecutionPersistenceError(
        "SYNTHESIST_CERTIFICATION_HASH_MISMATCH",
        "The synthesist certification hash does not bind its exact content.",
      );
    }
    return this.#transaction(async (client) => {
      await this.#lock(
        client,
        `model-certification:${certification.role_certification_id}`,
      );
      const existing = await client.query<PayloadRow>(
        `SELECT payload
           FROM petra.model_role_certifications
          WHERE role_certification_id = $1`,
        [certification.role_certification_id],
      );
      if (existing.rows[0] !== undefined) {
        const stored = asCertification(existing.rows[0].payload);
        if (!same(stored, certification)) {
          throw new SynthesistExecutionPersistenceError(
            "SYNTHESIST_CERTIFICATION_ID_REUSED",
            "The certification ID is already bound to different content.",
          );
        }
        return stored;
      }
      await client.query(
        `INSERT INTO petra.model_role_certifications (
           role_certification_id, revision, model_deployment_id, provider_id,
           role, role_profile_id, role_profile_version, domain, language,
           document_class, decision_status, valid_from, expires_at,
           content_hash, certified_by_actor_id, certified_by_actor_kind,
           certified_at, record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           $12::timestamptz, $13::timestamptz, $14, $15, $16,
           $17::timestamptz, $18, $19::jsonb
         )`,
        [
          certification.role_certification_id,
          certification.revision,
          certification.deployment.model_deployment_id,
          certification.deployment.provider_id,
          certification.role_profile.role,
          certification.role_profile.role_profile_id,
          certification.role_profile.version,
          certification.scope.domain,
          certification.scope.language,
          certification.scope.document_class,
          certification.decision.status,
          certification.decision.valid_from,
          certification.decision.expires_at ?? null,
          certification.content_hash,
          certification.certified_by.actor_id,
          certification.certified_by.actor_kind,
          certification.certified_at,
          canonicalHash(certification),
          JSON.stringify(certification),
        ],
      );
      return clone(certification);
    });
  }

  async getCertification(
    roleCertificationId: string,
  ): Promise<PetraSynthesistRoleCertification | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload
         FROM petra.model_role_certifications
        WHERE role_certification_id = $1
          AND role = 'synthesist'`,
      [roleCertificationId],
    );
    return result.rows[0] === undefined
      ? undefined
      : asCertification(result.rows[0].payload);
  }

  async persistExecution(
    execution: PersistSynthesistExecutionInput,
  ): Promise<PersistSynthesistExecutionInput> {
    this.#validateExecution(execution);
    return this.#transaction(async (client) => {
      await this.#lock(
        client,
        `model-request:${execution.request.model_request_id}`,
      );
      const existing = await client.query<PayloadRow>(
        `SELECT payload
           FROM petra.model_requests
          WHERE model_request_id = $1`,
        [execution.request.model_request_id],
      );
      if (existing.rows[0] !== undefined) {
        const stored = await this.#readExecution(
          client,
          asRequest(existing.rows[0].payload),
        );
        if (!same(stored, execution)) {
          throw new SynthesistExecutionPersistenceError(
            "SYNTHESIST_REQUEST_ID_REUSED",
            "The synthesist request ID is already bound to another execution.",
          );
        }
        return stored;
      }

      const selected = execution.request.content.routing.selected;
      await client.query(
        `INSERT INTO petra.model_requests (
           model_request_id, revision, project_id, workflow_id, role,
           impact_class, egress_class, routing_policy_id,
           routing_policy_hash, selected_deployment_id,
           selected_certification_id, terminal_state, content_hash,
           created_at, completed_at, record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
           $13, $14::timestamptz, $15::timestamptz, $16, $17::jsonb
         )`,
        [
          execution.request.model_request_id,
          execution.request.revision,
          execution.request.content.project_id,
          execution.request.content.workflow.workflow_id,
          execution.request.content.role,
          execution.request.content.impact_class,
          execution.request.content.outbound_context.egress_class,
          execution.request.content.routing_policy_ref.routing_policy_id,
          execution.request.content.routing_policy_ref.content_hash,
          selected?.model_deployment_id ?? null,
          selected?.role_certification_id ?? null,
          execution.request.content.terminal.state,
          execution.request.content_hash,
          execution.request.created_at,
          execution.request.completed_at,
          canonicalHash(execution.request),
          JSON.stringify(execution.request),
        ],
      );
      for (const call of execution.calls) await this.#insertCall(client, call);
      return {
        request: clone(execution.request),
        calls: execution.calls.map(clone),
      };
    });
  }

  async getRequest(
    modelRequestId: string,
  ): Promise<PetraSynthesistModelRequest | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload
         FROM petra.model_requests
        WHERE model_request_id = $1
          AND role = 'synthesist'`,
      [modelRequestId],
    );
    return result.rows[0] === undefined
      ? undefined
      : asRequest(result.rows[0].payload);
  }

  async listCalls(
    modelRequestId: string,
  ): Promise<readonly PetraSynthesistModelCall[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT call.payload
         FROM petra.model_calls AS call
         JOIN petra.model_requests AS request USING (model_request_id)
        WHERE call.model_request_id = $1
          AND request.role = 'synthesist'
        ORDER BY call.attempt`,
      [modelRequestId],
    );
    return result.rows.map((row) => asCall(row.payload));
  }

  #validateExecution(execution: PersistSynthesistExecutionInput): void {
    const { request, calls } = execution;
    this.#contracts.assertValid("model-request", "1.1.0", request);
    if (request.content_hash !== canonicalHash(request.content)) {
      throw new SynthesistExecutionPersistenceError(
        "SYNTHESIST_REQUEST_HASH_MISMATCH",
        "The synthesist request content hash is invalid.",
      );
    }
    const callIds = calls.map((call) => call.model_call_id);
    if (
      !sameMembersInOrder(request.content.terminal.model_call_ids, callIds) ||
      calls.some(
        (call, index) =>
          call.content.model_request_id !== request.model_request_id ||
          call.content.attempt !== index + 1,
      )
    ) {
      throw new SynthesistExecutionPersistenceError(
        "SYNTHESIST_CALL_SET_MISMATCH",
        "The terminal result must name the exact ordered synthesist calls.",
      );
    }
    for (const call of calls) {
      this.#contracts.assertValid("model-call", "1.1.0", call);
      if (call.content_hash !== canonicalHash(call.content)) {
        throw new SynthesistExecutionPersistenceError(
          "SYNTHESIST_CALL_HASH_MISMATCH",
          `ModelCall ${call.model_call_id} has an invalid content hash.`,
        );
      }
    }
    if (request.content.terminal.state !== "completed") return;
    const terminalCall = calls.at(-1);
    if (
      terminalCall?.content.outcome !== "success" ||
      terminalCall.content.output === undefined ||
      request.content.terminal.output_hash !==
        canonicalHash(terminalCall.content.output)
    ) {
      throw new SynthesistExecutionPersistenceError(
        "SYNTHESIST_OUTPUT_HASH_MISMATCH",
        "A completed synthesist request must hash its successful terminal output.",
      );
    }
  }

  async #insertCall(
    client: PoolClient,
    call: PetraSynthesistModelCall,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.model_calls (
         model_call_id, revision, model_request_id, attempt, attempt_kind,
         model_deployment_id, provider_id, observed_revision, replayability,
         outcome, input_tokens, output_tokens, cost_amount, cost_currency,
         total_ms, validation_ms, content_hash, started_at, completed_at,
         record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13::numeric, $14, $15, $16, $17, $18::timestamptz,
         $19::timestamptz, $20, $21::jsonb
       )`,
      [
        call.model_call_id,
        call.revision,
        call.content.model_request_id,
        call.content.attempt,
        call.content.attempt_kind,
        call.content.deployment.model_deployment_id,
        call.content.deployment.provider_id,
        call.content.deployment.observed_revision,
        call.content.deployment.replayability,
        call.content.outcome,
        call.content.usage.input_tokens,
        call.content.usage.output_tokens,
        call.content.cost.amount,
        call.content.cost.currency,
        call.content.timing.total_ms,
        call.content.timing.validation_ms,
        call.content_hash,
        call.started_at,
        call.completed_at,
        canonicalHash(call),
        JSON.stringify(call),
      ],
    );
  }

  async #readExecution(
    client: PoolClient,
    request: PetraSynthesistModelRequest,
  ): Promise<PersistSynthesistExecutionInput> {
    const result = await client.query<PayloadRow>(
      `SELECT payload
         FROM petra.model_calls
        WHERE model_request_id = $1
        ORDER BY attempt`,
      [request.model_request_id],
    );
    return {
      request,
      calls: result.rows.map((row) => asCall(row.payload)),
    };
  }

  async #lock(client: PoolClient, key: string): Promise<void> {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [key],
    );
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

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);
