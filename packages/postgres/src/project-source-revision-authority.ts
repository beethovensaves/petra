import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraProjectSourceRevisionReceipt,
  PetraProjectSourceRevisionRecoveryView,
  PetraProjectSourceRevisionRequest,
  PetraRightsDecision,
  PetraWorkVersion,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  derivePetraId,
  ProjectSourceRevisionError,
  type ArtifactStore,
  type ProjectSourceRevisionAuthority,
  type ProjectSourceRevisionPrincipal,
  type ProjectSourceRevisionResult,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

interface StoredRecordRow {
  readonly payload: unknown;
  readonly record_hash: string;
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

interface RevisionRecords {
  readonly workVersion: PetraWorkVersion;
  readonly artifact: PetraArtifact;
  readonly manifest: PetraArtifactManifest;
  readonly rights: PetraRightsDecision;
  readonly projectSource: PetraProjectSource;
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

const base64Bytes = (encoded: string): Uint8Array => {
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.byteLength === 0 || bytes.toString("base64") !== encoded) {
    throw new ProjectSourceRevisionError(
      "PROJECT_SOURCE_REVISION_MATERIAL_INVALID",
      "Source revision material must be one non-empty canonical base64 byte sequence.",
    );
  }
  return bytes;
};

/**
 * Transactional intake for one immutable successor WorkVersion and
 * ProjectSource. The predecessor is deliberately unchanged: its exclusion and
 * the supersession relation remain owned by their existing governed commands.
 */
export class PostgresProjectSourceRevisionAuthority implements ProjectSourceRevisionAuthority {
  readonly #pool: Pool;
  readonly #artifactStore: ArtifactStore;
  readonly #authorizer: PostgresCommandAuthorizer;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    artifactStore: ArtifactStore,
    authorizer: PostgresCommandAuthorizer,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#artifactStore = artifactStore;
    this.#authorizer = authorizer;
    this.#contracts = contracts;
  }

