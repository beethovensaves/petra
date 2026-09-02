import { createHash } from "node:crypto";

import type {
  PetraEvidenceProposalBundle,
  PetraModelCall,
  PetraModelRequest,
  PetraModelRoleCertification,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  ModelExecutionRepository,
  PersistModelExecutionInput,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type ModelExecutionPersistenceErrorCode =
  | "MODEL_CERTIFICATION_HASH_MISMATCH"
  | "MODEL_CERTIFICATION_ID_REUSED"
  | "MODEL_REQUEST_HASH_MISMATCH"
  | "MODEL_REQUEST_ID_REUSED"
  | "MODEL_CALL_HASH_MISMATCH"
  | "MODEL_CALL_SET_MISMATCH"
  | "MODEL_PROPOSAL_HASH_MISMATCH"
  | "MODEL_PROPOSAL_LINK_MISMATCH";

export class ModelExecutionPersistenceError extends Error {
  readonly code: ModelExecutionPersistenceErrorCode;

  constructor(code: ModelExecutionPersistenceErrorCode, message: string) {
    super(message);
    this.name = "ModelExecutionPersistenceError";
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
  certification: PetraModelRoleCertification,
): string =>
  canonicalHash({
    deployment: certification.deployment,
    role_profile: certification.role_profile,
    scope: certification.scope,
    evaluation: certification.evaluation,
    decision: certification.decision,
  });

const asCertification = (payload: unknown): PetraModelRoleCertification =>
  clone(payload) as PetraModelRoleCertification;

const asRequest = (payload: unknown): PetraModelRequest =>
  clone(payload) as PetraModelRequest;

const asCall = (payload: unknown): PetraModelCall =>
  clone(payload) as PetraModelCall;

const asProposal = (payload: unknown): PetraEvidenceProposalBundle =>
  clone(payload) as PetraEvidenceProposalBundle;

const sameMembersInOrder = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

export class PostgresModelExecutionRepository implements ModelExecutionRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerCertification(
    certification: PetraModelRoleCertification,
  ): Promise<PetraModelRoleCertification> {
    this.#contracts.assertValid(
      "model-role-certification",
      "1.0.0",
      certification,
    );
    if (certification.content_hash !== certificationHash(certification)) {
      throw new ModelExecutionPersistenceError(
        "MODEL_CERTIFICATION_HASH_MISMATCH",
        "The RoleCertification hash does not bind its exact certification content.",
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
      const row = existing.rows[0];
      if (row !== undefined) {
        const stored = asCertification(row.payload);
        if (canonicalize(stored) !== canonicalize(certification)) {
          throw new ModelExecutionPersistenceError(
            "MODEL_CERTIFICATION_ID_REUSED",
            "The RoleCertification ID is already bound to different content.",
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
  ): Promise<PetraModelRoleCertification | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload
         FROM petra.model_role_certifications
        WHERE role_certification_id = $1`,
      [roleCertificationId],
    );
    return result.rows[0] === undefined
      ? undefined
      : asCertification(result.rows[0].payload);
  }

  async persistExecution(
    execution: PersistModelExecutionInput,
  ): Promise<PersistModelExecutionInput> {
    this.#validateExecution(execution);
    return this.#transaction(async (client) => {
      await this.#lock(
        client,
        `model-request:${execution.request.model_request_id}`,
      );
      const existing = await client.query<PayloadRow>(
        `SELECT payload FROM petra.model_requests WHERE model_request_id = $1`,
        [execution.request.model_request_id],
      );
      if (existing.rows[0] !== undefined) {
        const stored = await this.#readExecution(
          client,
          asRequest(existing.rows[0].payload),
        );
        if (canonicalize(stored) !== canonicalize(execution)) {
          throw new ModelExecutionPersistenceError(
            "MODEL_REQUEST_ID_REUSED",
            "The ModelRequest ID is already bound to a different execution.",
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
      if (execution.proposal_bundle !== undefined) {
        await this.#insertProposal(client, execution.proposal_bundle);
      }
      return {
        request: clone(execution.request),
        calls: execution.calls.map(clone),
        ...(execution.proposal_bundle === undefined
          ? {}
          : { proposal_bundle: clone(execution.proposal_bundle) }),
      };
    });
  }

  async getRequest(
    modelRequestId: string,
  ): Promise<PetraModelRequest | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload FROM petra.model_requests WHERE model_request_id = $1`,
      [modelRequestId],
    );
    return result.rows[0] === undefined
      ? undefined
      : asRequest(result.rows[0].payload);
  }

  async listCalls(modelRequestId: string): Promise<readonly PetraModelCall[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload
         FROM petra.model_calls
        WHERE model_request_id = $1
        ORDER BY attempt`,
      [modelRequestId],
    );
    return result.rows.map((row) => asCall(row.payload));
  }

  async getProposalBundle(
    evidenceProposalBundleId: string,
  ): Promise<PetraEvidenceProposalBundle | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload
         FROM petra.model_evidence_proposal_bundles
        WHERE evidence_proposal_bundle_id = $1`,
      [evidenceProposalBundleId],
    );
    return result.rows[0] === undefined
      ? undefined
      : asProposal(result.rows[0].payload);
  }

  #validateExecution(execution: PersistModelExecutionInput): void {
    const { request, calls, proposal_bundle: proposal } = execution;
    this.#contracts.assertValid("model-request", "1.0.0", request);
    if (request.content_hash !== canonicalHash(request.content)) {
      throw new ModelExecutionPersistenceError(
        "MODEL_REQUEST_HASH_MISMATCH",
        "The ModelRequest content hash is invalid.",
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
      throw new ModelExecutionPersistenceError(
        "MODEL_CALL_SET_MISMATCH",
        "The ModelRequest terminal result must name its exact ordered ModelCalls.",
      );
    }
    for (const call of calls) {
      this.#contracts.assertValid("model-call", "1.0.0", call);
      if (call.content_hash !== canonicalHash(call.content)) {
        throw new ModelExecutionPersistenceError(
          "MODEL_CALL_HASH_MISMATCH",
          `ModelCall ${call.model_call_id} has an invalid content hash.`,
        );
      }
    }
    const proposalIds = request.content.terminal.proposal_bundle_ids;
    if (
      (proposal === undefined && proposalIds.length !== 0) ||
      (proposal !== undefined &&
        (proposalIds.length !== 1 ||
          proposalIds[0] !== proposal.evidence_proposal_bundle_id))
    ) {
      throw new ModelExecutionPersistenceError(
        "MODEL_PROPOSAL_LINK_MISMATCH",
        "The ModelRequest terminal result must name its exact proposal bundle.",
      );
    }
    if (proposal === undefined) return;
    this.#contracts.assertValid("evidence-proposal-bundle", "1.0.0", proposal);
    if (proposal.content_hash !== canonicalHash(proposal.content)) {
      throw new ModelExecutionPersistenceError(
        "MODEL_PROPOSAL_HASH_MISMATCH",
        "The evidence proposal bundle content hash is invalid.",
      );
    }
    const extraction = proposal.content.extraction;
    if (
      extraction.extraction_kind !== "model_extraction" ||
      extraction.model_request_id !== request.model_request_id ||
      !calls.some((call) => call.model_call_id === extraction.model_call_id) ||
      proposal.content.project_id !== request.content.project_id
    ) {
      throw new ModelExecutionPersistenceError(
        "MODEL_PROPOSAL_LINK_MISMATCH",
        "The proposal bundle does not identify the exact request, call, and Project that produced it.",
      );
    }
  }

  async #insertCall(client: PoolClient, call: PetraModelCall): Promise<void> {
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

  async #insertProposal(
    client: PoolClient,
    proposal: PetraEvidenceProposalBundle,
  ): Promise<void> {
    const extraction = proposal.content.extraction;
    if (extraction.extraction_kind !== "model_extraction") {
      throw new ModelExecutionPersistenceError(
        "MODEL_PROPOSAL_LINK_MISMATCH",
        "Only a model-extraction proposal belongs in the model execution record set.",
      );
    }
    await client.query(
      `INSERT INTO petra.model_evidence_proposal_bundles (
         evidence_proposal_bundle_id, revision, project_id,
         model_request_id, model_call_id, extraction_run_id, content_hash,
         created_by_actor_id, created_by_actor_kind, created_at,
         record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz,
         $11, $12::jsonb
       )`,
      [
        proposal.evidence_proposal_bundle_id,
        proposal.revision,
        proposal.content.project_id,
        extraction.model_request_id,
        extraction.model_call_id,
        extraction.extraction_run_id,
        proposal.content_hash,
        proposal.created_by.actor_id,
        proposal.created_by.actor_kind,
        proposal.created_at,
        canonicalHash(proposal),
        JSON.stringify(proposal),
      ],
    );
  }

  async #readExecution(
    client: PoolClient,
    request: PetraModelRequest,
  ): Promise<PersistModelExecutionInput> {
    const calls = await client.query<PayloadRow>(
      `SELECT payload
         FROM petra.model_calls
        WHERE model_request_id = $1
        ORDER BY attempt`,
      [request.model_request_id],
    );
    const proposal = await client.query<PayloadRow>(
      `SELECT payload
         FROM petra.model_evidence_proposal_bundles
        WHERE model_request_id = $1`,
      [request.model_request_id],
    );
    return {
      request,
      calls: calls.rows.map((row) => asCall(row.payload)),
      ...(proposal.rows[0] === undefined
        ? {}
        : { proposal_bundle: asProposal(proposal.rows[0].payload) }),
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
