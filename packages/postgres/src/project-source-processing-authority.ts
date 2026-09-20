import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraProjectSourceProcessingReceipt,
  PetraProjectSourceProcessingRecoveryView,
  PetraProjectSourceProcessingRequest,
  PetraProjectSourceProcessingView,
  PetraRightsDecision,
  PetraWorkerInputManifest,
  PetraWorkUnit,
  PetraWorkVersion,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  derivePetraId,
  ProjectSourceProcessingError,
  type ProjectSourceProcessingAuthority,
  type ProjectSourceProcessingPrincipal,
  type ProjectSourceProcessingResult,
  type ProjectSourceProcessingViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";
import { PostgresProjectSourceViewReader } from "./project-source-view-reader.js";
import { PostgresProjectWorkOperations } from "./project-work-operations.js";
import { PostgresWorkUnitAuthorityRepository } from "./work-unit-authority-repository.js";

interface AuthorityRow {
  readonly project_payload: unknown;
  readonly project_record_hash: string;
  readonly definition_payload: unknown;
  readonly definition_record_hash: string;
  readonly source_payload: unknown;
  readonly source_record_hash: string;
  readonly manifest_payload: unknown;
  readonly manifest_record_hash: string;
  readonly artifact_payload: unknown;
  readonly artifact_record_hash: string;
  readonly rights_payload: unknown;
  readonly rights_record_hash: string;
  readonly version_payload: unknown;
  readonly version_record_hash: string;
}

interface AuthorityRecords {
  readonly project: PetraProject;
  readonly projectRecordHash: string;
  readonly definition: PetraProjectDefinition;
  readonly definitionRecordHash: string;
  readonly source: PetraProjectSource;
  readonly sourceRecordHash: string;
  readonly manifest: PetraArtifactManifest;
  readonly manifestRecordHash: string;
  readonly artifact: PetraArtifact;
  readonly artifactRecordHash: string;
  readonly rights: PetraRightsDecision;
  readonly rightsRecordHash: string;
  readonly version: PetraWorkVersion;
  readonly versionRecordHash: string;
}

interface CommandRow {
  readonly state: "pending" | "completed";
  readonly command_id: string;
  readonly idempotency_key: string;
  readonly project_id: string;
  readonly project_source_id: string;
  readonly request_hash: string;
  readonly request_payload: unknown;
  readonly work_unit_payload: unknown;
  readonly input_manifest_payload: unknown;
  readonly actor_id: string;
  readonly actor_kind: "human";
  readonly capability_grant_id: string;
  readonly requested_at: Date;
  readonly receipt_payload: unknown;
  readonly receipt_record_hash: string | null;
}

interface SourceCommandRow {
  readonly state: "pending" | "completed";
  readonly work_unit_id: string;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const PROCESSING_FAMILY = {
  semantic_key: "petra.source-processing" as const,
  contract: {
    name: "petra.document.parse" as const,
    version: "1.0.0" as const,
    content_hash: canonicalHash({
      task: "petra.document.parse@1.0.0",
      worker: "petra.science@0.0.0",
      entrypoint: "petra_science.document_worker:main",
      network: "blocked",
      authority: "proposal_only",
    }),
  },
};

const sameActor = (
  left: { readonly actor_id: string; readonly actor_kind: string },
  right: { readonly actor_id: string; readonly actor_kind: string },
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

const terminal = (work: PetraWorkUnit): boolean =>
  work.status.state === "completed" || work.status.state === "cancelled";

/**
 * Durable ProjectSource processing owner. A pending command stores the exact
 * server-composed Work pair before registration, so disconnect recovery can
 * resume the same identities without reconstructing input from a later head.
 */
export class PostgresProjectSourceProcessingAuthority
  implements ProjectSourceProcessingAuthority, ProjectSourceProcessingViewReader
{
  readonly #pool: Pool;
  readonly #authorizer: PostgresCommandAuthorizer;
  readonly #contracts: PetraContractRegistry;
  readonly #workUnits: PostgresWorkUnitAuthorityRepository;
  readonly #workOperations: PostgresProjectWorkOperations;
  readonly #sourceViews: PostgresProjectSourceViewReader;

  constructor(
    pool: Pool,
    authorizer: PostgresCommandAuthorizer,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#authorizer = authorizer;
    this.#contracts = contracts;
    this.#workUnits = new PostgresWorkUnitAuthorityRepository(pool, contracts);
    this.#workOperations = new PostgresProjectWorkOperations(
      pool,
      authorizer,
      contracts,
    );
    this.#sourceViews = new PostgresProjectSourceViewReader(pool, contracts);
  }

  async executeProjectSourceProcessing(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
    principal: ProjectSourceProcessingPrincipal,
  ): Promise<ProjectSourceProcessingResult> {
    this.#contracts.assertValid(
      "project-source-processing-request",
      "1.0.0",
      request,
    );
    this.#assertRoute(projectId, projectSourceId, request);
    const requestHash = canonicalHash(request);
    const reserved = await this.#reserve(
      projectId,
      projectSourceId,
      request,
      requestHash,
      principal,
    );

