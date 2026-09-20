import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraProjectSourceReuseReceipt,
  PetraProjectSourceReuseRecoveryView,
  PetraProjectSourceReuseRequest,
  PetraRightsDecision,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  derivePetraId,
  ProjectSourceReuseError,
  type ProjectSourceReuseAuthority,
  type ProjectSourceReusePrincipal,
  type ProjectSourceReuseResult,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

interface StoredRecordRow {
  readonly payload: unknown;
  readonly record_hash: string;
}

interface ExistingSourceRow {
  readonly source_payload: unknown;
  readonly source_record_hash: string;
  readonly manifest_payload: unknown;
  readonly manifest_record_hash: string;
  readonly rights_payload: unknown;
  readonly rights_record_hash: string;
  readonly artifact_payload: unknown;
  readonly artifact_record_hash: string;
}

interface ExistingSourceRecords {
  readonly source: PetraProjectSource;
  readonly manifest: PetraArtifactManifest;
  readonly rights: PetraRightsDecision;
  readonly artifact: PetraArtifact;
}

interface StoredReceiptRow {
  readonly command_id: string;
  readonly idempotency_key: string;
  readonly request_hash: string;
  readonly project_id: string;
  readonly actor_id: string;
  readonly actor_kind: "human";
  readonly receipt_payload: unknown;
  readonly receipt_record_hash: string;
  readonly source_payload: unknown;
  readonly source_record_hash: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const sameActor = (
  left: { readonly actor_id: string; readonly actor_kind: string },
  right: { readonly actor_id: string; readonly actor_kind: string },
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

const isRetryableTransactionError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error.code === "40001" || error.code === "40P01");

/**
 * Transactional authority for linking a retained canonical source and exact
 * permitted copy into another current Project role. It creates only the new
 * ProjectSource membership and receipt; identity, Artifact, rights, storage,
 * and bytes remain unchanged.
 */
export class PostgresProjectSourceReuseAuthority implements ProjectSourceReuseAuthority {
  readonly #pool: Pool;
  readonly #authorizer: PostgresCommandAuthorizer;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    authorizer: PostgresCommandAuthorizer,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#authorizer = authorizer;
    this.#contracts = contracts;
  }

