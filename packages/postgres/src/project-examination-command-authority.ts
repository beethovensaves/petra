import type { Pool, PoolClient } from "pg";
import type {
  PetraHypothesis,
  PetraHypothesisAssessment,
  PetraPostureDecision,
  PetraCycleDisposition,
  PetraProjectExaminationRequest,
  PetraProjectExaminationReceipt,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  copilotHash,
  derivePetraId,
  examinationRecordRef,
  ExaminationBoundaryError,
  type ExaminationActor,
  type ProjectExaminationRecord,
  type ProjectExaminationCommandAuthority,
  type ProjectExaminationCommandResult,
} from "@petra/core";
import type { PostgresCommandAuthorizer } from "./command-authorizer.js";
import type { PostgresProjectExaminationRegistry } from "./project-examination-registry.js";
import type { PostgresProjectExaminationRepository } from "./project-examination-repository.js";
import type { PostgresProjectSemanticGraphReader } from "./project-semantic-graph-reader.js";

type Row = {
  request_payload: PetraProjectExaminationRequest;
  request_hash: string;
  receipt_payload: PetraProjectExaminationReceipt;
  receipt_hash: string;
  actor_id: string;
  actor_kind: string;
  project_id: string;
  command_id: string;
  idempotency_key: string;
};
const kinds = {
  register_hypothesis: "hypothesis",
  revise_hypothesis: "hypothesis",
  assess_hypothesis: "hypothesis-assessment",
  decide_posture: "posture-decision",
  conclude_cycle: "cycle-disposition",
} as const;
/** Exact human review of one Project-scoped examination record. This owner
 * confers no Claim promotion, graph projection, model authority or Work success. */