    if (reserved.receipt !== undefined) {
      const retainedWork = await this.#workUnits.getWorkUnit(
        reserved.workUnit.work_unit_id,
      );
      if (retainedWork === undefined) {
        throw new ProjectSourceProcessingError(
          "PROJECT_SOURCE_PROCESSING_STORED_RECORD_CORRUPT",
          "The completed source-processing receipt lost its exact WorkUnit.",
        );
      }
      const processing = await this.#requiredView(projectId, projectSourceId);
      return {
        receipt: reserved.receipt,
        workUnit: retainedWork,
        inputManifest: reserved.inputManifest,
        processing,
        applied: false,
      };
    }

    let work = await this.#workUnits.register({
      workUnit: reserved.workUnit,
      inputManifest: reserved.inputManifest,
    });
    await this.#workOperations.registerStagePlan({
      stagePlanId: derivePetraId(
        "work_stage_plan",
        `source-processing:${work.work_unit_id}`,
      ),
      projectId,
      workUnitId: work.work_unit_id,
      expectedWorkUnitSpecHash: work.spec_hash,
      stages: [
        {
          stageId: "process-exact-source-copy",
          label: "Process the exact source copy",
          purpose:
            "Run the registered local parser against the exact rights-governed source copy.",
          boundary: "execution",
          prerequisiteStageIds: [],
          accountableRole: "Petra source processor",
          input:
            "The exact Artifact, manifest, rights decision, and WorkVersion retained by this ProjectSource.",
          output:
            "A bounded ParsedDocument proposal plus declared diagnostics; no source meaning or Project authority changes.",
        },
        {
          stageId: "inspect-processing-outcome",
          label: "Inspect processing outcome",
          purpose:
            "Expose the representation extent, limitations, and exact return after worker validation.",
          boundary: "completion",
          prerequisiteStageIds: ["process-exact-source-copy"],
          accountableRole: "Project author",
          input: "The retained worker outcome and any declared diagnostics.",
          output:
            "An inspectable source representation or an exact recovery result.",
        },
      ],
      registeredAt: reserved.requestedAt,
    });
    if (work.status.state === "requested") {
      work = await this.#workUnits.queue(
        work.work_unit_id,
        work.revision,
        reserved.requestedAt,
      );
    }
    if (work.status.state === "queued") {
      work = await this.#workUnits.start(
        work.work_unit_id,
        work.revision,
        1,
        reserved.requestedAt,
      );
    }
    if (work.status.state !== "running") {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_STORED_RECORD_CORRUPT",
        "The reserved source-processing Work did not reach its first running attempt.",
      );
    }

    const receipt = await this.#complete(
      projectId,
      projectSourceId,
      request,
      requestHash,
      principal,
      work,
      reserved.inputManifest,
    );
    const processing = await this.#requiredView(projectId, projectSourceId);
    return {
      receipt,
      workUnit: clone(work),
      inputManifest: clone(reserved.inputManifest),
      processing,
      applied: true,
    };
  }

  async assessProjectSourceProcessingRecovery(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
    principal: ProjectSourceProcessingPrincipal,
  ): Promise<PetraProjectSourceProcessingRecoveryView> {
    this.#contracts.assertValid(
      "project-source-processing-request",
      "1.0.0",
      request,
    );
    this.#assertRoute(projectId, projectSourceId, request);
    const requestHash = canonicalHash(request);
    const rows = await this.#byIdentity(
      this.#pool,
      request.command_id,
      request.idempotency_key,
    );
    const row = rows.length === 1 ? rows[0] : undefined;
    const exact =
      row !== undefined &&
      row.project_id === projectId &&
      row.project_source_id === projectSourceId &&
      row.command_id === request.command_id &&
      row.idempotency_key === request.idempotency_key &&
      row.request_hash === requestHash &&
      canonicalize(row.request_payload) === canonicalize(request);
    const owned = exact && sameActor(row, principal.actor);
    const receipt =
      owned && row.state === "completed" ? this.#receipt(row) : undefined;
    const retryPath = `/api/commands/projects/${projectId}/sources/${projectSourceId}/processing`;
    const effect: PetraProjectSourceProcessingRecoveryView["effect"] =
      receipt !== undefined
        ? { state: "effect_confirmed", receipt }
        : rows.length === 0 || (owned && row.state === "pending")
          ? {
              state: "outcome_unknown",
              reason:
                row?.state === "pending"
                  ? "command_still_applying"
                  : "receipt_not_observed_at_cutoff",
              retry: {
                method: "POST",
                path: retryPath,
                reuse_exact_request: true,
              },
            }
          : {
              state: "unavailable_to_verify",
              reason: exact
                ? "command_not_owned_by_authenticated_actor"
                : "command_identity_conflict",
            };
    const returnValue: PetraProjectSourceProcessingRecoveryView["return"] =
      receipt === undefined
        ? {
            state: "safe_fallback",
            destination: {
              place_role: "sources",
              project_id: projectId,
              project_source_id: projectSourceId,
            },
            reason:
              "No exact owned completed receipt is available, so Petra returns to the same source and re-reads processing state before another action.",
          }
        : { state: "exact", destination: clone(receipt.destination) };
    const observedAt = await this.#databaseTime();
    const content = {
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
    const view: PetraProjectSourceProcessingRecoveryView = {
      schema_name: "petra.project-source-processing-recovery-view",
      schema_version: "1.0.0",
      assessment_id: derivePetraId(
        "source_processing_recovery",
        canonicalHash(content),
      ),
      ...content,
      content_hash: canonicalHash(content),
    };
    this.#contracts.assertValid(
      "project-source-processing-recovery-view",
      "1.0.0",
      view,
    );
    return clone(view);
  }

  async getProjectSourceProcessingView(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceProcessingView | undefined> {
    const source = await this.#sourceViews.getProjectSourceView(
      projectId,
      projectSourceId,
    );
    if (source === undefined) return undefined;
    const records = await this.#records(this.#pool, projectId, projectSourceId);
    if (records === undefined) return undefined;
    const currentCommand = await this.#pool.query<SourceCommandRow>(
      `SELECT state, work_unit_id
         FROM petra.project_source_processing_commands
        WHERE project_id = $1 AND project_source_id = $2`,
      [projectId, projectSourceId],
    );
    const command = currentCommand.rows[0];
    const work =
      command === undefined
        ? undefined
        : await this.#workUnits.getWorkUnit(command.work_unit_id);
    if (command !== undefined && work === undefined) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_STORED_RECORD_CORRUPT",
        "The source-processing command lost its exact WorkUnit.",
      );
    }
    const sourceRoleTerm = records.definition.content.terms.find(
      (term) => term.semantic_key === records.source.content.source_role,
    );
    const profileBinding: PetraProjectSourceProcessingView["profile_binding"] =
      {
        project_ref: {
          project_id: records.project.project_id,
          revision: records.project.revision,
          record_hash: records.projectRecordHash,
        },
        project_definition_ref: {
          project_definition_id: records.definition.project_definition_id,
          revision: records.definition.revision,
          content_hash: records.definition.content_hash,
          record_hash: records.definitionRecordHash,
        },
        definition_family: records.definition.definition_family,
        profile_label: records.definition.content.label,
        source_role: records.source.content.source_role,
        source_role_label:
          sourceRoleTerm?.singular ?? records.source.content.source_role,
        processing_family_ref: clone(PROCESSING_FAMILY),
        processing_family_label: "Source processing",
      };
    const requestTemplate: PetraProjectSourceProcessingRequest["expected"] = {
      project_ref: clone(profileBinding.project_ref),
      project_definition_ref: clone(profileBinding.project_definition_ref),
      project_source_ref: {
        project_source_id: records.source.project_source_id,
        revision: records.source.revision,
        content_hash: records.source.content_hash,
        record_hash: records.sourceRecordHash,
        status: "active",
      },
      source_role: records.source.content.source_role,
      processing_family_ref: clone(PROCESSING_FAMILY),
    };
    let processing: PetraProjectSourceProcessingView["processing"];
    if (work !== undefined) {
      processing = {
        state: terminal(work) ? "terminal" : "active",
        work_unit_ref: {
          work_unit_id: work.work_unit_id,
          revision: work.revision,
          spec_hash: work.spec_hash,
          state: work.status.state,
        },
        work_detail_path: `/api/queries/projects/${projectId}/work/${work.work_unit_id}`,
        operations_path: `/api/queries/projects/${projectId}/work/${work.work_unit_id}/operations`,
      };
    } else if (records.source.content.status !== "active") {
      processing = { state: "unavailable", reason: "source_not_active" };
    } else if (records.manifest.storage_ref.availability !== "available") {
      processing = { state: "unavailable", reason: "copy_not_available" };
    } else if (!records.rights.permissions.parse) {
      processing = { state: "unavailable", reason: "parse_not_permitted" };
    } else if (
      records.artifact.artifact_kind !== "pdf" ||
      records.artifact.media_type !== "application/pdf"
    ) {
      processing = {
        state: "unavailable",
        reason: "unsupported_source_format",
      };
    } else if (!this.#sourceUsesCurrentDefinition(records)) {
      processing = { state: "unavailable", reason: "source_role_not_current" };
    } else if (!this.#roleRegistered(records)) {
      processing = { state: "unavailable", reason: "source_role_not_current" };
    } else if (source.content.representation.document_ref !== undefined) {
      processing = {
        state: "unavailable",
        reason: "representation_already_available",
      };
    } else {
      processing = {
        state: "ready",
        reason: "exact_copy_and_parse_permission_available",
        request_template: requestTemplate,
        command: {
          method: "POST",
          path: `/api/commands/projects/${projectId}/sources/${projectSourceId}/processing`,
        },
      };
    }
    const limitations = [
      "Processing creates a bounded operational proposal; it does not endorse source meaning or apply Project authority.",
      source.content.representation.extent === "identity_only"
        ? "No parsed representation is retained yet."
        : `The retained representation extent is ${source.content.representation.extent.replace("_", " ")}.`,
      records.rights.permissions.send_selected_text_remotely
        ? "Selected text may be sent remotely only by a separately authorized Work path."
        : "This processing path is local and its selected text cannot be sent remotely.",
    ] as PetraProjectSourceProcessingView["limitations"];
    const content = {
      project_id: projectId,
      project_source_id: projectSourceId,
      source: clone(source),
      profile_binding: profileBinding,
      processing,
      representation: clone(source.content.representation),
      limitations,
      return: {
        place_role: "sources" as const,
        project_id: projectId,
        project_source_id: projectSourceId,
      },
      read_at: source.read_at,
    };
    const view: PetraProjectSourceProcessingView = {
      schema_name: "petra.project-source-processing-view",
      schema_version: "1.0.0",
      ...content,
      content_hash: canonicalHash(content),
    };
    this.#contracts.assertValid(
      "project-source-processing-view",
      "1.0.0",
      view,
    );
    return clone(view);
  }

  async #reserve(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
    requestHash: string,
    principal: ProjectSourceProcessingPrincipal,
  ): Promise<{
    readonly workUnit: PetraWorkUnit;
    readonly inputManifest: PetraWorkerInputManifest;
    readonly requestedAt: string;
    readonly receipt?: PetraProjectSourceProcessingReceipt;
  }> {
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `source-processing-command:${request.command_id}`,
        `source-processing-idempotency:${request.idempotency_key}`,
        `source-processing-source:${projectId}:${projectSourceId}`,
      ]);
      if (
        !(await this.#authorizer.authorize(
          {
            actor: principal.actor,
            capabilityGrantId: principal.capabilityGrantId,
            commandName: "StartProjectSourceProcessing",
            projectId,
          },
          client,
        ))
      ) {
        throw new ProjectSourceProcessingError(
          "PROJECT_SOURCE_PROCESSING_NOT_AUTHORIZED",
          "The authenticated human and capability grant do not authorize source processing in this Project.",
        );
      }
      const rows = await this.#byIdentity(
        client,
        request.command_id,
        request.idempotency_key,
        true,
      );
      if (rows.length > 0) {
        const row = this.#exactRow(
          rows,
          projectId,
          projectSourceId,
          request,
          requestHash,
          principal,
        );
        const workUnit = this.#work(row.work_unit_payload);
        const inputManifest = this.#input(row.input_manifest_payload);
        return {
          workUnit,
          inputManifest,
          requestedAt: row.requested_at.toISOString(),
          ...(row.state === "completed" ? { receipt: this.#receipt(row) } : {}),
        };
      }
      const existing = await client.query(
        `SELECT 1 FROM petra.project_source_processing_commands
          WHERE project_id = $1 AND project_source_id = $2
          FOR UPDATE`,
        [projectId, projectSourceId],
      );
      if ((existing.rowCount ?? 0) > 0) {
        throw new ProjectSourceProcessingError(
          "PROJECT_SOURCE_PROCESSING_ALREADY_EXISTS",
          "This exact ProjectSource already has retained processing Work; inspect or manage that Work instead of creating a duplicate effect.",
        );
      }
      const records = await this.#records(
        client,
        projectId,
        projectSourceId,
        true,
      );
      if (records === undefined) {
        throw new ProjectSourceProcessingError(
          "PROJECT_SOURCE_PROCESSING_SOURCE_NOT_FOUND",
          "The ProjectSource is not retained in this Project.",
        );
      }
      this.#assertExpected(request, records);
      const time = await client.query<{ requested_at: Date }>(
        "SELECT transaction_timestamp() AS requested_at",
      );
      const requestedAt = time.rows[0]?.requested_at.toISOString();
      if (requestedAt === undefined)
        throw new Error("PostgreSQL omitted command time.");
      const pair = this.#pair(
        projectId,
        request,
        principal,
        records,
        requestedAt,
      );
      await client.query(
        `INSERT INTO petra.project_source_processing_commands (
           receipt_id, command_id, idempotency_key, project_id,
           project_source_id, work_unit_id, request_hash, request_payload,
           work_unit_payload, input_manifest_payload, actor_id, actor_kind,
           capability_grant_id, requested_at, state
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb,
                   $10::jsonb, $11, $12, $13, $14::timestamptz, 'pending')`,
        [
          derivePetraId("source_processing_receipt", request.command_id),
          request.command_id,
          request.idempotency_key,
          projectId,
          projectSourceId,
          pair.workUnit.work_unit_id,
          requestHash,
          JSON.stringify(request),
          JSON.stringify(pair.workUnit),
          JSON.stringify(pair.inputManifest),
          principal.actor.actor_id,
          principal.actor.actor_kind,
          principal.capabilityGrantId,
          requestedAt,
        ],
      );
      return { ...pair, requestedAt };
    });
  }

  async #complete(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
    requestHash: string,
    principal: ProjectSourceProcessingPrincipal,
    work: PetraWorkUnit,
    input: PetraWorkerInputManifest,
  ): Promise<PetraProjectSourceProcessingReceipt> {
    return this.#transaction(async (client) => {
      const rows = await this.#byIdentity(
        client,
        request.command_id,
        request.idempotency_key,
        true,
      );
      const row = this.#exactRow(
        rows,
        projectId,
        projectSourceId,
        request,
        requestHash,
        principal,
      );
      if (row.state === "completed") return this.#receipt(row);
      const recordedAt = row.requested_at.toISOString();
      const receiptBase = {
        schema_name: "petra.project-source-processing-receipt" as const,
        schema_version: "1.0.0" as const,
        receipt_id: derivePetraId(
          "source_processing_receipt",
          request.command_id,
        ),
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        request_hash: requestHash,
        project_id: projectId,
        actor: clone(principal.actor),
        capability_grant_id: principal.capabilityGrantId,
        expected: clone(request.expected),
        work_unit_ref: {
          work_unit_id: work.work_unit_id,
          revision: work.revision,
          spec_hash: work.spec_hash,
          record_hash: canonicalHash(work),
          state: work.status.state as "running",
        },
        input_manifest_ref: {
          worker_input_manifest_id: input.worker_input_manifest_id,
          content_hash: input.content_hash,
          record_hash: canonicalHash(input),
        },
        effect: {
          kind: "source_processing_work_started" as const,
          summary:
            "The exact current source copy entered one bounded local processing Work attempt; source meaning and Project authority are unchanged.",
          bounded_to_exact_source_copy: true as const,
          meaning_authority_unchanged: true as const,
        },
        destination: {
          place_role: "sources" as const,
          project_id: projectId,
          project_source_id: projectSourceId,
          work_unit_id: work.work_unit_id,
        },
        recovery: {
          command_path: `/api/commands/projects/${projectId}/sources/${projectSourceId}/processing`,
          assessment_path: `/api/queries/projects/${projectId}/sources/${projectSourceId}/processing-recovery`,
          processing_path: `/api/queries/projects/${projectId}/sources/${projectSourceId}/processing`,
          retry_reuses_command_identity: true as const,
          missing_receipt_means_unknown: true as const,
        },
        recorded_at: recordedAt,
      };
      const receipt: PetraProjectSourceProcessingReceipt = {
        ...receiptBase,
        record_hash: canonicalHash(receiptBase),
      };
      this.#contracts.assertValid(
        "project-source-processing-receipt",
        "1.0.0",
        receipt,
      );
      await client.query(
        `UPDATE petra.project_source_processing_commands
            SET state = 'completed', receipt_payload = $2::jsonb,
                receipt_record_hash = $3, completed_at = transaction_timestamp()
          WHERE command_id = $1 AND state = 'pending'`,
        [request.command_id, JSON.stringify(receipt), receipt.record_hash],
      );
      return receipt;
    });
  }

  #pair(
    projectId: string,
    request: PetraProjectSourceProcessingRequest,
    principal: ProjectSourceProcessingPrincipal,
    records: AuthorityRecords,
    requestedAt: string,
  ): {
    readonly workUnit: PetraWorkUnit;
    readonly inputManifest: PetraWorkerInputManifest;
  } {
    const workUnitId = derivePetraId("work_unit", request.command_id);
    const manifestId = derivePetraId(
      "worker_input_manifest",
      request.command_id,
    );
    const inputContent: PetraWorkerInputManifest["content"] = {
      task: {
        task_family: "document_processing",
        task_name: "petra.document.parse",
        task_version: "1.0.0",
      },
      worker: {
        executor_kind: "python_worker",
        worker_name: "petra.science",
        worker_version: "0.0.0",
        runtime_name: "python",
        runtime_version: "3.13.7",
        entrypoint: "petra_science.document_worker:main",
      },
      inputs: [
        {
          binding_kind: "artifact",
          name: "source_pdf",
          artifact_id: records.artifact.artifact_id,
          content_hash: records.artifact.content_hash,
          byte_size: records.artifact.byte_size,
        },
        {
          binding_kind: "record",
          name: "source_artifact",
          record_id: records.artifact.artifact_id,
          record_revision: records.artifact.revision,
          snapshot_hash: records.artifactRecordHash,
        },
        {
          binding_kind: "record",
          name: "source_artifact_manifest",
          record_id: records.manifest.artifact_manifest_id,
          record_revision: records.manifest.revision,
          snapshot_hash: records.manifestRecordHash,
        },
        {
          binding_kind: "record",
          name: "rights_decision",
          record_id: records.rights.rights_decision_id,
          record_revision: records.rights.revision,
          snapshot_hash: records.rightsRecordHash,
        },
        {
          binding_kind: "record",
          name: "work_version",
          record_id: records.version.work_version_id,
          record_revision: records.version.revision,
          snapshot_hash: records.versionRecordHash,
        },
      ],
      expected_outputs: [
        {
          output_name: "docling_document",
          output_role: "result",
          required: true,
          media_type: "application/gzip",
          max_bytes: 30_000_000,
        },
        {
          output_name: "document_parse_bundle",
          output_role: "proposal",
          required: true,
          media_type: "application/json",
          max_bytes: 20_000_000,
          contract: {
            schema_name: "petra.document-parse-bundle",
            schema_version: "1.0.0",
            schema_hash:
              "sha256:331fea5e80f94d85f87887b5e37f424339cd6bc8d589a44785a3da1d8ee9e407",
          },
        },
        {
          output_name: "worker_log",
          output_role: "log",
          required: false,
          media_type: "text/plain",
          max_bytes: 1_000_000,
        },
      ],
      resource_limits: {
        max_wall_time_ms: 300_000,
        max_output_bytes: 51_000_000,
        max_attempts: 2,
        max_parallelism: 1,
        max_cpu_time_ms: 300_000,
        max_memory_bytes: 4_294_967_296,
        max_storage_bytes: 1_073_741_824,
      },
      network_policy: { network_mode: "blocked" },
      partial_result_policy: "retain_diagnostics",
    };
    const inputManifest: PetraWorkerInputManifest = {
      schema_name: "petra.worker-input-manifest",
      schema_version: "1.0.0",
      worker_input_manifest_id: manifestId,
      revision: 1,
      work_unit_id: workUnitId,
      project_id: projectId,
      content: inputContent,
      content_hash: canonicalHash(inputContent),
      issued_by: clone(principal.actor),
      issued_at: requestedAt,
    };
    const spec: PetraWorkUnit["spec"] = {
      workflow_name: "petra.source-processing",
      workflow_version: "1.0.0",
      objective:
        "Produce a bounded parsed representation for the exact registered source copy without changing source meaning or Project authority.",
      work_mode: "background",
      priority: "user_visible",
      dependency_work_unit_ids: [],
      input_manifest_ref: {
        worker_input_manifest_id: manifestId,
        content_hash: inputManifest.content_hash,
      },
      idempotency_key: `source-processing:${request.command_id}`,
      cache: {
        cache_mode: "reuse_exact",
        cache_key: `source-processing:${records.artifact.content_hash.slice(7)}:petra-document-parse-1.0.0`,
      },
      cancellation_policy: "cancellable",
      checkpoint_policy: "disabled",
    };
    const workUnit: PetraWorkUnit = {
      schema_name: "petra.work-unit",
      schema_version: "1.0.0",
      work_unit_id: workUnitId,
      revision: 1,
      project_id: projectId,
      spec,
      spec_hash: canonicalHash(spec),
      status: { state: "requested", requested_at: requestedAt },
      capability_grant_id: principal.capabilityGrantId,
      trace_id: derivePetraId("trace", request.command_id),
      created_by: clone(principal.actor),
      created_at: requestedAt,
      updated_at: requestedAt,
    };
    this.#contracts.assertValid(
      "worker-input-manifest",
      "1.0.0",
      inputManifest,
    );
    this.#contracts.assertValid("work-unit", "1.0.0", workUnit);
    return { workUnit, inputManifest };
  }

  #assertExpected(
    request: PetraProjectSourceProcessingRequest,
    records: AuthorityRecords,
  ): void {
    const expected = request.expected;
    if (
      expected.project_ref.project_id !== records.project.project_id ||
      expected.project_ref.revision !== records.project.revision ||
      expected.project_ref.record_hash !== records.projectRecordHash
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_PROJECT_STALE",
        "Source processing must bind the exact current Project revision.",
      );
    }
    if (
      expected.project_definition_ref.project_definition_id !==
        records.definition.project_definition_id ||
      expected.project_definition_ref.revision !==
        records.definition.revision ||
      expected.project_definition_ref.content_hash !==
        records.definition.content_hash ||
      expected.project_definition_ref.record_hash !==
        records.definitionRecordHash
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_DEFINITION_STALE",
        "Source processing must bind the exact current ProjectDefinition.",
      );
    }
    if (
      expected.project_source_ref.project_source_id !==
        records.source.project_source_id ||
      expected.project_source_ref.revision !== records.source.revision ||
      expected.project_source_ref.content_hash !==
        records.source.content_hash ||
      expected.project_source_ref.record_hash !== records.sourceRecordHash ||
      records.source.content.status !== "active"
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_SOURCE_STALE",
        "Source processing must bind the exact active current ProjectSource revision.",
      );
    }
    if (
      expected.source_role !== records.source.content.source_role ||
      !this.#sourceUsesCurrentDefinition(records) ||
      !this.#roleRegistered(records)
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_ROLE_UNREGISTERED",
        "The ProjectSource role is not registered by the exact current ProjectDefinition.",
      );
    }
    if (
      canonicalize(expected.processing_family_ref) !==
      canonicalize(PROCESSING_FAMILY)
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_SOURCE_STALE",
        "The requested processing family is not Petra's exact registered bounded parser family.",
      );
    }
    if (records.manifest.storage_ref.availability !== "available") {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_COPY_UNAVAILABLE",
        "The exact retained source copy is not available for processing.",
      );
    }
    if (
      records.rights.decision_status !== "verified" ||
      !records.rights.permissions.parse
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_PARSE_NOT_AUTHORIZED",
        "The exact current RightsDecision does not verify permission to parse this source copy.",
      );
    }
    if (
      records.artifact.artifact_kind !== "pdf" ||
      records.artifact.media_type !== "application/pdf"
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_SOURCE_UNAVAILABLE",
        "The registered parser accepts an exact PDF source copy; this source format is not supported by that Work family.",
      );
    }
  }

  #sourceUsesCurrentDefinition(records: AuthorityRecords): boolean {
    const definitionRef = records.source.content.project_definition_ref;
    return (
      definitionRef.project_definition_id ===
        records.definition.project_definition_id &&
      definitionRef.revision === records.definition.revision &&
      definitionRef.content_hash === records.definition.content_hash
    );
  }

  #roleRegistered(records: AuthorityRecords): boolean {
    return records.definition.content.registrations.some(
      (registration) =>
        registration.registration_kind === "source_role" &&
        registration.semantic_key === records.source.content.source_role &&
        registration.contract.name === "petra.rights-decision" &&
        registration.contract.version === "1.0.0",
    );
  }

  #assertRoute(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
  ): void {
    if (
      request.expected.project_ref.project_id !== projectId ||
      request.expected.project_source_ref.project_source_id !== projectSourceId
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_SOURCE_STALE",
        "The source-processing route must match the reviewed Project and ProjectSource.",
      );
    }
  }

  async #records(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    projectId: string,
    projectSourceId: string,
    lock = false,
  ): Promise<AuthorityRecords | undefined> {
    const result = await queryable.query<AuthorityRow>(
      `SELECT project_revision.payload AS project_payload,
              project_revision.record_hash AS project_record_hash,
              definition_revision.payload AS definition_payload,
              definition_revision.record_hash AS definition_record_hash,
              source_revision.payload AS source_payload,
              source_revision.record_hash AS source_record_hash,
              manifest.payload AS manifest_payload,
              manifest.record_hash AS manifest_record_hash,
              artifact.payload AS artifact_payload,
              artifact.record_hash AS artifact_record_hash,
              rights.payload AS rights_payload,
              rights.record_hash AS rights_record_hash,
              version.payload AS version_payload,
              version.record_hash AS version_record_hash
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
           ON manifest.artifact_manifest_id = source_revision.artifact_manifest_id
         JOIN petra.artifacts AS artifact
           ON artifact.artifact_id = manifest.artifact_id
          AND artifact.content_hash = manifest.storage_content_hash
         JOIN petra.rights_decisions AS rights
           ON rights.rights_decision_id = manifest.rights_decision_id
         JOIN petra.canonical_entity_revisions AS version
           ON version.entity_id = source_revision.work_version_id
          AND version.entity_kind = 'work_version'
          AND version.revision = source_revision.work_version_revision
          AND version.record_hash = source_revision.work_version_record_hash
        WHERE project.project_id = $1
        ${lock ? "FOR SHARE OF project, project_revision, definition, definition_revision, source, source_revision, manifest, artifact, rights, version" : ""}`,
      [projectId, projectSourceId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const records: AuthorityRecords = {
      project: this.#record("project", "1.0.0", row.project_payload),
      projectRecordHash: row.project_record_hash,
      definition: this.#record(
        "project-definition",
        "1.0.0",
        row.definition_payload,
      ),
      definitionRecordHash: row.definition_record_hash,
      source: this.#record("project-source", "1.0.0", row.source_payload),
      sourceRecordHash: row.source_record_hash,
      manifest: this.#record(
        "artifact-manifest",
        "1.0.0",
        row.manifest_payload,
      ),
      manifestRecordHash: row.manifest_record_hash,
      artifact: this.#record("artifact", "1.0.0", row.artifact_payload),
      artifactRecordHash: row.artifact_record_hash,
      rights: this.#record("rights-decision", "1.0.0", row.rights_payload),
      rightsRecordHash: row.rights_record_hash,
      version: this.#record("work-version", "1.0.0", row.version_payload),
      versionRecordHash: row.version_record_hash,
    };
    if (
      canonicalHash(records.project) !== records.projectRecordHash ||
      canonicalHash(records.definition) !== records.definitionRecordHash ||
      canonicalHash(records.source) !== records.sourceRecordHash ||
      canonicalHash(records.manifest) !== records.manifestRecordHash ||
      canonicalHash(records.artifact) !== records.artifactRecordHash ||
      canonicalHash(records.rights) !== records.rightsRecordHash ||
      canonicalHash(records.version) !== records.versionRecordHash ||
      records.source.content.artifact_manifest_ref.artifact_manifest_id !==
        records.manifest.artifact_manifest_id ||
      records.manifest.artifact_id !== records.artifact.artifact_id ||
      records.manifest.rights_decision_id !==
        records.rights.rights_decision_id ||
      records.source.content.work_version_ref.work_version_id !==
        records.version.work_version_id
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_STORED_RECORD_CORRUPT",
        "The current ProjectSource processing authority chain is internally inconsistent.",
      );
    }
    return records;
  }

  async #byIdentity(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    commandId: string,
    idempotencyKey: string,
    lock = false,
  ): Promise<CommandRow[]> {
    const result = await queryable.query<CommandRow>(
      `SELECT state, command_id, idempotency_key, project_id,
              project_source_id, request_hash, request_payload,
              work_unit_payload, input_manifest_payload, actor_id, actor_kind,
              capability_grant_id, requested_at, receipt_payload,
              receipt_record_hash
         FROM petra.project_source_processing_commands
        WHERE command_id = $1 OR idempotency_key = $2
        ORDER BY command_id
        ${lock ? "FOR UPDATE" : ""}`,
      [commandId, idempotencyKey],
    );
    return result.rows;
  }

  #exactRow(
    rows: readonly CommandRow[],
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
    requestHash: string,
    principal: ProjectSourceProcessingPrincipal,
  ): CommandRow {
    const row = rows[0];
    if (
      rows.length !== 1 ||
      row === undefined ||
      row.command_id !== request.command_id ||
      row.idempotency_key !== request.idempotency_key ||
      row.project_id !== projectId ||
      row.project_source_id !== projectSourceId ||
      row.request_hash !== requestHash ||
      canonicalize(row.request_payload) !== canonicalize(request) ||
      !sameActor(row, principal.actor) ||
      row.capability_grant_id !== principal.capabilityGrantId
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_COMMAND_CONFLICT",
        "The command or idempotency identity is already bound to different source-processing input or authority.",
      );
    }
    return row;
  }

  #receipt(row: CommandRow): PetraProjectSourceProcessingReceipt {
    this.#contracts.assertValid(
      "project-source-processing-receipt",
      "1.0.0",
      row.receipt_payload,
    );
    const receipt = clone(
      row.receipt_payload as PetraProjectSourceProcessingReceipt,
    );
    const base = Object.fromEntries(
      Object.entries(receipt).filter(([key]) => key !== "record_hash"),
    );
    if (
      row.receipt_record_hash !== receipt.record_hash ||
      canonicalHash(base) !== receipt.record_hash
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_STORED_RECORD_CORRUPT",
        "The retained source-processing receipt failed exact hash validation.",
      );
    }
    return receipt;
  }

  #work(value: unknown): PetraWorkUnit {
    return this.#record("work-unit", "1.0.0", value);
  }

  #input(value: unknown): PetraWorkerInputManifest {
    return this.#record("worker-input-manifest", "1.0.0", value);
  }

  #record<Value>(name: string, version: string, value: unknown): Value {
    this.#contracts.assertValid(name, version, value);
    return clone(value as Value);
  }

  async #requiredView(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceProcessingView> {
    const view = await this.getProjectSourceProcessingView(
      projectId,
      projectSourceId,
    );
    if (view === undefined) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_STORED_RECORD_CORRUPT",
        "The completed source-processing command lost its exact source Details composition.",
      );
    }
    return view;
  }

  async #databaseTime(): Promise<string> {
    const result = await this.#pool.query<{ observed_at: Date }>(
      "SELECT CURRENT_TIMESTAMP AS observed_at",
    );
    const observedAt = result.rows[0]?.observed_at.toISOString();
    if (observedAt === undefined)
      throw new Error("PostgreSQL omitted read time.");
    return observedAt;
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
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
