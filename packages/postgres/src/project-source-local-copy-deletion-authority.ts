import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSource,
  ProjectSourceLocalCopyDeletionBlocker,
  ProjectSourceLocalCopyDeletionCopyRef,
  PetraProjectSourceLocalCopyDeletionPreview,
  PetraProjectSourceLocalCopyDeletionReceipt,
  PetraProjectSourceLocalCopyDeletionRecoveryView,
  PetraProjectSourceLocalCopyDeletionRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ProjectSourceLocalCopyDeletionError,
  derivePetraId,
  type ArtifactStore,
  type ProjectSourceLocalCopyDeletionAuthority,
  type ProjectSourceLocalCopyDeletionPreviewReader,
  type ProjectSourceLocalCopyDeletionPrincipal,
  type ProjectSourceLocalCopyDeletionResult,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

interface ContextRow {
  project_payload: unknown;
  project_record_hash: string;
  definition_payload: unknown;
  definition_record_hash: string;
  source_payload: unknown;
  source_record_hash: string;
  manifest_payload: unknown;
  manifest_record_hash: string;
  artifact_payload: unknown;
  artifact_record_hash: string;
}

interface IdentityRow {
  record_id: string;
  total_count: string;
}

interface AttemptRow {
  command_id: string;
  idempotency_key: string;
  request_hash: string;
  project_id: string;
  project_source_id: string;
  actor_id: string;
  actor_kind: "human";
  capability_grant_id: string;
  state: "pending_storage" | "completed";
  request_payload: unknown;
  receipt_payload: unknown;
  receipt_record_hash: string | null;
}

interface ExactContext {
  project: PetraProject;
  projectRecordHash: string;
  definition: PetraProjectDefinition;
  definitionRecordHash: string;
  source: PetraProjectSource;
  sourceRecordHash: string;
  manifest: PetraArtifactManifest;
  manifestRecordHash: string;
  artifact: PetraArtifact;
  artifactRecordHash: string;
}

interface PreparedAttempt {
  replay?: PetraProjectSourceLocalCopyDeletionReceipt;
  copyRef: ProjectSourceLocalCopyDeletionCopyRef;
}

const PROJECT_SOURCE_ID = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;
const POLICY_VERSION = "petra-local-copy-retention-v1" as const;
const MAX_REFS = 100;

