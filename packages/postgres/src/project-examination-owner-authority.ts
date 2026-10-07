import type { Pool, PoolClient } from "pg";
import type {
  PetraCapabilityGrantV1160,
  PetraProjectExaminationAuthorityRequest,
  PetraProjectExaminationAuthorityReceipt,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  copilotHash,
  derivePetraId,
  examinationAuthorityProposal,
  ExaminationBoundaryError,
  type ExaminationActor,
  type ProjectExaminationOwnerAuthority,
} from "@petra/core";
import type { PostgresProjectSemanticGraphReader } from "./project-semantic-graph-reader.js";
import type { PostgresProjectExaminationRegistry } from "./project-examination-registry.js";
type Row = {
  project_id: string;
  actor_id: string;
  request_hash: string;
  request_payload: PetraProjectExaminationAuthorityRequest;
  receipt_hash: string;
  receipt_payload: PetraProjectExaminationAuthorityReceipt;
};
export class PostgresProjectExaminationOwnerAuthority implements ProjectExaminationOwnerAuthority {
  constructor(
    readonly pool: Pool,
    readonly graphs: PostgresProjectSemanticGraphReader,
    readonly registry: PostgresProjectExaminationRegistry,
    readonly contracts = new PetraContractRegistry(),
  ) {}
  async availability(projectId: string, actor: ExaminationActor) {
    const result = await this.pool.query(
      `SELECT p.created_by_actor_id,p.created_by_actor_kind,r.status FROM petra.projects p JOIN petra.project_revisions r ON r.project_id=p.project_id AND r.revision=p.current_revision WHERE p.project_id=$1`,
      [projectId],
    );
    const owner = result.rows[0] as
      | {
          created_by_actor_id: string;
          created_by_actor_kind: string;
          status: string;
        }
      | undefined;
    return owner?.created_by_actor_id === actor.actor_id &&
      owner.created_by_actor_kind === "human" &&
      owner.status === "active"
      ? {
          state: "available" as const,
          reason:
            "You own this Project. Review the exact proposal to grant yourself only ConductProjectExamination. Existing permissions are unchanged.",
        }
      : {
          state: "unavailable" as const,
          reason:
            "Only the authenticated human who owns this active Project may authorize their own examination capability.",
        };
  }
  #check(
    row: Row,
    projectId: string,
    actor: ExaminationActor,
  ): PetraProjectExaminationAuthorityReceipt {
    const receipt = row.receipt_payload;
    this.contracts.assertValid(
      "project-examination-authority-request",
      "1.0.0",
      row.request_payload,
    );
    this.contracts.assertValid(
      "project-examination-authority-receipt",
      "1.0.0",
      receipt,
    );
    const grant = receipt.content.grant;
    if (
      row.project_id !== projectId ||
      row.actor_id !== actor.actor_id ||
      receipt.project_id !== projectId ||
      row.request_payload.project_id !== projectId ||
      copilotHash(row.request_payload) !== row.request_hash ||
      copilotHash(receipt) !== row.receipt_hash ||
      copilotHash(receipt.content) !== receipt.content_hash ||
      receipt.content.request_hash !== row.request_hash ||
      receipt.content.command_id !== row.request_payload.command_id ||
      receipt.content.idempotency_key !== row.request_payload.idempotency_key ||
      receipt.content.graph_content_hash !==
        row.request_payload.graph_content_hash ||
      copilotHash(receipt.content.review) !==
        copilotHash(row.request_payload.review) ||
      copilotHash(receipt.content.actor) !== copilotHash(actor) ||
      grant.project_id !== projectId ||
      copilotHash(grant.grantee) !== copilotHash(actor) ||
      copilotHash(grant.issued_by) !== copilotHash(actor) ||
      grant.content.allowed_commands.length !== 1 ||
      grant.content.allowed_commands[0] !== "ConductProjectExamination" ||
      copilotHash(grant.content) !== grant.content_hash
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_AUTHORITY_RECEIPT_MISMATCH",
        "The retained authority receipt does not bind this exact actor, Project, request and grant.",
      );
    return structuredClone(receipt);
  }
  async recover(projectId: string, commandId: string, actor: ExaminationActor) {
    const result = await this.pool.query<Row>(
      "SELECT * FROM petra.project_examination_authority_receipts WHERE project_id=$1 AND command_id=$2 AND actor_id=$3",
      [projectId, commandId, actor.actor_id],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#check(result.rows[0], projectId, actor);
  }
  async execute(
    projectId: string,
    request: PetraProjectExaminationAuthorityRequest,
    actor: ExaminationActor,
  ) {
    this.contracts.assertValid(
      "project-examination-authority-request",
      "1.0.0",
      request,
    );
    if (
      actor.actor_kind !== "human" ||
      projectId !== request.project_id ||
      request.review.proposed_content_hash !==
        copilotHash(
          examinationAuthorityProposal(projectId, request.graph_content_hash),
        )
    )
      throw new ExaminationBoundaryError(
        "EXAMINATION_AUTHORITY_REVIEW_MISMATCH",
        "Review must bind this exact owner-only capability proposal.",
      );
    for (let attempt = 0; ; attempt++) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        for (const key of [
          `command:${request.command_id}`,
          `idempotency:${request.idempotency_key}`,
          `project:${projectId}`,
        ].sort())
          await client.query(
            "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
            [key],
          );
        const prior = await client.query<Row>(
          "SELECT * FROM petra.project_examination_authority_receipts WHERE command_id=$1 OR idempotency_key=$2",
          [request.command_id, request.idempotency_key],
        );
        if (prior.rows.length !== 0) {
          if (
            prior.rows.length !== 1 ||
            prior.rows[0]!.request_hash !== copilotHash(request)
          )
            throw new ExaminationBoundaryError(
              "EXAMINATION_AUTHORITY_COMMAND_CONFLICT",
              "The command or retry key already belongs to a different authority request.",
            );
          const receipt = this.#check(prior.rows[0]!, projectId, actor);
          await client.query("COMMIT");
          return receipt;
        }
        const owner = await client.query<{
          created_by_actor_id: string;
          created_by_actor_kind: string;
          status: string;
        }>(
          `SELECT p.created_by_actor_id,p.created_by_actor_kind,r.status FROM petra.projects p JOIN petra.project_revisions r ON r.project_id=p.project_id AND r.revision=p.current_revision WHERE p.project_id=$1 FOR SHARE OF p,r`,
          [projectId],
        );
        const row = owner.rows[0];
        if (
          row?.created_by_actor_id !== actor.actor_id ||
          row.created_by_actor_kind !== "human" ||
          row.status !== "active"
        )
          throw new ExaminationBoundaryError(
            "EXAMINATION_NOT_AUTHORIZED",
            "Only the authenticated human owner of this active Project may issue this grant.",
          );
        const graph = await this.graphs.getProjectSemanticGraphInTransaction(
          client,
          projectId,
        );
        if (
          graph === undefined ||
          graph.content_hash !== request.graph_content_hash ||
          (await this.registry.resolve(projectId, graph, client)) === undefined
        )
          throw new ExaminationBoundaryError(
            "EXAMINATION_BASIS_CHANGED",
            "The exact registered examination basis changed. Refresh and review a new authority proposal.",
          );
        const existing = await client.query(
          `SELECT g.capability_grant_id FROM petra.capability_grants g WHERE g.project_id=$1 AND g.grantee_actor_id=$2 AND g.grantee_actor_kind='human' AND 'ConductProjectExamination'=ANY(g.allowed_commands) AND g.valid_from<=transaction_timestamp() AND (g.expires_at IS NULL OR g.expires_at>transaction_timestamp()) AND NOT EXISTS(SELECT 1 FROM petra.capability_grant_revocations r WHERE r.capability_grant_id=g.capability_grant_id) FOR SHARE OF g`,
          [projectId, actor.actor_id],
        );
        if (existing.rows.length !== 0)
          throw new ExaminationBoundaryError(
            "EXAMINATION_AUTHORITY_ALREADY_PRESENT",
            "An active examination grant already exists. Refresh the current authority instead of issuing a duplicate.",
          );
        const time = (
          await client.query<{ at: Date }>(
            "SELECT transaction_timestamp() AS at",
          )
        ).rows[0]!.at.toISOString();
        if (Date.parse(request.review.reviewed_at) > Date.parse(time))
          throw new ExaminationBoundaryError(
            "EXAMINATION_AUTHORITY_REVIEW_MISMATCH",
            "The human review cannot be dated after the authority transaction.",
          );
        const grant: PetraCapabilityGrantV1160 = {
          schema_name: "petra.capability-grant",
          schema_version: "1.16.0",
          capability_grant_id: derivePetraId(
            "capability_grant",
            request.command_id,
          ),
          revision: 1,
          project_id: projectId,
          grantee: actor,
          content: {
            scope_kind: "project_commands",
            allowed_commands: ["ConductProjectExamination"],
            valid_from: time,
            reason: request.review.rationale,
          },
          content_hash: "",
          issued_by: actor,
          issued_at: time,
        };
        grant.content_hash = copilotHash(grant.content);
        this.contracts.assertValid("capability-grant", "1.16.0", grant);
        await this.#insertGrant(client, grant);
        const receipt: PetraProjectExaminationAuthorityReceipt = {
          schema_name: "petra.project-examination-authority-receipt",
          schema_version: "1.0.0",
          project_id: projectId,
          project_examination_authority_receipt_id: derivePetraId(
            "examination_authority_receipt",
            request.command_id,
          ),
          revision: 1,
          content: {
            command_id: request.command_id,
            idempotency_key: request.idempotency_key,
            request_hash: copilotHash(request),
            graph_content_hash: graph.content_hash,
            actor,
            grant,
            review: request.review,
            recorded_at: time,
            authority_effect: "owner_examination_grant",
            projection_effect: "none",
          },
          content_hash: "",
        };
        receipt.content_hash = copilotHash(receipt.content);
        this.contracts.assertValid(
          "project-examination-authority-receipt",
          "1.0.0",
          receipt,
        );
        await client.query(
          "INSERT INTO petra.project_examination_authority_receipts(command_id,idempotency_key,project_id,actor_id,actor_kind,capability_grant_id,request_hash,request_payload,receipt_hash,receipt_payload,recorded_at) VALUES($1,$2,$3,$4,'human',$5,$6,$7::jsonb,$8,$9::jsonb,$10::timestamptz)",
          [
            request.command_id,
            request.idempotency_key,
            projectId,
            actor.actor_id,
            grant.capability_grant_id,
            copilotHash(request),
            JSON.stringify(request),
            copilotHash(receipt),
            JSON.stringify(receipt),
            time,
          ],
        );
        await client.query("COMMIT");
        return receipt;
      } catch (error) {
        await client.query("ROLLBACK");
        if (
          attempt < 2 &&
          error !== null &&
          typeof error === "object" &&
          "code" in error &&
          ["40001", "40P01"].includes(String(error.code))
        )
          continue;
        throw error;
      } finally {
        client.release();
      }
    }
  }
  async #insertGrant(client: PoolClient, grant: PetraCapabilityGrantV1160) {
    await client.query(
      `INSERT INTO petra.capability_grants(capability_grant_id,revision,project_id,grantee_actor_id,grantee_actor_kind,scope_kind,allowed_commands,valid_from,expires_at,content_hash,issued_by_actor_id,issued_by_actor_kind,issued_at,schema_name,schema_version,record_hash,payload) VALUES($1,1,$2,$3,'human','project_commands',$4::text[],$5::timestamptz,NULL,$6,$3,'human',$5::timestamptz,'petra.capability-grant','1.16.0',$7,$8::jsonb)`,
      [
        grant.capability_grant_id,
        grant.project_id,
        grant.grantee.actor_id,
        grant.content.allowed_commands,
        grant.issued_at,
        grant.content_hash,
        copilotHash(grant),
        JSON.stringify(grant),
      ],
    );
  }
}