  async executeProjectSourceRevision(
    projectId: string,
    request: PetraProjectSourceRevisionRequest,
    principal: ProjectSourceRevisionPrincipal,
  ): Promise<ProjectSourceRevisionResult> {
    this.#contracts.assertValid(
      "project-source-revision-request",
      "1.0.0",
      request,
    );
    this.#assertRouteProject(projectId, request);
    this.#assertRights(request);
    const bytes = base64Bytes(request.material.content_base64);
    const contentHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    if (contentHash !== request.material.expected_content_hash) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_MATERIAL_INVALID",
        "The submitted revision bytes do not match the reviewed content hash.",
      );
    }
    const requestHash = canonicalHash(request);

    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `source-revision-command:${request.command_id}`,
        `source-revision-content:${contentHash}`,
        `source-revision-idempotency:${request.idempotency_key}`,
        `project-source:${request.expected.current_source_ref.project_source_id}`,
      ]);
      if (
        !(await this.#authorizer.authorize(
          {
            actor: principal.actor,
            capabilityGrantId: principal.capabilityGrantId,
            commandName: "AddProjectSourceRevision",
            projectId,
          },
          client,
        ))
      ) {
        throw new ProjectSourceRevisionError(
          "PROJECT_SOURCE_REVISION_NOT_AUTHORIZED",
          "The authenticated human and capability grant do not authorize source-version intake in this Project.",
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
      const predecessorRow = await this.#currentSource(
        client,
        projectId,
        request.expected.current_source_ref.project_source_id,
      );
      const project = this.#project(projectRow.payload);
      const definition = this.#definition(definitionRow.payload);
      const predecessor = this.#source(predecessorRow.payload);
      this.#assertExpectedProject(request, project, projectRow.record_hash);
      this.#assertExpectedDefinition(
        request,
        definition,
        definitionRow.record_hash,
      );
      this.#assertExpectedSource(
        request,
        predecessor,
        predecessorRow.record_hash,
      );
      this.#assertRole(predecessor, definition);
      await this.#assertSourceEligible(client, projectId, predecessor);
      await this.#assertNewContentIdentity(client, contentHash);
      await this.#assertExactWork(client, predecessor);

      const recordedAt = await this.#transactionTime(client);
      for (const reviewedAt of [
        request.version.metadata_retrieved_at,
        request.rights.observed_at,
        request.replacement.reviewed_at,
      ]) {
        if (Date.parse(reviewedAt) > Date.parse(recordedAt)) {
          throw new ProjectSourceRevisionError(
            "PROJECT_SOURCE_REVISION_MATERIAL_INVALID",
            "Reviewed version, rights, and replacement timestamps cannot be in the future.",
          );
        }
      }

      const staged = await this.#artifactStore.stage({
        bytes: [bytes],
        declaredByteSize: bytes.byteLength,
        declaredMediaType: request.material.media_type,
        expectedContentHash: contentHash,
      });
      const available = await this.#artifactStore.makeAvailable(staged);
      if (
        available.contentHash !== contentHash ||
        available.byteSize !== bytes.byteLength ||
        available.mediaType !== request.material.media_type
      ) {
        throw new ProjectSourceRevisionError(
          "PROJECT_SOURCE_REVISION_MATERIAL_INVALID",
          "The verified object-store result crossed the submitted source-version identity.",
        );
      }

      const records = this.#records(
        projectId,
        request,
        predecessor,
        principal,
        recordedAt,
        available,
      );
      this.#assertContracts(records);
      await this.#insertWorkVersion(client, records.workVersion);
      await this.#insertArtifactAuthority(client, records);
      await this.#insertProjectSource(client, records.projectSource);
      const receipt = this.#receipt(
        projectId,
        request,
        requestHash,
        predecessor,
        principal,
        records,
        recordedAt,
      );
      await this.#insertReceipt(client, receipt);
      return {
        receipt: clone(receipt),
        projectSource: clone(records.projectSource),
        applied: true,
      };
    });
  }

  async assessProjectSourceRevisionRecovery(
    projectId: string,
    request: PetraProjectSourceRevisionRequest,
    principal: ProjectSourceRevisionPrincipal,
  ): Promise<PetraProjectSourceRevisionRecoveryView> {
    this.#contracts.assertValid(
      "project-source-revision-request",
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
    const effect: PetraProjectSourceRevisionRecoveryView["effect"] =
      owned !== undefined
        ? { state: "effect_confirmed", receipt: owned.receipt }
        : rows.length === 0
          ? {
              state: "outcome_unknown",
              reason: "receipt_not_observed_at_cutoff",
              retry: {
                method: "POST",
                path: `/api/commands/projects/${projectId}/sources/${request.expected.current_source_ref.project_source_id}/revisions`,
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
    const returnValue: PetraProjectSourceRevisionRecoveryView["return"] =
      owned === undefined
        ? {
            state: "safe_fallback",
            destination: { place_role: "sources", project_id: projectId },
            reason:
              "No exact owned receipt is available, so Petra returns to Sources and re-reads the predecessor before another action.",
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
    const view: PetraProjectSourceRevisionRecoveryView = {
      schema_name: "petra.project-source-revision-recovery-view",
      schema_version: "1.0.0",
      assessment_id: derivePetraId("source_revision_recovery", contentHash),
      ...hashed,
      content_hash: contentHash,
    };
    this.#contracts.assertValid(
      "project-source-revision-recovery-view",
      "1.0.0",
      view,
    );
    return clone(view);
  }

  #assertRouteProject(
    projectId: string,
    request: PetraProjectSourceRevisionRequest,
  ): void {
    if (request.expected.project_ref.project_id !== projectId) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_PROJECT_STALE",
        "The source-version route and exact reviewed Project must match.",
      );
    }
  }

  #assertRights(request: PetraProjectSourceRevisionRequest): void {
    if (!request.rights.permissions.store_raw_bytes) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_RIGHTS_INVALID",
        "Source-version intake requires an explicit copy-specific decision permitting Petra to store these bytes.",
      );
    }
    if (
      request.rights.license_status === "known" &&
      request.rights.observed_license === undefined
    ) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_RIGHTS_INVALID",
        "Known license status requires the exact observed license basis.",
      );
    }
  }

  #assertExpectedProject(
    request: PetraProjectSourceRevisionRequest,
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
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_PROJECT_STALE",
        "The Project revision, record hash, or active status changed after source-version review.",
      );
    }
  }

  #assertExpectedDefinition(
    request: PetraProjectSourceRevisionRequest,
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
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_DEFINITION_STALE",
        "The current ProjectDefinition no longer matches the reviewed source-version binding.",
      );
    }
  }

  #assertExpectedSource(
    request: PetraProjectSourceRevisionRequest,
    source: PetraProjectSource,
    recordHash: string,
  ): void {
    const expected = request.expected.current_source_ref;
    if (
      source.project_id !== request.expected.project_ref.project_id ||
      source.project_source_id !== expected.project_source_id ||
      source.revision !== expected.revision ||
      source.content_hash !== expected.content_hash ||
      recordHash !== expected.record_hash ||
      source.content.status !== "active"
    ) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_SOURCE_STALE",
        "The current ProjectSource no longer matches the exact active predecessor reviewed for this version.",
      );
    }
  }

  #assertRole(
    predecessor: PetraProjectSource,
    definition: PetraProjectDefinition,
  ): void {
    const matches = definition.content.registrations.filter(
      (registration) =>
        registration.registration_kind === "source_role" &&
        registration.semantic_key === predecessor.content.source_role &&
        registration.contract.name === "petra.rights-decision" &&
        registration.contract.version === "1.0.0",
    );
    if (matches.length !== 1) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_ROLE_UNREGISTERED",
        "The current ProjectDefinition does not register the predecessor source role and rights contract once.",
      );
    }
  }

  async #assertSourceEligible(
    client: PoolClient,
    projectId: string,
    source: PetraProjectSource,
  ): Promise<void> {
    if (source.content.binding_kind !== "scientific_work_version") {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_SOURCE_INELIGIBLE",
        "Only a ProjectSource with registered WorkVersion ancestry can accept a new version.",
      );
    }
    const activeReplacement = await client.query(
      `SELECT 1
         FROM petra.project_source_replacement_heads
        WHERE project_id = $1 AND replaced_project_source_id = $2
          AND state = 'active'
        FOR SHARE`,
      [projectId, source.project_source_id],
    );
    if (activeReplacement.rows[0] !== undefined) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_SOURCE_INELIGIBLE",
        "The selected ProjectSource already has an active governed replacement.",
      );
    }
  }

  async #assertNewContentIdentity(
    client: PoolClient,
    contentHash: string,
  ): Promise<void> {
    const result = await client.query<{ artifact_id: string }>(
      "SELECT artifact_id FROM petra.artifacts WHERE content_hash = $1 FOR SHARE",
      [contentHash],
    );
    if (result.rows[0] !== undefined) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_IDENTITY_CONFLICT",
        `These exact bytes are already registered as ${result.rows[0].artifact_id}; use the distinct source reuse command instead.`,
      );
    }
  }

  async #assertExactWork(
    client: PoolClient,
    source: PetraProjectSource,
  ): Promise<void> {
    const work = source.content.work_ref;
    const result = await client.query<StoredRecordRow>(
      `SELECT payload, record_hash
         FROM petra.canonical_entity_revisions
        WHERE entity_id = $1 AND entity_kind = 'work' AND revision = $2
        FOR SHARE`,
      [work.work_id, work.revision],
    );
    const row = result.rows[0];
    if (
      row === undefined ||
      row.record_hash !== work.record_hash ||
      canonicalHash(row.payload) !== row.record_hash
    ) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_SOURCE_INELIGIBLE",
        "The predecessor no longer resolves to its exact retained Work ancestry.",
      );
    }
  }

  #records(
    projectId: string,
    request: PetraProjectSourceRevisionRequest,
    predecessor: PetraProjectSource,
    principal: ProjectSourceRevisionPrincipal,
    recordedAt: string,
    available: Awaited<ReturnType<ArtifactStore["makeAvailable"]>>,
  ): RevisionRecords {
    const actor = clone(principal.actor);
    const workVersion: PetraWorkVersion = {
      schema_name: "petra.work-version",
      schema_version: "1.0.0",
      work_version_id: derivePetraId("work_version", request.command_id),
      revision: 1,
      work_id: predecessor.content.work_ref.work_id,
      version_label: request.version.version_label,
      publication_status: request.version.publication_status,
      ...(request.version.published_date === undefined
        ? {}
        : { published_date: clone(request.version.published_date) }),
      metadata_source: {
        source_kind: "user",
        source_name: request.version.metadata_source_name,
        ...(request.version.metadata_source_record_id === undefined
          ? {}
          : { source_record_id: request.version.metadata_source_record_id }),
      },
      metadata_retrieved_at: request.version.metadata_retrieved_at,
      created_by: actor,
      created_at: recordedAt,
      updated_at: recordedAt,
    };
    const artifact: PetraArtifact = {
      schema_name: "petra.artifact",
      schema_version: "1.0.0",
      artifact_id: derivePetraId("artifact", request.command_id),
      revision: 1,
      artifact_kind: request.material.artifact_kind,
      media_type: request.material.media_type,
      content_hash: available.contentHash,
      byte_size: available.byteSize,
      created_by: actor,
      created_at: recordedAt,
    };
    const manifestId = derivePetraId("artifact_manifest", request.command_id);
    const rightsId = derivePetraId("rights_decision", request.command_id);
    const integrity: PetraArtifactManifest["integrity"] =
      available.verification.status === "verified"
        ? {
            status: "verified",
            checked_at: available.availableAt,
            problems: [],
          }
        : {
            status: "verified_with_warnings",
            checked_at: available.availableAt,
            problems: available.verification.problems.map((message) => ({
              code: "MEDIA_TYPE_VERIFICATION_WARNING",
              severity: "warning" as const,
              message,
            })) as Extract<
              PetraArtifactManifest["integrity"],
              { status: "verified_with_warnings" }
            >["problems"],
          };
    const manifest: PetraArtifactManifest = {
      schema_name: "petra.artifact-manifest",
      schema_version: "1.0.0",
      artifact_manifest_id: manifestId,
      revision: 1,
      artifact_id: artifact.artifact_id,
      rights_decision_id: rightsId,
      origin: {
        origin_kind: "user_supplied",
        supplied_by: actor,
        supplied_at: recordedAt,
        original_filename: request.material.original_filename,
        work_version_id: workVersion.work_version_id,
      },
      storage_ref: {
        storage_kind: "content_addressed_object",
        store_name: available.storeName,
        object_key: available.objectKey,
        content_hash: available.contentHash,
        availability: "available",
        verified_at: available.availableAt,
      },
      integrity,
      recorded_by: actor,
      recorded_at: recordedAt,
    };
    const rights: PetraRightsDecision = {
      schema_name: "petra.rights-decision",
      schema_version: "1.0.0",
      rights_decision_id: rightsId,
      revision: 1,
      artifact_manifest_id: manifestId,
      source_location: request.rights.source_location,
      license_status: request.rights.license_status,
      ...(request.rights.observed_license === undefined
        ? {}
        : { observed_license: clone(request.rights.observed_license) }),
      access_basis: request.rights.access_basis,
      decision_status: request.rights.decision_status,
      permissions: clone(request.rights.permissions),
      conditions: clone(request.rights.conditions),
      required_notices: clone(request.rights.required_notices),
      ...(request.rights.authorization_reference === undefined
        ? {}
        : { authorization_reference: request.rights.authorization_reference }),
      decision_maker: actor,
      rationale: request.rights.rationale,
      observed_at: request.rights.observed_at,
      policy_version: request.rights.policy_version,
      created_at: recordedAt,
    };
    const sourceContent: PetraProjectSource["content"] = {
      binding_kind: "scientific_work_version",
      project_definition_ref: {
        project_definition_id:
          request.expected.project_definition_ref.project_definition_id,
        revision: request.expected.project_definition_ref.revision,
        content_hash: request.expected.project_definition_ref.content_hash,
      },
      source_role: predecessor.content.source_role,
      work_ref: clone(predecessor.content.work_ref),
      work_version_ref: {
        work_version_id: workVersion.work_version_id,
        revision: 1,
        record_hash: canonicalHash(workVersion),
      },
      author_refs: clone(predecessor.content.author_refs),
      artifact_manifest_ref: {
        artifact_manifest_id: manifest.artifact_manifest_id,
        revision: 1,
        record_hash: canonicalHash(manifest),
      },
      status: "active",
    };
    const projectSource: PetraProjectSource = {
      schema_name: "petra.project-source",
      schema_version: "1.0.0",
      project_source_id: derivePetraId("project_source", request.command_id),
      revision: 1,
      project_id: projectId,
      content: sourceContent,
      content_hash: canonicalHash(sourceContent),
      added_by: actor,
      added_at: recordedAt,
    };
    return { workVersion, artifact, manifest, rights, projectSource };
  }

  #assertContracts(records: RevisionRecords): void {
    this.#contracts.assertValid("work-version", "1.0.0", records.workVersion);
    this.#contracts.assertValid("artifact", "1.0.0", records.artifact);
    this.#contracts.assertValid("artifact-manifest", "1.0.0", records.manifest);
    this.#contracts.assertValid("rights-decision", "1.0.0", records.rights);
    this.#contracts.assertValid(
      "project-source",
      "1.0.0",
      records.projectSource,
    );
  }

  #receipt(
    projectId: string,
    request: PetraProjectSourceRevisionRequest,
    requestHash: string,
    predecessor: PetraProjectSource,
    principal: ProjectSourceRevisionPrincipal,
    records: RevisionRecords,
    recordedAt: string,
  ): PetraProjectSourceRevisionReceipt {
    const exactRecordRef = (recordId: string, payload: unknown) => ({
      record_id: recordId,
      revision: 1,
      record_hash: canonicalHash(payload),
    });
    const predecessorRef = clone(request.expected.current_source_ref);
    const successorRef = {
      project_source_id: records.projectSource.project_source_id,
      revision: 1 as const,
      content_hash: records.projectSource.content_hash,
      record_hash: canonicalHash(records.projectSource),
      status: "active" as const,
    };
    const material = {
      artifact_ref: {
        artifact_id: records.artifact.artifact_id,
        revision: 1 as const,
        content_hash: records.artifact.content_hash,
        record_hash: canonicalHash(records.artifact),
        byte_size: records.artifact.byte_size,
        media_type: records.artifact.media_type,
      },
      artifact_manifest_ref: exactRecordRef(
        records.manifest.artifact_manifest_id,
        records.manifest,
      ),
      rights_decision_ref: exactRecordRef(
        records.rights.rights_decision_id,
        records.rights,
      ),
      storage: {
        store_name: records.manifest.storage_ref.store_name,
        object_key: records.manifest.storage_ref.object_key,
        availability: "available" as const,
      },
      origin: {
        origin_kind: "user_supplied" as const,
        original_filename: request.material.original_filename,
        source_location: request.rights.source_location,
      },
    };
    const receiptBase = {
      schema_name: "petra.project-source-revision-receipt" as const,
      schema_version: "1.0.0" as const,
      receipt_id: derivePetraId("source_revision_receipt", request.command_id),
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      request_hash: requestHash,
      project_id: projectId,
      actor: clone(principal.actor),
      capability_grant_id: principal.capabilityGrantId,
      project_ref: clone(request.expected.project_ref),
      project_definition_ref: clone(request.expected.project_definition_ref),
      predecessor_source_ref: predecessorRef,
      work_ref: {
        record_id: predecessor.content.work_ref.work_id,
        revision: predecessor.content.work_ref.revision,
        record_hash: predecessor.content.work_ref.record_hash,
      },
      work_version_ref: exactRecordRef(
        records.workVersion.work_version_id,
        records.workVersion,
      ),
      material,
      successor_source_ref: successorRef,
      effect: {
        kind: "source_revision_intake_retained" as const,
        summary:
          "The new immutable version and Project source are retained; the predecessor remains unchanged until its separately governed replacement commands run.",
        predecessor_unchanged: true as const,
      },
      replacement_handoff: {
        state: "governed_replacement_required" as const,
        exclude_predecessor: {
          command_name: "ExcludeProjectSource" as const,
          method: "POST" as const,
          path: `/api/commands/projects/${projectId}/sources/${predecessor.project_source_id}/lifecycle`,
          requested_action: "exclude_project_source" as const,
          expected_source_ref: predecessorRef,
          reason: request.replacement.rationale,
        },
        create_replacement: {
          command_name: "CreateProjectSourceReplacement" as const,
          method: "POST" as const,
          path: `/api/commands/projects/${projectId}/source-replacements`,
          replacement_kind: "newer_version" as const,
          replaced_source_from: "exclude_result.resulting_source_ref" as const,
          replacement_source_ref: successorRef,
          exclusion_receipt_from: "exclude_result.receipt" as const,
          rationale: request.replacement.rationale,
        },
      },
      destination: {
        place_role: "sources" as const,
        project_id: projectId,
        project_source_id: records.projectSource.project_source_id,
      },
      recovery: {
        command_path: `/api/commands/projects/${projectId}/sources/${predecessor.project_source_id}/revisions`,
        assessment_path: `/api/queries/projects/${projectId}/source-revision-recovery`,
        retry_reuses_command_identity: true as const,
        missing_receipt_means_unknown: true as const,
      },
      recorded_at: recordedAt,
    };
    const receipt: PetraProjectSourceRevisionReceipt = {
      ...receiptBase,
      record_hash: canonicalHash(receiptBase),
    };
    this.#contracts.assertValid(
      "project-source-revision-receipt",
      "1.0.0",
      receipt,
    );
    return receipt;
  }

  #replay(
    rows: readonly StoredReceiptRow[],
    projectId: string,
    request: PetraProjectSourceRevisionRequest,
    requestHash: string,
    principal: ProjectSourceRevisionPrincipal,
  ): ProjectSourceRevisionResult {
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
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_COMMAND_CONFLICT",
        "The command or idempotency identity is already bound to a different source-version request.",
      );
    }
    return { ...this.#storedResult(row), applied: false };
  }

  #storedResult(
    row: StoredReceiptRow,
  ): Omit<ProjectSourceRevisionResult, "applied"> {
    this.#contracts.assertValid(
      "project-source-revision-receipt",
      "1.0.0",
      row.receipt_payload,
    );
    this.#contracts.assertValid("project-source", "1.0.0", row.source_payload);
    const receipt = row.receipt_payload as PetraProjectSourceRevisionReceipt;
    const projectSource = row.source_payload as PetraProjectSource;
    const receiptBase = Object.fromEntries(
      Object.entries(receipt).filter(([key]) => key !== "record_hash"),
    );
    if (
      canonicalHash(receiptBase) !== receipt.record_hash ||
      row.receipt_record_hash !== receipt.record_hash ||
      canonicalHash(projectSource) !== row.source_record_hash ||
      receipt.successor_source_ref.project_source_id !==
        projectSource.project_source_id ||
      receipt.successor_source_ref.revision !== projectSource.revision ||
      receipt.successor_source_ref.content_hash !==
        projectSource.content_hash ||
      receipt.successor_source_ref.record_hash !== row.source_record_hash
    ) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_STORED_RECORD_CORRUPT",
        "The retained source-version receipt or successor ProjectSource failed exact hash validation.",
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
         FROM petra.project_source_revision_receipts AS receipt
         JOIN petra.project_source_revisions AS source
           ON source.project_source_id = receipt.successor_project_source_id
          AND source.revision = receipt.successor_revision
          AND source.content_hash = receipt.successor_content_hash
          AND source.record_hash = receipt.successor_record_hash
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
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_PROJECT_NOT_FOUND",
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
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_DEFINITION_STALE",
        "The Project has no retained current ProjectDefinition.",
      );
    }
    return result.rows[0];
  }

  async #currentSource(
    client: PoolClient,
    projectId: string,
    projectSourceId: string,
  ): Promise<StoredRecordRow> {
    const result = await client.query<StoredRecordRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.project_sources AS head
         JOIN petra.project_source_revisions AS revision
           ON revision.project_source_id = head.project_source_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1 AND head.project_source_id = $2
        FOR SHARE OF head, revision`,
      [projectId, projectSourceId],
    );
    if (result.rows[0] === undefined) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_SOURCE_NOT_FOUND",
        "The predecessor ProjectSource is not retained in this Project.",
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

  #source(value: unknown): PetraProjectSource {
    this.#contracts.assertValid("project-source", "1.0.0", value);
    const source = clone(value as PetraProjectSource);
    if (canonicalHash(source.content) !== source.content_hash) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_STORED_RECORD_CORRUPT",
        "The retained predecessor ProjectSource failed its content hash.",
      );
    }
    return source;
  }

  async #insertWorkVersion(
    client: PoolClient,
    version: PetraWorkVersion,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.canonical_entities (
         entity_id, entity_kind, current_revision, created_by_actor_id,
         created_by_actor_kind, created_at
       ) VALUES ($1, 'work_version', 1, $2, $3, $4::timestamptz)`,
      [
        version.work_version_id,
        version.created_by.actor_id,
        version.created_by.actor_kind,
        version.created_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.canonical_entity_revisions (
         entity_id, entity_kind, revision, schema_name, schema_version,
         record_hash, payload, updated_at
       ) VALUES ($1, 'work_version', 1, $2, $3, $4, $5::jsonb, $6::timestamptz)`,
      [
        version.work_version_id,
        version.schema_name,
        version.schema_version,
        canonicalHash(version),
        JSON.stringify(version),
        version.updated_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.work_version_revisions (
         work_version_id, revision, work_id, version_label,
         publication_status, published_date_precision, published_date_value,
         metadata_source_kind, metadata_source_name,
         metadata_source_record_id, metadata_retrieved_at
       ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz)`,
      [
        version.work_version_id,
        version.work_id,
        version.version_label,
        version.publication_status,
        version.published_date?.precision ?? null,
        version.published_date?.value ?? null,
        version.metadata_source.source_kind,
        version.metadata_source.source_name,
        version.metadata_source.source_record_id ?? null,
        version.metadata_retrieved_at,
      ],
    );
  }

  async #insertArtifactAuthority(
    client: PoolClient,
    records: RevisionRecords,
  ): Promise<void> {
    const { artifact, manifest, rights } = records;
    await client.query(
      `INSERT INTO petra.artifacts (
         artifact_id, revision, artifact_kind, media_type, content_hash,
         byte_size, created_by_actor_id, created_by_actor_kind, schema_name,
         schema_version, record_hash, payload, created_at
       ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
                 $12::timestamptz)`,
      [
        artifact.artifact_id,
        artifact.artifact_kind,
        artifact.media_type,
        artifact.content_hash,
        artifact.byte_size,
        artifact.created_by.actor_id,
        artifact.created_by.actor_kind,
        artifact.schema_name,
        artifact.schema_version,
        canonicalHash(artifact),
        JSON.stringify(artifact),
        artifact.created_at,
      ],
    );
    if (manifest.origin.origin_kind !== "user_supplied") {
      throw new Error(
        "Source-version intake constructed a non-upload manifest.",
      );
    }
    await client.query(
      `INSERT INTO petra.artifact_manifests (
         artifact_manifest_id, revision, artifact_id, rights_decision_id,
         origin_kind, origin_work_version_id, origin_work_version_kind,
         origin_actor_id, origin_actor_kind, origin_source_connector,
         origin_connector_version, origin_source_location,
         origin_original_filename, origin_generator_name,
         origin_generator_version, origin_at, storage_kind, store_name,
         object_key, storage_content_hash, availability, storage_verified_at,
         integrity_status, integrity_checked_at, recorded_by_actor_id,
         recorded_by_actor_kind, schema_name, schema_version, record_hash,
         payload, recorded_at
       ) VALUES (
         $1, 1, $2, $3, $4, $5, 'work_version', $6, $7, NULL, NULL,
         NULL, $8, NULL, NULL, $9::timestamptz, $10, $11, $12, $13,
         $14, $15::timestamptz, $16, $17::timestamptz, $18, $19, $20,
         $21, $22, $23::jsonb, $24::timestamptz
       )`,
      [
        manifest.artifact_manifest_id,
        manifest.artifact_id,
        manifest.rights_decision_id,
        manifest.origin.origin_kind,
        manifest.origin.work_version_id,
        manifest.origin.supplied_by.actor_id,
        manifest.origin.supplied_by.actor_kind,
        manifest.origin.original_filename,
        manifest.origin.supplied_at,
        manifest.storage_ref.storage_kind,
        manifest.storage_ref.store_name,
        manifest.storage_ref.object_key,
        manifest.storage_ref.content_hash,
        manifest.storage_ref.availability,
        manifest.storage_ref.verified_at,
        manifest.integrity.status,
        manifest.integrity.checked_at,
        manifest.recorded_by.actor_id,
        manifest.recorded_by.actor_kind,
        manifest.schema_name,
        manifest.schema_version,
        canonicalHash(manifest),
        JSON.stringify(manifest),
        manifest.recorded_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.rights_decisions (
         rights_decision_id, revision, artifact_manifest_id, source_location,
         license_status, access_basis, decision_status, store_raw_bytes,
         parse_permitted, index_permitted, embed_permitted,
         remote_selected_text_permitted, quote_publicly_permitted,
         redistribute_artifact_permitted, conditions, required_notices,
         decision_maker_actor_id, decision_maker_actor_kind, observed_at,
         policy_version, schema_name, schema_version, record_hash, payload,
         created_at
       ) VALUES (
         $1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14::text[], $15::text[], $16, $17, $18::timestamptz, $19, $20,
         $21, $22, $23::jsonb, $24::timestamptz
       )`,
      [
        rights.rights_decision_id,
        rights.artifact_manifest_id,
        rights.source_location,
        rights.license_status,
        rights.access_basis,
        rights.decision_status,
        rights.permissions.store_raw_bytes,
        rights.permissions.parse,
        rights.permissions.index,
        rights.permissions.embed,
        rights.permissions.send_selected_text_remotely,
        rights.permissions.quote_publicly,
        rights.permissions.redistribute_artifact,
        rights.conditions,
        rights.required_notices,
        rights.decision_maker.actor_id,
        rights.decision_maker.actor_kind,
        rights.observed_at,
        rights.policy_version,
        rights.schema_name,
        rights.schema_version,
        canonicalHash(rights),
        JSON.stringify(rights),
        rights.created_at,
      ],
    );
  }

  async #insertProjectSource(
    client: PoolClient,
    source: PetraProjectSource,
  ): Promise<void> {
    const content = source.content;
    await client.query(
      `INSERT INTO petra.project_sources (
         project_source_id, project_id, artifact_manifest_id, current_revision
       ) VALUES ($1, $2, $3, 1)`,
      [
        source.project_source_id,
        source.project_id,
        content.artifact_manifest_ref.artifact_manifest_id,
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
         $1, 1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
         $20, $21, $22, $23, $24::jsonb, $25::timestamptz
       )`,
      [
        source.project_source_id,
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
         ) VALUES ($1, 1, $2, $3, $4, $5)`,
        [
          source.project_source_id,
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
    receipt: PetraProjectSourceRevisionReceipt,
  ): Promise<void> {
    const predecessor = receipt.predecessor_source_ref;
    const successor = receipt.successor_source_ref;
    await client.query(
      `INSERT INTO petra.project_source_revision_receipts (
         receipt_id, command_id, idempotency_key, request_hash, project_id,
         actor_id, actor_kind, capability_grant_id,
         predecessor_project_source_id, predecessor_revision,
         predecessor_content_hash, predecessor_record_hash,
         work_id, work_revision, work_record_hash,
         work_version_id, work_version_revision, work_version_record_hash,
         artifact_id, artifact_content_hash, artifact_manifest_id,
         rights_decision_id, successor_project_source_id, successor_revision,
         successor_content_hash, successor_record_hash, schema_name,
         schema_version, record_hash, payload, recorded_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
         $25, $26, $27, $28, $29, $30::jsonb, $31::timestamptz
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
        predecessor.project_source_id,
        predecessor.revision,
        predecessor.content_hash,
        predecessor.record_hash,
        receipt.work_ref.record_id,
        receipt.work_ref.revision,
        receipt.work_ref.record_hash,
        receipt.work_version_ref.record_id,
        receipt.work_version_ref.revision,
        receipt.work_version_ref.record_hash,
        receipt.material.artifact_ref.artifact_id,
        receipt.material.artifact_ref.content_hash,
        receipt.material.artifact_manifest_ref.record_id,
        receipt.material.rights_decision_ref.record_id,
        successor.project_source_id,
        successor.revision,
        successor.content_hash,
        successor.record_hash,
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
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_STORED_RECORD_CORRUPT",
        "PostgreSQL did not provide the source-version transaction time.",
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
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_STORED_RECORD_CORRUPT",
        "PostgreSQL did not provide the source-version recovery observation cutoff.",
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
          throw new ProjectSourceRevisionError(
            "PROJECT_SOURCE_REVISION_IDENTITY_CONFLICT",
            "A source-version identity or exact byte sequence is already registered.",
          );
        }
        throw error;
      } finally {
        client.release();
      }
    }
  }
}