const clone = <Value>(value: Value): Value => structuredClone(value);
const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const sameActor = (
  left: { readonly actor_id: string; readonly actor_kind: string },
  right: { readonly actor_id: string; readonly actor_kind: string },
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

/**
 * Coordinates PostgreSQL authority with the content-addressed byte store.
 * A durable pending intent is committed before deletion, so a lost response is
 * reconciled by retrying the exact request rather than inventing a new command.
 */
export class PostgresProjectSourceLocalCopyDeletionAuthority
  implements
    ProjectSourceLocalCopyDeletionPreviewReader,
    ProjectSourceLocalCopyDeletionAuthority
{
  readonly #pool: Pool;
  readonly #artifactStore: Pick<
    ArtifactStore,
    "inspectByHash" | "deleteByHash"
  >;
  readonly #authorizer: PostgresCommandAuthorizer;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    artifactStore: Pick<ArtifactStore, "inspectByHash" | "deleteByHash">,
    authorizer: PostgresCommandAuthorizer,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#artifactStore = artifactStore;
    this.#authorizer = authorizer;
    this.#contracts = contracts;
  }

  async getProjectSourceLocalCopyDeletionPreview(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceLocalCopyDeletionPreview | undefined> {
    this.#assertRoute(projectSourceId);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const context = await this.#context(client, projectId, projectSourceId);
      if (context === undefined) {
        await client.query("COMMIT");
        return undefined;
      }
      const expected = this.#expected(context);
      const retained = await this.#copyReceiptByManifest(
        client,
        expected.copy_ref.artifact_manifest_id,
      );
      const blockers =
        retained === undefined
          ? await this.#blockers(client, context)
          : ([] as ProjectSourceLocalCopyDeletionBlocker[]);
      const databaseTime = await this.#databaseTime(client);
      await client.query("COMMIT");

      if (retained === undefined && blockers.length === 0) {
        const available = await this.#artifactStore.inspectByHash(
          expected.copy_ref.content_hash,
          {
            byteSize: expected.copy_ref.byte_size,
            mediaType: expected.copy_ref.media_type,
          },
        );
        if (
          available === undefined ||
          available.storeName !== expected.copy_ref.store_name ||
          available.objectKey !== expected.copy_ref.object_key
        ) {
          blockers.push({
            kind: "copy_unavailable",
            count: 1,
            record_ids: [expected.copy_ref.artifact_manifest_id],
            reason:
              "The exact registered local copy is not available at its content-addressed storage identity.",
          });
        }
      }

      const state =
        retained !== undefined
          ? ("already_deleted" as const)
          : blockers.length === 0
            ? ("eligible" as const)
            : ("blocked" as const);
      const paths = this.#paths(projectId, projectSourceId);
      const hashed = {
        project_id: projectId,
        project_source_id: projectSourceId,
        expected,
        eligibility: {
          state,
          policy_version: POLICY_VERSION,
          blockers:
            blockers as PetraProjectSourceLocalCopyDeletionPreview["eligibility"]["blockers"],
        },
        retention: this.#retention(state),
        consequences: {
          project_link_unchanged: true as const,
          representations_may_stop_resolving: true as const,
          recovery: this.#recovery(context.manifest),
        },
        operation: {
          state:
            state === "eligible"
              ? ("ready" as const)
              : state === "already_deleted"
                ? ("already_completed" as const)
                : ("blocked" as const),
          command_name: "DeleteLocalSourceCopy" as const,
          method: "POST" as const,
          path: paths.command,
          recovery_path: paths.recovery,
        },
        read_at: databaseTime,
      };
      const preview: PetraProjectSourceLocalCopyDeletionPreview = {
        schema_name: "petra.project-source-local-copy-deletion-preview",
        schema_version: "1.0.0",
        ...hashed,
        content_hash: canonicalHash(hashed),
      };
      this.#contracts.assertValid(
        "project-source-local-copy-deletion-preview",
        "1.0.0",
        preview,
      );
      return clone(preview);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async executeProjectSourceLocalCopyDeletion(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
    principal: ProjectSourceLocalCopyDeletionPrincipal,
  ): Promise<ProjectSourceLocalCopyDeletionResult> {
    this.#assertRequest(projectId, projectSourceId, request);
    const prepared = await this.#prepare(
      projectId,
      projectSourceId,
      request,
      principal,
    );
    if (prepared.replay !== undefined) {
      return { receipt: clone(prepared.replay), applied: false };
    }

    let deletion: Awaited<ReturnType<ArtifactStore["deleteByHash"]>>;
    try {
      deletion = await this.#artifactStore.deleteByHash(
        prepared.copyRef.content_hash,
        {
          byteSize: prepared.copyRef.byte_size,
          mediaType: prepared.copyRef.media_type,
        },
      );
      if (
        deletion.artifact !== undefined &&
        (deletion.artifact.storeName !== prepared.copyRef.store_name ||
          deletion.artifact.objectKey !== prepared.copyRef.object_key)
      ) {
        throw new Error(
          "The byte store deleted a different registered local-copy identity.",
        );
      }
    } catch (error) {
      throw new ProjectSourceLocalCopyDeletionError(
        "PROJECT_SOURCE_LOCAL_COPY_DELETION_OUTCOME_UNKNOWN",
        `The durable deletion intent is retained, but storage delivery is unconfirmed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.#finalize(
      request,
      principal,
      deletion.state === "deleted"
        ? "deleted_now"
        : "already_absent_after_durable_intent",
    );
  }

  async assessProjectSourceLocalCopyDeletionRecovery(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
    principal: ProjectSourceLocalCopyDeletionPrincipal,
  ): Promise<PetraProjectSourceLocalCopyDeletionRecoveryView> {
    this.#assertRequest(projectId, projectSourceId, request);
    const requestHash = canonicalHash(request);
    const rows = await this.#attemptRows(
      this.#pool,
      request.command_id,
      request.idempotency_key,
    );
    const exact = this.#exactAttempt(
      rows,
      projectId,
      projectSourceId,
      request,
      requestHash,
    );
    const owned =
      exact !== undefined && sameActor(exact, principal.actor)
        ? exact
        : undefined;
    const receipt =
      owned?.receipt_payload === null || owned === undefined
        ? undefined
        : this.#storedReceipt(owned);
    const paths = this.#paths(projectId, projectSourceId);
    const effect: PetraProjectSourceLocalCopyDeletionRecoveryView["effect"] =
      receipt !== undefined
        ? { state: "effect_confirmed", receipt }
        : rows.length === 0 || owned?.state === "pending_storage"
          ? {
              state: "outcome_unknown",
              reason:
                owned?.state === "pending_storage"
                  ? "storage_delivery_unconfirmed"
                  : "receipt_not_observed_at_cutoff",
              durable_intent: owned?.state === "pending_storage",
              retry: {
                method: "POST",
                path: paths.command,
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
    const returnValue: PetraProjectSourceLocalCopyDeletionRecoveryView["return"] =
      receipt === undefined
        ? {
            state: "safe_fallback",
            destination: { place_role: "sources", project_id: projectId },
            reason:
              "No exact owned receipt is available, so Petra returns to Sources and reconciles the retained attempt before another command.",
          }
        : { state: "exact", destination: clone(receipt.destination) };
    const observedAt = await this.#databaseTime(this.#pool);
    const hashed = {
      project_id: projectId,
      project_source_id: projectSourceId,
      subject: {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: requestHash,
      },
      effect,
      return: returnValue,
      observed_at: observedAt,
    };
    const view: PetraProjectSourceLocalCopyDeletionRecoveryView = {
      schema_name: "petra.project-source-local-copy-deletion-recovery-view",
      schema_version: "1.0.0",
      assessment_id: derivePetraId(
        "source_copy_deletion_recovery",
        canonicalHash(hashed),
      ),
      ...hashed,
      content_hash: canonicalHash(hashed),
    };
    this.#contracts.assertValid(
      "project-source-local-copy-deletion-recovery-view",
      "1.0.0",
      view,
    );
    return clone(view);
  }

  async #prepare(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
    principal: ProjectSourceLocalCopyDeletionPrincipal,
  ): Promise<PreparedAttempt> {
    const requestHash = canonicalHash(request);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await this.#lock(client, request, projectId);
      if (
        !(await this.#authorizer.authorize(
          {
            actor: principal.actor,
            capabilityGrantId: principal.capabilityGrantId,
            commandName: "DeleteLocalSourceCopy",
            projectId,
          },
          client,
        ))
      ) {
        throw new ProjectSourceLocalCopyDeletionError(
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_AUTHORIZED",
          "The authenticated Actor and capability grant do not authorize DeleteLocalSourceCopy.",
        );
      }
      const rows = await this.#attemptRows(
        client,
        request.command_id,
        request.idempotency_key,
        true,
      );
      if (rows.length > 0) {
        const exact = this.#exactAttempt(
          rows,
          projectId,
          projectSourceId,
          request,
          requestHash,
        );
        if (
          exact === undefined ||
          !sameActor(exact, principal.actor) ||
          exact.capability_grant_id !== principal.capabilityGrantId
        ) {
          throw new ProjectSourceLocalCopyDeletionError(
            "PROJECT_SOURCE_LOCAL_COPY_DELETION_COMMAND_CONFLICT",
            "The command or idempotency identity belongs to a different local-copy deletion request.",
          );
        }
        if (exact.receipt_payload !== null) {
          const replay = this.#storedReceipt(exact);
          await client.query("COMMIT");
          return { replay, copyRef: clone(replay.copy_ref) };
        }
        await client.query("COMMIT");
        return { copyRef: clone(request.expected.copy_ref) };
      }

      const context = await this.#context(
        client,
        projectId,
        projectSourceId,
        true,
      );
      if (context === undefined) {
        throw new ProjectSourceLocalCopyDeletionError(
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_SOURCE_NOT_FOUND",
          "The requested ProjectSource is not retained in this Project.",
        );
      }
      this.#assertExpected(context, request.expected);
      const copyAttempt = await client.query(
        `SELECT 1
           FROM petra.project_source_local_copy_deletion_attempts
          WHERE artifact_manifest_id = $1
          LIMIT 1`,
        [context.manifest.artifact_manifest_id],
      );
      const blockers = await this.#blockers(client, context);
      if (copyAttempt.rows[0] !== undefined || blockers.length > 0) {
        throw new ProjectSourceLocalCopyDeletionError(
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_ELIGIBLE",
          "The exact local copy has a retained deletion attempt or protected shared/dependent use.",
        );
      }
      const copyRef = request.expected.copy_ref;
      const available = await this.#artifactStore.inspectByHash(
        copyRef.content_hash,
        { byteSize: copyRef.byte_size, mediaType: copyRef.media_type },
      );
      if (
        available === undefined ||
        available.storeName !== copyRef.store_name ||
        available.objectKey !== copyRef.object_key
      ) {
        throw new ProjectSourceLocalCopyDeletionError(
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_COPY_STALE",
          "The exact reviewed local copy is no longer available at its registered storage identity.",
        );
      }
      const createdAt = await this.#databaseTime(client);
      await client.query(
        `INSERT INTO petra.project_source_local_copy_deletion_attempts (
           command_id, idempotency_key, request_hash, project_id,
           project_source_id, actor_id, actor_kind, capability_grant_id,
           artifact_manifest_id, artifact_id, store_name, object_key,
           storage_content_hash, state, request_payload, created_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           'pending_storage', $14::jsonb, $15::timestamptz
         )`,
        [
          request.command_id,
          request.idempotency_key,
          requestHash,
          projectId,
          projectSourceId,
          principal.actor.actor_id,
          principal.actor.actor_kind,
          principal.capabilityGrantId,
          copyRef.artifact_manifest_id,
          copyRef.artifact_id,
          copyRef.store_name,
          copyRef.object_key,
          copyRef.content_hash,
          JSON.stringify(request),
          createdAt,
        ],
      );
      await client.query("COMMIT");
      return { copyRef: clone(copyRef) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #finalize(
    request: PetraProjectSourceLocalCopyDeletionRequest,
    principal: ProjectSourceLocalCopyDeletionPrincipal,
    observation: "deleted_now" | "already_absent_after_durable_intent",
  ): Promise<ProjectSourceLocalCopyDeletionResult> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await this.#lock(
        client,
        request,
        request.expected.project_ref.project_id,
      );
      const rows = await this.#attemptRows(
        client,
        request.command_id,
        request.idempotency_key,
        true,
      );
      const exact = this.#exactAttempt(
        rows,
        request.expected.project_ref.project_id,
        request.expected.current_source_ref.project_source_id,
        request,
        canonicalHash(request),
      );
      if (
        exact === undefined ||
        !sameActor(exact, principal.actor) ||
        exact.capability_grant_id !== principal.capabilityGrantId
      ) {
        throw new ProjectSourceLocalCopyDeletionError(
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_STORED_RECORD_CORRUPT",
          "The durable deletion intent no longer matches its exact command binding.",
        );
      }
      if (exact.receipt_payload !== null) {
        const receipt = this.#storedReceipt(exact);
        await client.query("COMMIT");
        return { receipt, applied: false };
      }
      const recordedAt = await this.#databaseTime(client);
      const paths = this.#paths(exact.project_id, exact.project_source_id);
      const receiptBase = {
        schema_name:
          "petra.project-source-local-copy-deletion-receipt" as const,
        schema_version: "1.0.0" as const,
        receipt_id: derivePetraId(
          "source_copy_deletion_receipt",
          request.command_id,
        ),
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: canonicalHash(request),
        project_id: exact.project_id,
        actor: clone(principal.actor),
        capability_grant_id: exact.capability_grant_id,
        project_ref: clone(request.expected.project_ref),
        project_definition_ref: clone(request.expected.project_definition_ref),
        source_ref: clone(request.expected.current_source_ref),
        copy_ref: clone(request.expected.copy_ref),
        effect: {
          kind: "local_source_copy_deleted" as const,
          local_copy_state: "absent" as const,
          observation,
          summary:
            "The exact content-addressed local bytes are absent; the Project link, manifest tombstone, rights, selectors, provenance, and history remain retained.",
        },
        preservation: {
          project_link: "retained" as const,
          canonical_identity: "retained" as const,
          artifact_manifest: "retained_as_tombstoned_copy_identity" as const,
          rights_history: "retained" as const,
          selectors: "retained" as const,
          provenance: "retained" as const,
          history: "retained" as const,
        },
        destination: {
          place_role: "source_details" as const,
          project_id: exact.project_id,
          project_source_id: exact.project_source_id,
        },
        recovery: {
          command_path: paths.command,
          assessment_path: paths.recovery,
          retry_reuses_command_identity: true as const,
          missing_receipt_means_unknown: true as const,
        },
        recorded_at: recordedAt,
      };
      const receipt: PetraProjectSourceLocalCopyDeletionReceipt = {
        ...receiptBase,
        record_hash: canonicalHash(receiptBase),
      };
      this.#contracts.assertValid(
        "project-source-local-copy-deletion-receipt",
        "1.0.0",
        receipt,
      );
      const copy = receipt.copy_ref;
      await client.query(
        `INSERT INTO petra.project_source_local_copy_deletion_receipts (
           receipt_id, command_id, idempotency_key, request_hash, project_id,
           project_source_id, actor_id, actor_kind, capability_grant_id,
           artifact_manifest_id, artifact_id, store_name, object_key,
           storage_content_hash, observation, schema_name, schema_version,
           record_hash, payload, recorded_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, $19::jsonb, $20::timestamptz
         )`,
        [
          receipt.receipt_id,
          receipt.command_id,
          receipt.idempotency_key,
          receipt.request_hash,
          receipt.project_id,
          receipt.source_ref.project_source_id,
          receipt.actor.actor_id,
          receipt.actor.actor_kind,
          receipt.capability_grant_id,
          copy.artifact_manifest_id,
          copy.artifact_id,
          copy.store_name,
          copy.object_key,
          copy.content_hash,
          receipt.effect.observation,
          receipt.schema_name,
          receipt.schema_version,
          receipt.record_hash,
          JSON.stringify(receipt),
          receipt.recorded_at,
        ],
      );
      await client.query(
        `UPDATE petra.project_source_local_copy_deletion_attempts
            SET state = 'completed', completed_at = $2::timestamptz
          WHERE command_id = $1 AND state = 'pending_storage'`,
        [receipt.command_id, recordedAt],
      );
      await client.query("COMMIT");
      return { receipt: clone(receipt), applied: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #context(
    client: PoolClient,
    projectId: string,
    projectSourceId: string,
    lock = false,
  ): Promise<ExactContext | undefined> {
    const result = await client.query<ContextRow>(
      `SELECT project_revision.payload AS project_payload,
              project_revision.record_hash AS project_record_hash,
              definition_revision.payload AS definition_payload,
              definition_revision.record_hash AS definition_record_hash,
              source_revision.payload AS source_payload,
              source_revision.record_hash AS source_record_hash,
              manifest.payload AS manifest_payload,
              manifest.record_hash AS manifest_record_hash,
              artifact.payload AS artifact_payload,
              artifact.record_hash AS artifact_record_hash
         FROM petra.projects AS project
         JOIN petra.project_revisions AS project_revision
           ON project_revision.project_id = project.project_id
          AND project_revision.revision = project.current_revision
         JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         JOIN petra.project_definition_revisions AS definition_revision
           ON definition_revision.project_definition_id = definition.project_definition_id
          AND definition_revision.revision = definition.current_revision
         JOIN petra.project_sources AS source
           ON source.project_id = project.project_id
          AND source.project_source_id = $2
         JOIN petra.project_source_revisions AS source_revision
           ON source_revision.project_source_id = source.project_source_id
          AND source_revision.revision = source.current_revision
         JOIN petra.artifact_manifests AS manifest
           ON manifest.artifact_manifest_id = source.artifact_manifest_id
         JOIN petra.artifacts AS artifact
           ON artifact.artifact_id = manifest.artifact_id
        WHERE project.project_id = $1
        ${lock ? "FOR SHARE OF project, project_revision, definition, definition_revision, source, source_revision, manifest, artifact" : ""}`,
      [projectId, projectSourceId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const project = this.#record<PetraProject>(
      "project",
      row.project_payload,
      row.project_record_hash,
    );
    const definition = this.#record<PetraProjectDefinition>(
      "project-definition",
      row.definition_payload,
      row.definition_record_hash,
    );
    const source = this.#record<PetraProjectSource>(
      "project-source",
      row.source_payload,
      row.source_record_hash,
    );
    const manifest = this.#record<PetraArtifactManifest>(
      "artifact-manifest",
      row.manifest_payload,
      row.manifest_record_hash,
    );
    const artifact = this.#record<PetraArtifact>(
      "artifact",
      row.artifact_payload,
      row.artifact_record_hash,
    );
    if (
      project.project_id !== projectId ||
      project.status !== "active" ||
      definition.project_id !== projectId ||
      source.project_id !== projectId ||
      source.project_source_id !== projectSourceId ||
      source.content_hash !== canonicalHash(source.content) ||
      source.content.artifact_manifest_ref.artifact_manifest_id !==
        manifest.artifact_manifest_id ||
      source.content.artifact_manifest_ref.revision !== manifest.revision ||
      source.content.artifact_manifest_ref.record_hash !==
        row.manifest_record_hash ||
      manifest.artifact_id !== artifact.artifact_id ||
      manifest.storage_ref.content_hash !== artifact.content_hash
    ) {
      throw this.#corrupt(
        "The retained Project, definition, source, manifest, and Artifact do not form one exact local-copy context.",
      );
    }
    return {
      project,
      projectRecordHash: row.project_record_hash,
      definition,
      definitionRecordHash: row.definition_record_hash,
      source,
      sourceRecordHash: row.source_record_hash,
      manifest,
      manifestRecordHash: row.manifest_record_hash,
      artifact,
      artifactRecordHash: row.artifact_record_hash,
    };
  }

  #expected(
    context: ExactContext,
  ): PetraProjectSourceLocalCopyDeletionRequest["expected"] {
    return {
      project_ref: {
        project_id: context.project.project_id,
        revision: context.project.revision,
        record_hash: context.projectRecordHash,
      },
      project_definition_ref: {
        project_definition_id: context.definition.project_definition_id,
        revision: context.definition.revision,
        content_hash: context.definition.content_hash,
        record_hash: context.definitionRecordHash,
      },
      current_source_ref: {
        project_source_id: context.source.project_source_id,
        revision: context.source.revision,
        content_hash: context.source.content_hash,
        record_hash: context.sourceRecordHash,
        status: context.source.content.status,
      },
      copy_ref: {
        artifact_manifest_id: context.manifest.artifact_manifest_id,
        manifest_revision: 1,
        manifest_record_hash: context.manifestRecordHash,
        artifact_id: context.artifact.artifact_id,
        store_name: context.manifest.storage_ref.store_name,
        object_key: context.manifest.storage_ref.object_key,
        content_hash: context.manifest.storage_ref.content_hash,
        byte_size: context.artifact.byte_size,
        media_type: context.artifact.media_type,
      },
    };
  }

  #assertExpected(
    context: ExactContext,
    expected: PetraProjectSourceLocalCopyDeletionRequest["expected"],
  ): void {
    const current = this.#expected(context);
    if (
      canonicalize(current.project_ref) !== canonicalize(expected.project_ref)
    ) {
      throw new ProjectSourceLocalCopyDeletionError(
        "PROJECT_SOURCE_LOCAL_COPY_DELETION_PROJECT_STALE",
        "The current active Project no longer matches the reviewed deletion preview.",
      );
    }
    if (
      canonicalize(current.project_definition_ref) !==
      canonicalize(expected.project_definition_ref)
    ) {
      throw new ProjectSourceLocalCopyDeletionError(
        "PROJECT_SOURCE_LOCAL_COPY_DELETION_DEFINITION_STALE",
        "The current ProjectDefinition no longer matches the reviewed deletion preview.",
      );
    }
    if (
      canonicalize(current.current_source_ref) !==
      canonicalize(expected.current_source_ref)
    ) {
      throw new ProjectSourceLocalCopyDeletionError(
        "PROJECT_SOURCE_LOCAL_COPY_DELETION_SOURCE_STALE",
        "The current ProjectSource no longer matches the reviewed deletion preview.",
      );
    }
    if (canonicalize(current.copy_ref) !== canonicalize(expected.copy_ref)) {
      throw new ProjectSourceLocalCopyDeletionError(
        "PROJECT_SOURCE_LOCAL_COPY_DELETION_COPY_STALE",
        "The exact ArtifactManifest, Artifact, or storage identity no longer matches the reviewed deletion preview.",
      );
    }
  }

  async #blockers(
    client: PoolClient,
    context: ExactContext,
  ): Promise<ProjectSourceLocalCopyDeletionBlocker[]> {
    const copy = this.#expected(context).copy_ref;
    const queries: Array<{
      kind: ProjectSourceLocalCopyDeletionBlocker["kind"];
      reason: string;
      sql: string;
      values: unknown[];
    }> = [
      {
        kind: "shared_storage_copy",
        reason:
          "Another ArtifactManifest resolves to the same content-addressed bytes.",
        sql: `SELECT artifact_manifest_id AS record_id,
                     count(*) OVER ()::text AS total_count
                FROM petra.artifact_manifests
               WHERE store_name = $1 AND object_key = $2
                 AND storage_content_hash = $3 AND artifact_manifest_id <> $4
               ORDER BY artifact_manifest_id LIMIT ${MAX_REFS}`,
        values: [
          copy.store_name,
          copy.object_key,
          copy.content_hash,
          copy.artifact_manifest_id,
        ],
      },
      {
        kind: "shared_project_use",
        reason:
          "Another ProjectSource retains the same ArtifactManifest as a usable source copy.",
        sql: `SELECT project_source_id AS record_id,
                     count(*) OVER ()::text AS total_count
                FROM petra.project_sources
               WHERE artifact_manifest_id = $1 AND project_source_id <> $2
               ORDER BY project_source_id LIMIT ${MAX_REFS}`,
        values: [copy.artifact_manifest_id, context.source.project_source_id],
      },
      {
        kind: "artifact_derivation",
        reason:
          "A registered derived ArtifactManifest names this Artifact as an exact input.",
        sql: `SELECT artifact_manifest_id AS record_id,
                     count(*) OVER ()::text AS total_count
                FROM petra.artifact_manifest_inputs
               WHERE input_artifact_id = $1
               ORDER BY artifact_manifest_id LIMIT ${MAX_REFS}`,
        values: [copy.artifact_id],
      },
      {
        kind: "deletion_pending",
        reason:
          "A durable deletion intent already owns this exact local copy and must be reconciled with its original command identity.",
        sql: `SELECT command_id AS record_id,
                     count(*) OVER ()::text AS total_count
                FROM petra.project_source_local_copy_deletion_attempts
               WHERE artifact_manifest_id = $1 AND state = 'pending_storage'
               ORDER BY command_id LIMIT ${MAX_REFS}`,
        values: [copy.artifact_manifest_id],
      },
      {
        kind: "active_work",
        reason:
          "Active Work has an exact input binding to this Artifact and must finish or stop first.",
        sql: `SELECT DISTINCT revision.work_unit_id AS record_id,
                     count(*) OVER ()::text AS total_count
                FROM petra.worker_input_bindings AS binding
                JOIN petra.worker_input_manifests AS input
                  ON input.worker_input_manifest_id = binding.worker_input_manifest_id
                JOIN petra.work_units AS head ON head.work_unit_id = input.work_unit_id
                JOIN petra.work_unit_revisions AS revision
                  ON revision.work_unit_id = head.work_unit_id
                 AND revision.revision = head.current_revision
               WHERE binding.binding_kind = 'artifact'
                 AND binding.artifact_id = $1
                 AND revision.state IN ('requested', 'queued', 'running')
               ORDER BY record_id LIMIT ${MAX_REFS}`,
        values: [copy.artifact_id],
      },
      {
        kind: "open_review",
        reason:
          "An open Review contains a candidate grounded in this exact source copy.",
        sql: `WITH source_evidence AS (
                SELECT binding.claim_id AS evidence_id,
                       binding.claim_revision AS evidence_revision
                  FROM petra.claim_source_spans AS binding
                  JOIN petra.source_spans AS span
                    ON span.source_span_id = binding.source_span_id
                  JOIN petra.parsed_documents AS document
                    ON document.parsed_document_id = span.parsed_document_id
                 WHERE document.source_artifact_manifest_id = $1
                UNION
                SELECT binding.assertion_id, binding.assertion_revision
                  FROM petra.assertion_provenance AS binding
                  JOIN petra.source_spans AS span
                    ON span.source_span_id = binding.source_span_id
                  JOIN petra.parsed_documents AS document
                    ON document.parsed_document_id = span.parsed_document_id
                 WHERE document.source_artifact_manifest_id = $1
                   AND binding.provenance_kind = 'source_span'
              ), matched AS (
                SELECT DISTINCT revision.review_session_id AS record_id
                  FROM petra.review_sessions AS head
                  JOIN petra.review_session_revisions AS revision
                    ON revision.review_session_id = head.review_session_id
                   AND revision.revision = head.current_revision
                  JOIN petra.review_session_candidate_bindings AS binding
                    ON binding.review_session_id = revision.review_session_id
                   AND binding.review_session_revision = revision.revision
                  JOIN source_evidence AS evidence
                    ON evidence.evidence_id = binding.evidence_id
                   AND evidence.evidence_revision = binding.evidence_revision
                 WHERE revision.lifecycle = 'open'
              )
              SELECT record_id, count(*) OVER ()::text AS total_count
                FROM matched ORDER BY record_id LIMIT ${MAX_REFS}`,
        values: [copy.artifact_manifest_id],
      },
    ];
    const blockers: ProjectSourceLocalCopyDeletionBlocker[] = [];
    for (const query of queries) {
      const result = await client.query<IdentityRow>(query.sql, query.values);
      if (result.rows[0] === undefined) continue;
      blockers.push({
        kind: query.kind,
        count: this.#safeCount(result.rows[0].total_count),
        record_ids: result.rows.map((row) => row.record_id),
        reason: query.reason,
      });
    }
    return blockers;
  }

  #retention(
    state: "eligible" | "blocked" | "already_deleted",
  ): PetraProjectSourceLocalCopyDeletionPreview["retention"] {
    const localState =
      state === "already_deleted"
        ? ("already_deleted" as const)
        : ("deleted_if_confirmed" as const);
    return [
      {
        area: "project_link",
        state: "retained",
        reason: "The ProjectSource membership and status do not change.",
      },
      {
        area: "canonical_identity",
        state: "retained",
        reason: "Work and WorkVersion identity remain addressable.",
      },
      {
        area: "artifact_manifest",
        state: "retained",
        reason: "The immutable manifest remains as the exact copy tombstone.",
      },
      {
        area: "rights_history",
        state: "retained",
        reason: "The copy-specific rights decision remains immutable.",
      },
      {
        area: "selectors",
        state: "retained",
        reason:
          "Parsed selectors remain recorded even when bytes cannot resolve.",
      },
      {
        area: "provenance",
        state: "retained",
        reason: "Downstream provenance and decisions remain inspectable.",
      },
      {
        area: "local_bytes",
        state: localState,
        reason:
          state === "blocked"
            ? "Bytes remain because a protected dependency blocks deletion."
            : "Only the exact content-addressed local bytes are affected.",
      },
    ];
  }

  #recovery(
    manifest: PetraArtifactManifest,
  ): PetraProjectSourceLocalCopyDeletionPreview["consequences"]["recovery"] {
    return manifest.origin.origin_kind === "acquired"
      ? "reacquire_from_registered_origin"
      : manifest.origin.origin_kind === "user_supplied"
        ? "resupply_required"
        : "regenerate_required";
  }

  async #attemptRows(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    commandId: string,
    idempotencyKey: string,
    lock = false,
  ): Promise<AttemptRow[]> {
    const result = await queryable.query<AttemptRow>(
      `SELECT attempt.command_id, attempt.idempotency_key,
              attempt.request_hash, attempt.project_id,
              attempt.project_source_id, attempt.actor_id,
              attempt.actor_kind, attempt.capability_grant_id, attempt.state,
              attempt.request_payload,
              receipt.payload AS receipt_payload,
              receipt.record_hash AS receipt_record_hash
         FROM petra.project_source_local_copy_deletion_attempts AS attempt
         LEFT JOIN petra.project_source_local_copy_deletion_receipts AS receipt
           ON receipt.command_id = attempt.command_id
        WHERE attempt.command_id = $1 OR attempt.idempotency_key = $2
        ORDER BY attempt.command_id
        ${lock ? "FOR UPDATE OF attempt" : ""}`,
      [commandId, idempotencyKey],
    );
    return result.rows;
  }

  #exactAttempt(
    rows: readonly AttemptRow[],
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
    requestHash: string,
  ): AttemptRow | undefined {
    const row = rows[0];
    return rows.length === 1 &&
      row !== undefined &&
      row.command_id === request.command_id &&
      row.idempotency_key === request.idempotency_key &&
      row.request_hash === requestHash &&
      row.project_id === projectId &&
      row.project_source_id === projectSourceId &&
      canonicalize(row.request_payload) === canonicalize(request)
      ? row
      : undefined;
  }

  #storedReceipt(row: AttemptRow): PetraProjectSourceLocalCopyDeletionReceipt {
    this.#contracts.assertValid(
      "project-source-local-copy-deletion-receipt",
      "1.0.0",
      row.receipt_payload,
    );
    const receipt =
      row.receipt_payload as PetraProjectSourceLocalCopyDeletionReceipt;
    const base = Object.fromEntries(
      Object.entries(receipt).filter(([key]) => key !== "record_hash"),
    );
    if (
      row.receipt_record_hash !== receipt.record_hash ||
      canonicalHash(base) !== receipt.record_hash ||
      receipt.command_id !== row.command_id ||
      receipt.idempotency_key !== row.idempotency_key ||
      receipt.request_hash !== row.request_hash ||
      receipt.project_id !== row.project_id ||
      receipt.source_ref.project_source_id !== row.project_source_id ||
      receipt.effect.local_copy_state !== "absent"
    ) {
      throw this.#corrupt(
        "The retained local-copy deletion receipt failed exact identity or hash validation.",
      );
    }
    return clone(receipt);
  }

  async #copyReceiptByManifest(
    client: PoolClient,
    artifactManifestId: string,
  ): Promise<PetraProjectSourceLocalCopyDeletionReceipt | undefined> {
    const result = await client.query<{
      payload: unknown;
      record_hash: string;
    }>(
      `SELECT payload, record_hash
         FROM petra.project_source_local_copy_deletion_receipts
        WHERE artifact_manifest_id = $1`,
      [artifactManifestId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    this.#contracts.assertValid(
      "project-source-local-copy-deletion-receipt",
      "1.0.0",
      row.payload,
    );
    const receipt = row.payload as PetraProjectSourceLocalCopyDeletionReceipt;
    const base = Object.fromEntries(
      Object.entries(receipt).filter(([key]) => key !== "record_hash"),
    );
    if (
      row.record_hash !== receipt.record_hash ||
      canonicalHash(base) !== receipt.record_hash
    ) {
      throw this.#corrupt(
        "The retained local-copy tombstone failed hash validation.",
      );
    }
    return clone(receipt);
  }

  #record<Value>(
    contract: string,
    payload: unknown,
    recordHash: string,
  ): Value {
    this.#contracts.assertValid(contract, "1.0.0", payload);
    if (canonicalHash(payload) !== recordHash) {
      throw this.#corrupt(`The retained ${contract} record hash is invalid.`);
    }
    return clone(payload as Value);
  }

  #assertRoute(projectSourceId: string): void {
    if (!PROJECT_SOURCE_ID.test(projectSourceId)) {
      throw new TypeError(
        "Local-copy deletion requires a canonical ProjectSource identity.",
      );
    }
  }

  #assertRequest(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
  ): void {
    this.#assertRoute(projectSourceId);
    this.#contracts.assertValid(
      "project-source-local-copy-deletion-request",
      "1.0.0",
      request,
    );
    if (
      request.expected.project_ref.project_id !== projectId ||
      request.expected.current_source_ref.project_source_id !== projectSourceId
    ) {
      throw new ProjectSourceLocalCopyDeletionError(
        "PROJECT_SOURCE_LOCAL_COPY_DELETION_PROJECT_STALE",
        "The route must match the exact reviewed Project and ProjectSource.",
      );
    }
  }

  async #lock(
    client: PoolClient,
    request: PetraProjectSourceLocalCopyDeletionRequest,
    projectId: string,
  ): Promise<void> {
    const copy = request.expected.copy_ref;
    const keys = [
      `command:${request.command_id}`,
      `idempotency:${request.idempotency_key}`,
      `project:${projectId}`,
      `project-source:${request.expected.current_source_ref.project_source_id}`,
      `local-copy:${copy.store_name}:${copy.object_key}:${copy.content_hash}`,
    ].sort();
    for (const key of keys) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  #paths(
    projectId: string,
    projectSourceId: string,
  ): {
    command: string;
    recovery: string;
  } {
    const prefix = `/api`;
    return {
      command: `${prefix}/commands/projects/${projectId}/sources/${projectSourceId}/local-copy-deletion`,
      recovery: `${prefix}/queries/projects/${projectId}/sources/${projectSourceId}/local-copy-deletion-recovery`,
    };
  }

  async #databaseTime(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
  ): Promise<string> {
    const result = await queryable.query<{ observed_at: Date }>(
      "SELECT CURRENT_TIMESTAMP AS observed_at",
    );
    const value = result.rows[0]?.observed_at;
    if (value === undefined)
      throw this.#corrupt("PostgreSQL did not provide authority time.");
    return value.toISOString();
  }

  #safeCount(value: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 1_000_000) {
      throw this.#corrupt(
        "A local-copy dependency count is outside its contract bounds.",
      );
    }
    return parsed;
  }

  #corrupt(message: string): ProjectSourceLocalCopyDeletionError {
    return new ProjectSourceLocalCopyDeletionError(
      "PROJECT_SOURCE_LOCAL_COPY_DELETION_STORED_RECORD_CORRUPT",
      message,
    );
  }
}