  async executeProjectSourceReuse(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
    principal: ProjectSourceReusePrincipal,
  ): Promise<ProjectSourceReuseResult> {
    this.#contracts.assertValid(
      "project-source-reuse-request",
      "1.0.0",
      request,
    );
    this.#assertRouteProject(projectId, request);
    const requestHash = canonicalHash(request);
    const originRef = request.existing_source.origin_project_source_ref;

    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `source-reuse-command:${request.command_id}`,
        `source-reuse-idempotency:${request.idempotency_key}`,
        `source-reuse-origin:${originRef.project_source_id}`,
        `source-reuse-target:${projectId}:${request.existing_source.artifact_manifest_ref.artifact_manifest_id}`,
      ]);
      if (
        !(await this.#authorizer.authorize(
          {
            actor: principal.actor,
            capabilityGrantId: principal.capabilityGrantId,
            commandName: "ReuseProjectSource",
            projectId,
          },
          client,
        ))
      ) {
        throw new ProjectSourceReuseError(
          "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED",
          "The authenticated human and capability grant do not authorize source reuse in this Project.",
        );
      }

      const retained = await this.#storedByIdentity(
        client,
        request.command_id,
        request.idempotency_key,
      );
      if (retained.length > 0) {
        return this.#replay(
          retained,
          projectId,
          request,
          requestHash,
          principal,
        );
      }

      const projectRow = await this.#currentProject(client, projectId);
      const definitionRow = await this.#currentDefinition(client, projectId);
      const project = this.#project(projectRow.payload);
      const definition = this.#definition(definitionRow.payload);
      this.#assertExpectedProject(request, project, projectRow.record_hash);
      this.#assertExpectedDefinition(
        request,
        definition,
        definitionRow.record_hash,
      );
      this.#assertRole(request, definition);

      const existing = await this.#existingSource(client, request);
      this.#assertExistingSource(request, existing, principal);
      await this.#assertNoMembershipDuplicate(client, projectId, existing);

      const recordedAt = await this.#transactionTime(client);
      const projectSource = this.#projectSource(
        projectId,
        request,
        principal,
        existing,
        recordedAt,
      );
      this.#contracts.assertValid("project-source", "1.0.0", projectSource);
      await this.#insertProjectSource(client, projectSource);

      const receipt = this.#receipt(
        projectId,
        request,
        requestHash,
        principal,
        projectSource,
        recordedAt,
      );
      await this.#insertReceipt(client, receipt);
      return {
        receipt: clone(receipt),
        projectSource: clone(projectSource),
        applied: true,
      };
    });
  }

  async assessProjectSourceReuseRecovery(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
    principal: ProjectSourceReusePrincipal,
  ): Promise<PetraProjectSourceReuseRecoveryView> {
    this.#contracts.assertValid(
      "project-source-reuse-request",
      "1.0.0",
      request,
    );
    this.#assertRouteProject(projectId, request);
    const requestHash = canonicalHash(request);
    const rows = await this.#storedByIdentity(
      this.#pool,
      request.command_id,
      request.idempotency_key,
    );
    const exact =
      rows.length === 1 &&
      rows[0]?.project_id === projectId &&
      rows[0].command_id === request.command_id &&
      rows[0].idempotency_key === request.idempotency_key &&
      rows[0].request_hash === requestHash
        ? rows[0]
        : undefined;
    const owned =
      exact !== undefined && sameActor(exact, principal.actor)
        ? this.#storedResult(exact)
        : undefined;
    const subject = {
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      request_hash: requestHash,
    };
    const effect: PetraProjectSourceReuseRecoveryView["effect"] =
      owned !== undefined
        ? { state: "effect_confirmed", receipt: owned.receipt }
        : rows.length === 0
          ? {
              state: "outcome_unknown",
              reason: "receipt_not_observed_at_cutoff",
              retry: {
                method: "POST",
                path: `/api/commands/projects/${projectId}/sources/reuse`,
                reuse_exact_request: true,
              },
            }
          : {
              state: "unavailable_to_verify",
              reason:
                exact === undefined
                  ? "command_identity_conflict"
                  : "command_not_owned_by_authenticated_actor",
            };
    const returnValue: PetraProjectSourceReuseRecoveryView["return"] =
      owned === undefined
        ? {
            state: "safe_fallback",
            destination: { place_role: "sources", project_id: projectId },
            reason:
              "No exact owned receipt is available, so Petra returns to the Project source collection and re-reads membership before another action.",
          }
        : { state: "exact", destination: clone(owned.receipt.destination) };
    const observedAt = await this.#databaseTime();
    const hashed = {
      project_id: projectId,
      subject,
      effect,
      return: returnValue,
      observed_at: observedAt,
    };
    const contentHash = canonicalHash(hashed);
    const view: PetraProjectSourceReuseRecoveryView = {
      schema_name: "petra.project-source-reuse-recovery-view",
      schema_version: "1.0.0",
      assessment_id: derivePetraId("source_reuse_recovery", contentHash),
      ...hashed,
      content_hash: contentHash,
    };
    this.#contracts.assertValid(
      "project-source-reuse-recovery-view",
      "1.0.0",
      view,
    );
    return clone(view);
  }

  #assertRouteProject(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
  ): void {
    if (request.expected.project_ref.project_id !== projectId) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_PROJECT_STALE",
        "The source reuse route and exact reviewed Project must match.",
      );
    }
  }

  #assertExpectedProject(
    request: PetraProjectSourceReuseRequest,
    project: PetraProject,
    recordHash: string,
  ): void {
    const expected = request.expected.project_ref;
    if (
      project.project_id !== expected.project_id ||
      project.revision !== expected.revision ||
      recordHash !== expected.record_hash ||
      project.status !== "active"
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_PROJECT_STALE",
        "The Project revision, record hash, or active status changed after source reuse review.",
      );
    }
  }

  #assertExpectedDefinition(
    request: PetraProjectSourceReuseRequest,
    definition: PetraProjectDefinition,
    recordHash: string,
  ): void {
    const expected = request.expected.project_definition_ref;
    if (
      definition.project_definition_id !== expected.project_definition_id ||
      definition.revision !== expected.revision ||
      definition.content_hash !== expected.content_hash ||
      recordHash !== expected.record_hash
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_DEFINITION_STALE",
        "The current ProjectDefinition no longer matches the exact reviewed source role.",
      );
    }
  }

  #assertRole(
    request: PetraProjectSourceReuseRequest,
    definition: PetraProjectDefinition,
  ): void {
    const matches = definition.content.registrations.filter(
      (registration) =>
        registration.registration_kind === "source_role" &&
        registration.semantic_key === request.project_membership.source_role &&
        registration.contract.name === "petra.rights-decision" &&
        registration.contract.version === "1.0.0",
    );
    if (matches.length !== 1) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_ROLE_UNREGISTERED",
        "The exact ProjectDefinition does not register this source role and copy-rights contract once.",
      );
    }
  }

  async #existingSource(
    client: PoolClient,
    request: PetraProjectSourceReuseRequest,
  ): Promise<ExistingSourceRecords> {
    const ref = request.existing_source.origin_project_source_ref;
    const result = await client.query<ExistingSourceRow>(
      `SELECT source_revision.payload AS source_payload,
              source_revision.record_hash AS source_record_hash,
              manifest.payload AS manifest_payload,
              manifest.record_hash AS manifest_record_hash,
              rights.payload AS rights_payload,
              rights.record_hash AS rights_record_hash,
              artifact.payload AS artifact_payload,
              artifact.record_hash AS artifact_record_hash
         FROM petra.project_sources AS source_head
         JOIN petra.project_source_revisions AS source_revision
           ON source_revision.project_source_id = source_head.project_source_id
          AND source_revision.revision = source_head.current_revision
         JOIN petra.artifact_manifests AS manifest
           ON manifest.artifact_manifest_id = source_head.artifact_manifest_id
         JOIN petra.rights_decisions AS rights
           ON rights.rights_decision_id = manifest.rights_decision_id
         JOIN petra.artifacts AS artifact
           ON artifact.artifact_id = manifest.artifact_id
        WHERE source_head.project_id = $1
          AND source_head.project_source_id = $2
        FOR SHARE OF source_head, source_revision, manifest, rights, artifact`,
      [ref.project_id, ref.project_source_id],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_SOURCE_NOT_FOUND",
        "The selected existing source is not retained in the named origin Project.",
      );
    }
    this.#contracts.assertValid("project-source", "1.0.0", row.source_payload);
    this.#contracts.assertValid(
      "artifact-manifest",
      "1.0.0",
      row.manifest_payload,
    );
    this.#contracts.assertValid("rights-decision", "1.0.0", row.rights_payload);
    this.#contracts.assertValid("artifact", "1.0.0", row.artifact_payload);
    const records = {
      source: clone(row.source_payload as PetraProjectSource),
      manifest: clone(row.manifest_payload as PetraArtifactManifest),
      rights: clone(row.rights_payload as PetraRightsDecision),
      artifact: clone(row.artifact_payload as PetraArtifact),
    };
    if (
      canonicalHash(records.source) !== row.source_record_hash ||
      canonicalHash(records.manifest) !== row.manifest_record_hash ||
      canonicalHash(records.rights) !== row.rights_record_hash ||
      canonicalHash(records.artifact) !== row.artifact_record_hash
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_STORED_RECORD_CORRUPT",
        "The retained source identity or copy authority failed exact hash validation.",
      );
    }
    return records;
  }

  #assertExistingSource(
    request: PetraProjectSourceReuseRequest,
    records: ExistingSourceRecords,
    principal: ProjectSourceReusePrincipal,
  ): void {
    const selected = request.existing_source;
    const origin = selected.origin_project_source_ref;
    const source = records.source;
    if (
      source.project_id !== origin.project_id ||
      source.project_source_id !== origin.project_source_id ||
      source.revision !== origin.revision ||
      source.content_hash !== origin.content_hash ||
      canonicalHash(source) !== origin.record_hash ||
      source.content.status !== origin.status
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_SOURCE_STALE",
        "The selected existing ProjectSource is no longer the exact current revision reviewed for reuse.",
      );
    }
    if (
      source.content.work_ref.work_id !== selected.work_ref.work_id ||
      source.content.work_ref.revision !== selected.work_ref.revision ||
      source.content.work_ref.record_hash !== selected.work_ref.record_hash ||
      source.content.work_version_ref.work_version_id !==
        selected.work_version_ref.work_version_id ||
      source.content.work_version_ref.revision !==
        selected.work_version_ref.revision ||
      source.content.work_version_ref.record_hash !==
        selected.work_version_ref.record_hash ||
      source.content.artifact_manifest_ref.artifact_manifest_id !==
        selected.artifact_manifest_ref.artifact_manifest_id ||
      source.content.artifact_manifest_ref.revision !==
        selected.artifact_manifest_ref.revision ||
      source.content.artifact_manifest_ref.record_hash !==
        selected.artifact_manifest_ref.record_hash ||
      records.manifest.artifact_id !== selected.artifact_ref.artifact_id ||
      records.artifact.artifact_id !== selected.artifact_ref.artifact_id ||
      records.artifact.revision !== selected.artifact_ref.revision ||
      records.artifact.content_hash !== selected.artifact_ref.content_hash ||
      canonicalHash(records.artifact) !== selected.artifact_ref.record_hash ||
      records.manifest.rights_decision_id !==
        selected.rights_decision_ref.record_id ||
      records.rights.rights_decision_id !==
        selected.rights_decision_ref.record_id ||
      records.rights.revision !== selected.rights_decision_ref.revision ||
      canonicalHash(records.rights) !==
        selected.rights_decision_ref.record_hash ||
      canonicalHash(records.manifest) !==
        selected.artifact_manifest_ref.record_hash ||
      records.rights.artifact_manifest_id !==
        records.manifest.artifact_manifest_id ||
      records.manifest.storage_ref.content_hash !==
        records.artifact.content_hash ||
      (records.manifest.origin as { readonly work_version_id?: string })
        .work_version_id !== source.content.work_version_ref.work_version_id
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_IDENTITY_CROSSED",
        "The selected Work, WorkVersion, Artifact, manifest, and RightsDecision do not form one exact retained source copy.",
      );
    }
    if (
      !sameActor(source.added_by, principal.actor) ||
      !records.rights.permissions.store_raw_bytes ||
      records.manifest.storage_ref.availability !== "available"
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_COPY_NOT_AUTHORIZED",
        "The authenticated human does not own a currently available, storage-permitted copy for source reuse.",
      );
    }
  }

  async #assertNoMembershipDuplicate(
    client: PoolClient,
    projectId: string,
    existing: ExistingSourceRecords,
  ): Promise<void> {
    const result = await client.query<{ project_source_id: string }>(
      `SELECT project_source_id
         FROM petra.project_sources
        WHERE project_id = $1
          AND artifact_manifest_id = $2
        FOR SHARE`,
      [projectId, existing.manifest.artifact_manifest_id],
    );
    if (result.rows[0] !== undefined) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_MEMBERSHIP_DUPLICATE",
        `This exact source copy is already linked to the Project as ${result.rows[0].project_source_id}.`,
      );
    }
  }

  #projectSource(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
    principal: ProjectSourceReusePrincipal,
    existing: ExistingSourceRecords,
    recordedAt: string,
  ): PetraProjectSource {
    const sourceContent: PetraProjectSource["content"] = {
      binding_kind: "scientific_work_version",
      project_definition_ref: {
        project_definition_id:
          request.expected.project_definition_ref.project_definition_id,
        revision: request.expected.project_definition_ref.revision,
        content_hash: request.expected.project_definition_ref.content_hash,
      },
      source_role: request.project_membership.source_role,
      work_ref: clone(existing.source.content.work_ref),
      work_version_ref: clone(existing.source.content.work_version_ref),
      author_refs: clone(existing.source.content.author_refs),
      artifact_manifest_ref: clone(
        existing.source.content.artifact_manifest_ref,
      ),
      status: "active",
    };
    return {
      schema_name: "petra.project-source",
      schema_version: "1.0.0",
      project_source_id: derivePetraId("project_source", request.command_id),
      revision: 1,
      project_id: projectId,
      content: sourceContent,
      content_hash: canonicalHash(sourceContent),
      added_by: clone(principal.actor),
      added_at: recordedAt,
    };
  }

  #receipt(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
    requestHash: string,
    principal: ProjectSourceReusePrincipal,
    projectSource: PetraProjectSource,
    recordedAt: string,
  ): PetraProjectSourceReuseReceipt {
    const receiptBase = {
      schema_name: "petra.project-source-reuse-receipt" as const,
      schema_version: "1.0.0" as const,
      receipt_id: derivePetraId("source_reuse_receipt", request.command_id),
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      request_hash: requestHash,
      project_id: projectId,
      actor: clone(principal.actor),
      capability_grant_id: principal.capabilityGrantId,
      project_ref: clone(request.expected.project_ref),
      project_definition_ref: clone(request.expected.project_definition_ref),
      existing_source: clone(request.existing_source),
      material_outcome: {
        kind: "existing_permitted_copy_reused" as const,
        canonical_identity_cloned: false as const,
        artifact_cloned: false as const,
        bytes_cloned: false as const,
        storage_unchanged: true as const,
        availability: "available" as const,
      },
      membership: {
        decision: "reused_and_linked" as const,
        source_role: request.project_membership.source_role,
        linked_by: clone(principal.actor),
        linked_at: recordedAt,
      },
      project_source_ref: {
        project_source_id: projectSource.project_source_id,
        revision: 1 as const,
        content_hash: projectSource.content_hash,
        record_hash: canonicalHash(projectSource),
        status: "active" as const,
      },
      effect: {
        kind: "source_reused_and_linked" as const,
        summary:
          "The exact existing source identity and permitted copy are linked to this Project role without cloning identity, Artifact, storage, or bytes.",
        meaning_authority_unchanged: true as const,
      },
      destination: {
        place_role: "sources" as const,
        project_id: projectId,
        project_source_id: projectSource.project_source_id,
      },
      recovery: {
        command_path: `/api/commands/projects/${projectId}/sources/reuse`,
        assessment_path: `/api/queries/projects/${projectId}/source-reuse-recovery`,
        retry_reuses_command_identity: true as const,
        missing_receipt_means_unknown: true as const,
      },
      recorded_at: recordedAt,
    };
    const receipt: PetraProjectSourceReuseReceipt = {
      ...receiptBase,
      record_hash: canonicalHash(receiptBase),
    };
    this.#contracts.assertValid(
      "project-source-reuse-receipt",
      "1.0.0",
      receipt,
    );
    return receipt;
  }

  #replay(
    rows: readonly StoredReceiptRow[],
    projectId: string,
    request: PetraProjectSourceReuseRequest,
    requestHash: string,
    principal: ProjectSourceReusePrincipal,
  ): ProjectSourceReuseResult {
    const row = rows[0];
    if (
      rows.length !== 1 ||
      row === undefined ||
      row.project_id !== projectId ||
      row.command_id !== request.command_id ||
      row.idempotency_key !== request.idempotency_key ||
      row.request_hash !== requestHash ||
      !sameActor(row, principal.actor)
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_COMMAND_CONFLICT",
        "The command or idempotency identity is already bound to a different source reuse request.",
      );
    }
    return { ...this.#storedResult(row), applied: false };
  }

  #storedResult(
    row: StoredReceiptRow,
  ): Omit<ProjectSourceReuseResult, "applied"> {
    this.#contracts.assertValid(
      "project-source-reuse-receipt",
      "1.0.0",
      row.receipt_payload,
    );
    this.#contracts.assertValid("project-source", "1.0.0", row.source_payload);
    const receipt = row.receipt_payload as PetraProjectSourceReuseReceipt;
    const projectSource = row.source_payload as PetraProjectSource;
    const receiptBase = Object.fromEntries(
      Object.entries(receipt).filter(([key]) => key !== "record_hash"),
    );
    if (
      canonicalHash(receiptBase) !== receipt.record_hash ||
      row.receipt_record_hash !== receipt.record_hash ||
      canonicalHash(projectSource) !== row.source_record_hash ||
      receipt.project_source_ref.project_source_id !==
        projectSource.project_source_id ||
      receipt.project_source_ref.revision !== projectSource.revision ||
      receipt.project_source_ref.content_hash !== projectSource.content_hash ||
      receipt.project_source_ref.record_hash !== row.source_record_hash
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_STORED_RECORD_CORRUPT",
        "The retained source reuse receipt or ProjectSource failed exact hash validation.",
      );
    }
    return { receipt: clone(receipt), projectSource: clone(projectSource) };
  }

  async #storedByIdentity(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    commandId: string,
    idempotencyKey: string,
  ): Promise<StoredReceiptRow[]> {
    const result = await queryable.query<StoredReceiptRow>(
      `SELECT receipt.command_id, receipt.idempotency_key,
              receipt.request_hash, receipt.project_id,
              receipt.actor_id, receipt.actor_kind,
              receipt.payload AS receipt_payload,
              receipt.record_hash AS receipt_record_hash,
              source.payload AS source_payload,
              source.record_hash AS source_record_hash
         FROM petra.project_source_reuse_receipts AS receipt
         JOIN petra.project_source_revisions AS source
           ON source.project_id = receipt.project_id
          AND source.project_source_id = receipt.project_source_id
          AND source.revision = receipt.project_source_revision
          AND source.content_hash = receipt.project_source_content_hash
          AND source.record_hash = receipt.project_source_record_hash
        WHERE receipt.command_id = $1 OR receipt.idempotency_key = $2
        ORDER BY receipt.command_id`,
      [commandId, idempotencyKey],
    );
    return result.rows;
  }

  async #currentProject(
    client: PoolClient,
    projectId: string,
  ): Promise<StoredRecordRow> {
    const result = await client.query<StoredRecordRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.projects AS head
         JOIN petra.project_revisions AS revision
           ON revision.project_id = head.project_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
        FOR SHARE OF head, revision`,
      [projectId],
    );
    if (result.rows[0] === undefined) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_PROJECT_NOT_FOUND",
        "The Project is not retained.",
      );
    }
    return result.rows[0];
  }

  async #currentDefinition(
    client: PoolClient,
    projectId: string,
  ): Promise<StoredRecordRow> {
    const result = await client.query<StoredRecordRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.project_definitions AS head
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = head.project_definition_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
        FOR SHARE OF head, revision`,
      [projectId],
    );
    if (result.rows[0] === undefined) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_DEFINITION_STALE",
        "The Project has no retained current ProjectDefinition.",
      );
    }
    return result.rows[0];
  }

  #project(value: unknown): PetraProject {
    this.#contracts.assertValid("project", "1.0.0", value);
    return clone(value as PetraProject);
  }

  #definition(value: unknown): PetraProjectDefinition {
    this.#contracts.assertValid("project-definition", "1.0.0", value);
    return clone(value as PetraProjectDefinition);
  }

  async #insertProjectSource(
    client: PoolClient,
    source: PetraProjectSource,
  ): Promise<void> {
    const content = source.content;
    await client.query(
      `INSERT INTO petra.project_sources (
         project_source_id, project_id, artifact_manifest_id, current_revision
       ) VALUES ($1, $2, $3, $4)`,
      [
        source.project_source_id,
        source.project_id,
        content.artifact_manifest_ref.artifact_manifest_id,
        source.revision,
      ],
    );
    await client.query(
      `INSERT INTO petra.project_source_revisions (
         project_source_id, revision, project_id, binding_kind,
         project_definition_id, project_definition_revision,
         project_definition_content_hash, source_role,
         work_id, work_revision, work_record_hash,
         work_version_id, work_version_revision, work_version_record_hash,
         artifact_manifest_id, artifact_manifest_revision,
         artifact_manifest_record_hash, status, content_hash,
         added_by_actor_id, added_by_actor_kind,
         schema_name, schema_version, record_hash, payload, added_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25::jsonb, $26::timestamptz
       )`,
      [
        source.project_source_id,
        source.revision,
        source.project_id,
        content.binding_kind,
        content.project_definition_ref.project_definition_id,
        content.project_definition_ref.revision,
        content.project_definition_ref.content_hash,
        content.source_role,
        content.work_ref.work_id,
        content.work_ref.revision,
        content.work_ref.record_hash,
        content.work_version_ref.work_version_id,
        content.work_version_ref.revision,
        content.work_version_ref.record_hash,
        content.artifact_manifest_ref.artifact_manifest_id,
        content.artifact_manifest_ref.revision,
        content.artifact_manifest_ref.record_hash,
        content.status,
        source.content_hash,
        source.added_by.actor_id,
        source.added_by.actor_kind,
        source.schema_name,
        source.schema_version,
        canonicalHash(source),
        JSON.stringify(source),
        source.added_at,
      ],
    );
    for (const [index, author] of content.author_refs.entries()) {
      await client.query(
        `INSERT INTO petra.project_source_author_refs (
           project_source_id, project_source_revision, position,
           author_id, author_revision, author_record_hash
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          source.project_source_id,
          source.revision,
          index + 1,
          author.author_id,
          author.revision,
          author.record_hash,
        ],
      );
    }
  }

  async #insertReceipt(
    client: PoolClient,
    receipt: PetraProjectSourceReuseReceipt,
  ): Promise<void> {
    const definition = receipt.project_definition_ref;
    const existing = receipt.existing_source;
    const origin = existing.origin_project_source_ref;
    const source = receipt.project_source_ref;
    await client.query(
      `INSERT INTO petra.project_source_reuse_receipts (
         receipt_id, command_id, idempotency_key, request_hash,
         project_id, actor_id, actor_kind, capability_grant_id,
         project_revision, project_record_hash, project_definition_id,
         project_definition_revision, project_definition_content_hash,
         project_definition_record_hash, source_role, origin_project_id,
         origin_project_source_id, origin_project_source_revision,
         origin_project_source_content_hash, origin_project_source_record_hash,
         artifact_id, artifact_revision, artifact_content_hash,
         artifact_record_hash, artifact_manifest_id,
         artifact_manifest_revision, artifact_manifest_record_hash,
         rights_decision_id, rights_decision_revision,
         rights_decision_record_hash, project_source_id,
         project_source_revision, project_source_content_hash,
         project_source_record_hash, schema_name, schema_version,
         record_hash, payload, recorded_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
         $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35,
         $36, $37, $38::jsonb, $39::timestamptz
       )`,
      [
        receipt.receipt_id,
        receipt.command_id,
        receipt.idempotency_key,
        receipt.request_hash,
        receipt.project_id,
        receipt.actor.actor_id,
        receipt.actor.actor_kind,
        receipt.capability_grant_id,
        receipt.project_ref.revision,
        receipt.project_ref.record_hash,
        definition.project_definition_id,
        definition.revision,
        definition.content_hash,
        definition.record_hash,
        receipt.membership.source_role,
        origin.project_id,
        origin.project_source_id,
        origin.revision,
        origin.content_hash,
        origin.record_hash,
        existing.artifact_ref.artifact_id,
        existing.artifact_ref.revision,
        existing.artifact_ref.content_hash,
        existing.artifact_ref.record_hash,
        existing.artifact_manifest_ref.artifact_manifest_id,
        existing.artifact_manifest_ref.revision,
        existing.artifact_manifest_ref.record_hash,
        existing.rights_decision_ref.record_id,
        existing.rights_decision_ref.revision,
        existing.rights_decision_ref.record_hash,
        source.project_source_id,
        source.revision,
        source.content_hash,
        source.record_hash,
        receipt.schema_name,
        receipt.schema_version,
        receipt.record_hash,
        JSON.stringify(receipt),
        receipt.recorded_at,
      ],
    );
  }

  async #transactionTime(client: PoolClient): Promise<string> {
    const result = await client.query<{ transaction_time: Date }>(
      "SELECT CURRENT_TIMESTAMP AS transaction_time",
    );
    const value = result.rows[0]?.transaction_time;
    if (value === undefined) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_STORED_RECORD_CORRUPT",
        "PostgreSQL did not provide the source reuse transaction time.",
      );
    }
    return value.toISOString();
  }

  async #databaseTime(): Promise<string> {
    const result = await this.#pool.query<{ observed_at: Date }>(
      "SELECT CURRENT_TIMESTAMP AS observed_at",
    );
    const value = result.rows[0]?.observed_at;
    if (value === undefined) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_STORED_RECORD_CORRUPT",
        "PostgreSQL did not provide the source reuse recovery observation cutoff.",
      );
    }
    return value.toISOString();
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...keys].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #transaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    for (let attempt = 0; ; attempt += 1) {
      const client = await this.#pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        const value = await operation(client);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        if (attempt < 2 && isRetryableTransactionError(error)) continue;
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          throw new ProjectSourceReuseError(
            "PROJECT_SOURCE_REUSE_MEMBERSHIP_DUPLICATE",
            "This exact source copy is already linked to the Project.",
          );
        }
        throw error;
      } finally {
        client.release();
      }
    }
  }
}