export class PostgresProjectExaminationCommandAuthority implements ProjectExaminationCommandAuthority {
  constructor(
    readonly pool: Pool,
    readonly records: PostgresProjectExaminationRepository,
    readonly graphs: PostgresProjectSemanticGraphReader,
    readonly registry: PostgresProjectExaminationRegistry,
    readonly authorizer: PostgresCommandAuthorizer,
    readonly contracts = new PetraContractRegistry(),
  ) {}
  async #retained(
    db: Pool | PoolClient,
    projectId: string,
    commandId: string,
    actor: ExaminationActor,
    idempotencyKey?: string,
  ): Promise<Row | undefined> {
    const result = await db.query<Row>(
      "SELECT * FROM petra.project_examination_command_receipts WHERE command_id=$1 OR ($2::text IS NOT NULL AND idempotency_key=$2)",
      [commandId, idempotencyKey ?? null],
    );
    if (result.rows.length > 1)
      throw new ExaminationBoundaryError(
        "EXAMINATION_COMMAND_CONFLICT",
        "The command identities belong to different retained executions.",
      );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    if (
      row.project_id !== projectId ||
      row.actor_id !== actor.actor_id ||
      row.actor_kind !== actor.actor_kind
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_COMMAND_NOT_AVAILABLE",
        "This examination command is unavailable to the authenticated Project actor.",
      );
    this.contracts.assertValid(
      "project-examination-receipt",
      "1.0.0",
      row.receipt_payload,
    );
    this.contracts.assertValid(
      "project-examination-request",
      "1.0.0",
      row.request_payload,
    );
    if (
      copilotHash(row.receipt_payload) !== row.receipt_hash ||
      copilotHash(row.receipt_payload.content) !==
        row.receipt_payload.content_hash ||
      copilotHash(row.request_payload) !== row.request_hash ||
      row.request_payload.project_id !== row.project_id ||
      row.request_payload.command_id !== row.command_id ||
      row.request_payload.idempotency_key !== row.idempotency_key ||
      row.receipt_payload.project_id !== row.project_id ||
      row.receipt_payload.content.command_id !== row.command_id ||
      row.receipt_payload.content.request_hash !== row.request_hash ||
      row.receipt_payload.content.actor.actor_id !== row.actor_id ||
      row.receipt_payload.content.actor.actor_kind !== row.actor_kind ||
      row.receipt_payload.content.graph_content_hash !==
        row.request_payload.expected_graph_hash
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_RECEIPT_CORRUPT",
        "The retained command identity is incoherent.",
      );
    return row;
  }
  async #result(row: Row): Promise<ProjectExaminationCommandResult> {
    const ref = row.receipt_payload.content.record_ref;
    const record = await this.records.get(
      row.project_id,
      ref.record_id,
      ref.revision,
    );
    if (
      record === undefined ||
      copilotHash(examinationRecordRef(record)) !== copilotHash(ref)
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_RECEIPT_CORRUPT",
        "The receipt's exact examination record is unavailable.",
      );
    return {
      outcome: "replayed",
      record,
      receipt: structuredClone(row.receipt_payload),
    };
  }
  async listReceipts(
    projectId: string,
    records: readonly ProjectExaminationRecord[],
    actor: ExaminationActor,
  ): Promise<PetraProjectExaminationReceipt[]> {
    if (
      records.length > 100 ||
      records.some((record) => record.project_id !== projectId)
    )
      throw new ExaminationBoundaryError(
        "INVALID_RECEIPT_QUERY",
        "A receipt query requires one exact bounded Project history page.",
      );
    const refs = records.map(examinationRecordRef);
    const result = await this.pool.query<Row>(
      "SELECT * FROM petra.project_examination_command_receipts WHERE project_id=$1 AND actor_id=$2 AND actor_kind='human' AND (record_id,record_revision) IN (SELECT r.id,r.revision FROM jsonb_to_recordset($3::jsonb) AS r(id text,revision bigint)) ORDER BY recorded_at,command_id LIMIT 100",
      [
        projectId,
        actor.actor_id,
        JSON.stringify(
          refs.map((ref) => ({ id: ref.record_id, revision: ref.revision })),
        ),
      ],
    );
    return result.rows.map((row) => {
      this.contracts.assertValid(
        "project-examination-receipt",
        "1.0.0",
        row.receipt_payload,
      );
      if (
        copilotHash(row.receipt_payload) !== row.receipt_hash ||
        row.receipt_payload.content_hash !==
          copilotHash(row.receipt_payload.content) ||
        !refs.some(
          (ref) =>
            copilotHash(ref) ===
            copilotHash(row.receipt_payload.content.record_ref),
        )
      )
        throw new ExaminationBoundaryError(
          "EXAMINATION_RECEIPT_CORRUPT",
          "The retained history receipt does not bind the exact requested examination revision.",
        );
      return structuredClone(row.receipt_payload);
    });
  }
  async recover(
    projectId: string,
    commandId: string,
    actor: ExaminationActor,
  ): Promise<ProjectExaminationCommandResult | undefined> {
    const row = await this.#retained(this.pool, projectId, commandId, actor);
    return row === undefined ? undefined : this.#result(row);
  }
  async execute(
    projectId: string,
    request: PetraProjectExaminationRequest,
    principal: { actor: ExaminationActor; capabilityGrantId?: string },
  ): Promise<ProjectExaminationCommandResult> {
    this.contracts.assertValid("project-examination-request", "1.0.0", request);
    if (request.project_id !== projectId)
      throw new ExaminationBoundaryError(
        "PROJECT_SCOPE",
        "The command belongs to another Project.",
      );
    if (
      Buffer.byteLength(JSON.stringify(request), "utf8") > 64000 ||
      request.review.content_hash !== copilotHash(request.proposed_content)
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_REVIEW_INVALID",
        "Human review must bind this exact bounded proposed content.",
      );
    const requestHash = copilotHash(request);
    const replay = await this.#retained(
      this.pool,
      projectId,
      request.command_id,
      principal.actor,
      request.idempotency_key,
    );
    if (replay !== undefined) {
      this.#match(replay, request, requestHash);
      return this.#result(replay);
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        for (const lock of [
          `examination-command:${request.command_id}`,
          `examination-idempotency:${request.idempotency_key}`,
          `project-examination:${projectId}`,
        ].sort())
          await client.query(
            "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
            [lock],
          );
        const retained = await this.#retained(
          client,
          projectId,
          request.command_id,
          principal.actor,
          request.idempotency_key,
        );
        if (retained !== undefined) {
          this.#match(retained, request, requestHash);
          await client.query("COMMIT");
          return this.#result(retained);
        }
        if (
          principal.capabilityGrantId === undefined ||
          !(await this.authorizer.authorize(
            {
              actor: principal.actor,
              capabilityGrantId: principal.capabilityGrantId,
              projectId,
              commandName: "ConductProjectExamination",
            },
            client,
          ))
        )
          throw new ExaminationBoundaryError(
            "EXAMINATION_NOT_AUTHORIZED",
            "The authenticated human lacks the exact active ConductProjectExamination grant.",
          );
        const project = await client.query<{ status: string }>(
          "SELECT r.status FROM petra.projects h JOIN petra.project_revisions r ON r.project_id=h.project_id AND r.revision=h.current_revision WHERE h.project_id=$1 FOR SHARE OF h",
          [projectId],
        );
        if (project.rows[0]?.status !== "active")
          throw new ExaminationBoundaryError(
            "PROJECT_NOT_AVAILABLE",
            "The active Project is unavailable.",
          );
        await client.query(
          "SELECT project_definition_id FROM petra.project_definitions WHERE project_id=$1 FOR SHARE",
          [projectId],
        );
        await client.query(
          "SELECT working_candidate_id FROM petra.working_candidates WHERE project_id=$1 ORDER BY working_candidate_id FOR SHARE",
          [projectId],
        );
        await client.query(
          "SELECT working_relationship_id FROM petra.working_relationships WHERE project_id=$1 ORDER BY working_relationship_id FOR SHARE",
          [projectId],
        );
        await client.query(
          "SELECT project_id FROM petra.project_objective_focus WHERE project_id=$1 FOR SHARE",
          [projectId],
        );
        const graph = await this.graphs.getProjectSemanticGraphInTransaction(
          client,
          projectId,
        );
        if (
          graph === undefined ||
          graph.content_hash !== request.expected_graph_hash
        )
          throw new ExaminationBoundaryError(
            "EXAMINATION_SNAPSHOT_CHANGED",
            "Refresh and review the changed Project graph before recording this examination.",
          );
        const configuration = await this.registry.resolve(
          projectId,
          graph,
          client,
        );
        if (configuration === undefined)
          throw new ExaminationBoundaryError(
            "EXAMINATION_PROFILE_UNREGISTERED",
            "This exact ProjectDefinition registers no executable examination profile and policy.",
          );
        const kind = kinds[request.operation];
        const priorRef = request.expected_prior_ref;
        let prior: ProjectExaminationRecord | undefined;
        if (priorRef !== null) {
          const previous = await client.query<{
            payload: ProjectExaminationRecord;
            record_hash: string;
          }>(
            "SELECT payload,record_hash FROM petra.project_examination_records WHERE project_id=$1 AND record_id=$2 ORDER BY revision DESC LIMIT 1",
            [projectId, priorRef.record_id],
          );
          prior = previous.rows[0]?.payload;
          if (
            prior === undefined ||
            copilotHash(examinationRecordRef(prior)) !==
              copilotHash(priorRef) ||
            prior.schema_name !== `petra.${kind}`
          )
            throw new ExaminationBoundaryError(
              "EXAMINATION_PRIOR_CHANGED",
              "The prior examination revision changed or belongs to a different operation.",
            );
        } else if (request.operation === "revise_hypothesis")
          throw new ExaminationBoundaryError(
            "EXAMINATION_PRIOR_REQUIRED",
            "A Hypothesis revision must pin its immediately preceding revision.",
          );
        const time = await client.query<{ now: Date }>(
          "SELECT CURRENT_TIMESTAMP AS now",
        );
        const recordedAt = time.rows[0]!.now.toISOString();
        if (Date.parse(request.review.reviewed_at) > Date.parse(recordedAt))
          throw new ExaminationBoundaryError(
            "EXAMINATION_REVIEW_INVALID",
            "The human review timestamp cannot be later than its command transaction.",
          );
        const id =
          priorRef?.record_id ??
          derivePetraId(kind.replaceAll("-", "_"), request.command_id);
        const base = {
          schema_version: "1.0.0" as const,
          revision: (prior?.revision ?? 0) + 1,
          project_id: projectId,
          content_hash: request.review.content_hash,
          created_by: structuredClone(principal.actor),
          created_at: recordedAt,
        };
        let record: ProjectExaminationRecord;
        switch (kind) {
          case "hypothesis":
            record = {
              ...base,
              schema_name: "petra.hypothesis",
              hypothesis_id: id,
              content: structuredClone(
                request.proposed_content,
              ) as PetraHypothesis["content"],
            };
            break;
          case "hypothesis-assessment":
            record = {
              ...base,
              schema_name: "petra.hypothesis-assessment",
              hypothesis_assessment_id: id,
              content: structuredClone(
                request.proposed_content,
              ) as PetraHypothesisAssessment["content"],
            };
            this.#humanAssessment(record);
            break;
          case "posture-decision":
            record = {
              ...base,
              schema_name: "petra.posture-decision",
              posture_decision_id: id,
              content: structuredClone(
                request.proposed_content,
              ) as PetraPostureDecision["content"],
            };
            break;
          case "cycle-disposition":
            record = {
              ...base,
              schema_name: "petra.cycle-disposition",
              cycle_disposition_id: id,
              content: structuredClone(
                request.proposed_content,
              ) as PetraCycleDisposition["content"],
            };
            break;
        }
        const admitted = await this.records.appendInTransaction(
          client,
          record,
          graph,
          configuration.kernel,
        );
        const receiptContent: PetraProjectExaminationReceipt["content"] = {
          command_id: request.command_id,
          idempotency_key: request.idempotency_key,
          request_hash: requestHash,
          operation: request.operation,
          actor: structuredClone(principal.actor),
          capability_grant_id: principal.capabilityGrantId,
          graph_content_hash: graph.content_hash,
          profile_ref: configuration.kernel.semantics.profile_ref,
          policy_ref: configuration.kernel.semantics.policy_ref,
          record_ref: examinationRecordRef(admitted),
          prior_ref: priorRef,
          review: structuredClone(request.review),
          authority_effect: "project_scoped_examination",
          projection_effect: "none",
          recorded_at: recordedAt,
        };
        const receipt: PetraProjectExaminationReceipt = {
          schema_name: "petra.project-examination-receipt",
          schema_version: "1.0.0",
          project_examination_receipt_id: derivePetraId(
            "project_examination_receipt",
            request.command_id,
          ),
          project_id: projectId,
          revision: 1,
          content: receiptContent,
          content_hash: copilotHash(receiptContent),
        };
        this.contracts.assertValid(
          "project-examination-receipt",
          "1.0.0",
          receipt,
        );
        await client.query(
          "INSERT INTO petra.project_examination_command_receipts(command_id,idempotency_key,request_hash,project_id,actor_id,actor_kind,capability_grant_id,record_id,record_revision,request_payload,receipt_hash,receipt_payload,recorded_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13)",
          [
            request.command_id,
            request.idempotency_key,
            requestHash,
            projectId,
            principal.actor.actor_id,
            principal.actor.actor_kind,
            principal.capabilityGrantId,
            id,
            record.revision,
            JSON.stringify(request),
            copilotHash(receipt),
            JSON.stringify(receipt),
            recordedAt,
          ],
        );
        await client.query("COMMIT");
        return { outcome: "recorded", record: admitted, receipt };
      } catch (error) {
        await client.query("ROLLBACK");
        if (
          attempt === 3 ||
          !(error instanceof Error) ||
          !("code" in error) ||
          (error.code !== "40001" && error.code !== "40P01")
        )
          throw error;
      } finally {
        client.release();
      }
    }
    throw new ExaminationBoundaryError(
      "EXAMINATION_CONCURRENT_CHANGE",
      "The examination could not be recorded after concurrent changes.",
    );
  }
  #match(
    row: Row,
    request: PetraProjectExaminationRequest,
    hash: string,
  ): void {
    if (
      row.command_id !== request.command_id ||
      row.idempotency_key !== request.idempotency_key ||
      row.request_hash !== hash
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_COMMAND_CONFLICT",
        "This command identity is already bound to a different immutable request.",
      );
  }
  #humanAssessment(record: PetraHypothesisAssessment): void {
    if (
      record.content.origin !== "human_judgment" ||
      record.content.criteria.some(
        (c) => c.result !== "unknown" && c.origin !== "human_judgment",
      ) ||
      record.content.findings.some(
        (f) => f.review_state === "reviewed" && f.origin !== "human_judgment",
      )
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_REVIEW_INVALID",
        "This human command cannot manufacture deterministic or policy-derived findings. Model considerations must retain their proposed origin and unknown result.",
      );
    if (Date.parse(record.content.as_of) > Date.parse(record.created_at))
      throw new ExaminationBoundaryError(
        "EXAMINATION_REVIEW_INVALID",
        "The assessment cannot claim a future examination date.",
      );
  }
}
