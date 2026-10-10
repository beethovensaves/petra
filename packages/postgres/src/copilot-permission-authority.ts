import type { Pool, PoolClient } from "pg";
import type {
  PetraProject,
  PetraCapabilityGrantV1170,
  PetraCopilotAuthorityRequest,
  PetraCopilotAuthorityReceipt,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  CopilotBoundaryError,
  copilotHash,
  conversationAuthorityProposal,
  derivePetraId,
  type ConversationPermissionAuthority,
  type ConversationPermissionRead,
} from "@petra/core";
import { PostgresSingleUserCommandPrincipalResolver } from "./single-user-command-principal-resolver.js";
import { PostgresCapabilityGrantAuthorityRepository } from "./capability-grant-authority-repository.js";
type Stored = {
  project_id: string;
  actor_id: string;
  request_hash: string;
  request_payload: PetraCopilotAuthorityRequest;
  receipt_hash: string;
  receipt_payload: PetraCopilotAuthorityReceipt;
  canonical_grant: PetraCapabilityGrantV1170;
  canonical_grant_hash: string;
};
/** Questions and model output have no permission-writing port. This owner command
 * grants only advisory conversation, with a reviewed exact Project proposal. */
export class PostgresCopilotPermissionAuthority implements ConversationPermissionAuthority {
  readonly contracts = new PetraContractRegistry();
  readonly principal: PostgresSingleUserCommandPrincipalResolver;
  constructor(
    readonly pool: Pool,
    readonly actorId: string,
  ) {
    this.principal = new PostgresSingleUserCommandPrincipalResolver(pool, {
      actor_id: actorId,
      actor_kind: "human",
    });
  }
  async #project(
    query: Pool | PoolClient,
    projectId: string,
    lock = false,
  ): Promise<PetraProject | undefined> {
    const row = (
      await query.query<{ payload: PetraProject; record_hash: string }>(
        `SELECT r.payload,r.record_hash FROM petra.projects p JOIN petra.project_revisions r ON r.project_id=p.project_id AND r.revision=p.current_revision WHERE p.project_id=$1 AND p.created_by_actor_id=$2 AND p.created_by_actor_kind='human' ${lock ? "FOR UPDATE OF p" : ""}`,
        [projectId, this.actorId],
      )
    ).rows[0];
    if (row === undefined) return undefined;
    this.contracts.assertValid("project", "1.0.0", row.payload);
    if (
      row.payload.project_id !== projectId ||
      row.payload.status !== "active" ||
      copilotHash(row.payload) !== row.record_hash
    )
      throw new CopilotBoundaryError(
        "CONVERSATION_PERMISSION_UNAVAILABLE",
        "The active Project owner or exact Project record is unavailable.",
      );
    return row.payload;
  }
  async read(projectId: string): Promise<ConversationPermissionRead> {
    const project = await this.#project(this.pool, projectId);
    if (project === undefined)
      return {
        state: "unavailable",
        reason:
          "Only the authenticated human owner of this active Project can enable retained conversation.",
      };
    const narrow = await this.principal.resolveCommandPrincipal({
      projectId,
      commandName: "RunProjectCopilot",
    });
    if (narrow.state === "resolved")
      return { state: "ready", grant_id: narrow.capabilityGrantId };
    if (narrow.reason === "active_grant_ambiguous")
      return {
        state: "unavailable",
        reason:
          "Conversation permission is ambiguous. Resolve the existing grants before starting Work.",
      };
    const broad = await this.principal.resolveCommandPrincipal({
      projectId,
      commandName: "ManageProjectWork",
    });
    if (broad.state === "resolved")
      return { state: "ready", grant_id: broad.capabilityGrantId };
    if (broad.reason === "active_grant_ambiguous")
      return {
        state: "unavailable",
        reason:
          "Project Work permission is ambiguous. Resolve the existing grants before starting Work.",
      };
    return {
      state: "required",
      reason:
        "Review permission to run bounded advisory questions and retain their history in this Project.",
      proposal: conversationAuthorityProposal(project, this.actorId),
    };
  }
  #receipt(
    row: Stored,
    projectId: string,
    request: PetraCopilotAuthorityRequest,
  ): PetraCopilotAuthorityReceipt {
    const receipt = row.receipt_payload;
    this.contracts.assertValid(
      "copilot-authority-request",
      "1.0.0",
      row.request_payload,
    );
    this.contracts.assertValid("copilot-authority-receipt", "1.0.0", receipt);
    if (
      row.project_id !== projectId ||
      row.actor_id !== this.actorId ||
      row.request_hash !== copilotHash(request) ||
      copilotHash(row.request_payload) !== row.request_hash ||
      copilotHash(receipt) !== row.receipt_hash ||
      copilotHash(receipt.content) !== receipt.content_hash ||
      copilotHash(row.canonical_grant) !== row.canonical_grant_hash ||
      copilotHash(row.canonical_grant) !== copilotHash(receipt.content.grant) ||
      receipt.project_id !== projectId ||
      receipt.content.request_hash !== row.request_hash ||
      receipt.content.command_id !== request.command_id ||
      receipt.content.idempotency_key !== request.idempotency_key ||
      copilotHash(receipt.content.proposal) !== copilotHash(request.proposal) ||
      copilotHash(receipt.content.review) !== copilotHash(request.review) ||
      receipt.content.grant.project_id !== projectId ||
      receipt.content.grant.grantee.actor_id !== this.actorId ||
      receipt.content.grant.issued_by.actor_id !== this.actorId ||
      copilotHash(receipt.content.grant.content) !==
        receipt.content.grant.content_hash ||
      copilotHash(receipt.content.grant.content.allowed_commands) !==
        copilotHash(["RunProjectCopilot"])
    )
      throw new CopilotBoundaryError(
        "CONVERSATION_PERMISSION_CONFLICT",
        "The retained permission receipt does not match the exact owner proposal and request.",
      );
    return structuredClone(receipt);
  }
  async execute(
    projectId: string,
    request: PetraCopilotAuthorityRequest,
  ): Promise<PetraCopilotAuthorityReceipt> {
    this.contracts.assertValid("copilot-authority-request", "1.0.0", request);
    if (
      projectId !== request.project_id ||
      request.proposal.project_id !== projectId ||
      request.proposal.actor_id !== this.actorId ||
      request.review.proposed_content_hash !== copilotHash(request.proposal)
    )
      throw new CopilotBoundaryError(
        "CONVERSATION_PERMISSION_MISMATCH",
        "Review must bind this exact owner and Project conversation permission.",
      );
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      for (const key of [
        `copilot-authority:${request.command_id}`,
        `copilot-authority-key:${request.idempotency_key}`,
        `copilot-authority-project:${projectId}:${this.actorId}`,
      ].sort())
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [key],
        );
      const existing = (
        await client.query<Stored>(
          "SELECT r.*,g.payload AS canonical_grant,g.record_hash AS canonical_grant_hash FROM petra.copilot_authority_receipts r JOIN petra.capability_grants g ON g.capability_grant_id=r.capability_grant_id WHERE r.command_id=$1 OR r.idempotency_key=$2",
          [request.command_id, request.idempotency_key],
        )
      ).rows[0];
      if (existing !== undefined) {
        const receipt = this.#receipt(existing, projectId, request);
        await client.query("COMMIT");
        return receipt;
      }
      const project = await this.#project(client, projectId, true);
      if (
        project === undefined ||
        copilotHash(conversationAuthorityProposal(project, this.actorId)) !==
          copilotHash(request.proposal)
      )
        throw new CopilotBoundaryError(
          "CONVERSATION_PERMISSION_STALE",
          "The exact owner permission proposal changed. Read and review the current Project again.",
        );
      const active = await client.query(
        "SELECT capability_grant_id FROM petra.capability_grants g WHERE project_id=$1 AND grantee_actor_id=$2 AND 'RunProjectCopilot'=ANY(allowed_commands) AND valid_from<=CURRENT_TIMESTAMP AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) AND NOT EXISTS(SELECT 1 FROM petra.capability_grant_revocations r WHERE r.capability_grant_id=g.capability_grant_id)",
        [projectId, this.actorId],
      );
      if (active.rowCount !== 0)
        throw new CopilotBoundaryError(
          "CONVERSATION_PERMISSION_ALREADY_ACTIVE",
          "Conversation permission is already active. Retain its existing receipt instead of creating another grant.",
        );
      const at = (
        await client.query<{ at: Date }>("SELECT CURRENT_TIMESTAMP AS at")
      ).rows[0]!.at.toISOString();
      if (Date.parse(request.review.reviewed_at) > Date.parse(at) + 1000)
        throw new CopilotBoundaryError(
          "CONVERSATION_PERMISSION_MISMATCH",
          "Permission review exceeds the one-second client clock allowance. The original client review time and actual database grant time remain retained separately.",
        );
      const actor = { actor_id: this.actorId, actor_kind: "human" as const };
      const content: PetraCapabilityGrantV1170["content"] = {
        scope_kind: "project_commands",
        allowed_commands: ["RunProjectCopilot"],
        valid_from: at,
        reason:
          "Explicit owner permission for bounded advisory conversation Work and private retained history only. It grants no Review, examination, general Work management or domain authority.",
      };
      const grant: PetraCapabilityGrantV1170 = {
        schema_name: "petra.capability-grant",
        schema_version: "1.17.0",
        capability_grant_id: derivePetraId(
          "capability_grant",
          `copilot:${projectId}:${this.actorId}:${request.command_id}`,
        ),
        revision: 1,
        project_id: projectId,
        grantee: actor,
        content,
        content_hash: copilotHash(content),
        issued_by: actor,
        issued_at: at,
      };
      await new PostgresCapabilityGrantAuthorityRepository(
        this.pool,
        this.contracts,
      )
        .inTransaction(client)
        .registerCapabilityGrant(grant);
      const receiptContent = {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: copilotHash(request),
        proposal: request.proposal,
        review: request.review,
        grant,
      };
      const receipt: PetraCopilotAuthorityReceipt = {
        schema_name: "petra.copilot-authority-receipt",
        schema_version: "1.0.0",
        copilot_authority_receipt_id: derivePetraId(
          "copilot_authority_receipt",
          request.command_id,
        ),
        revision: 1,
        project_id: projectId,
        content: receiptContent,
        content_hash: copilotHash(receiptContent),
        recorded_at: at,
      };
      this.contracts.assertValid("copilot-authority-receipt", "1.0.0", receipt);
      await client.query(
        "INSERT INTO petra.copilot_authority_receipts(command_id,idempotency_key,project_id,actor_id,actor_kind,capability_grant_id,request_hash,request_payload,receipt_hash,receipt_payload,recorded_at) VALUES($1,$2,$3,$4,'human',$5,$6,$7::jsonb,$8,$9::jsonb,$10)",
        [
          request.command_id,
          request.idempotency_key,
          projectId,
          this.actorId,
          grant.capability_grant_id,
          copilotHash(request),
          JSON.stringify(request),
          copilotHash(receipt),
          JSON.stringify(receipt),
          at,
        ],
      );
      await client.query("COMMIT");
      return receipt;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
