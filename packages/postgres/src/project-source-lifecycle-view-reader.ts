import { createHash } from "node:crypto";

import type {
  PetraArtifactManifest,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraProjectSourceLinkRemovalPreview,
  PetraProjectSourceLifecycleView,
  ProjectSourceLifecycleContent,
  ProjectSourceLifecycleDependentRef,
  ProjectSourceLifecycleImpactGroup,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { ProjectSourceLinkRemovalError } from "@petra/core";
import type {
  ProjectSourceLifecycleAction,
  ProjectSourceLinkRemovalPreviewReader,
  ProjectSourceLifecycleViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectSourceLifecycleViewErrorCode =
  | "PROJECT_SOURCE_LIFECYCLE_VIEW_REQUEST_INVALID"
  | "PROJECT_SOURCE_LIFECYCLE_VIEW_STORED_RECORD_CORRUPT";

export class PostgresProjectSourceLifecycleViewError extends Error {
  readonly code: PostgresProjectSourceLifecycleViewErrorCode;

  constructor(
    code: PostgresProjectSourceLifecycleViewErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PostgresProjectSourceLifecycleViewError";
    this.code = code;
  }
}

interface SourceRow {
  payload: unknown;
  record_hash: string;
}

interface DependentRow {
  record_id: string;
  revision: string;
  record_hash: string;
  payload: unknown;
  posture: "current" | "historical";
  total_count: string;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

interface ManifestRow {
  artifact_id: string;
  payload: unknown;
  record_hash: string;
}

type GroupKind = ProjectSourceLifecycleImpactGroup["group_kind"];
type RecordKind = ProjectSourceLifecycleDependentRef["record_kind"];

const PROJECT_SOURCE_ID = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;
const ACTIONS: readonly ProjectSourceLifecycleAction[] = [
  "exclude_project_source",
  "restore_project_source",
  "delete_local_copy",
];
const MAX_REFS = 100;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

/**
 * Exact, repeatable-read impact preview for the ProjectSource lifecycle.
 * This reader does not authorize or execute lifecycle changes.
 */
export class PostgresProjectSourceLifecycleViewReader
  implements
    ProjectSourceLifecycleViewReader,
    ProjectSourceLinkRemovalPreviewReader
{
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async getProjectSourceLifecycleView(
    projectId: string,
    projectSourceId: string,
    requestedAction: ProjectSourceLifecycleAction,
  ): Promise<PetraProjectSourceLifecycleView | undefined> {
    if (
      !PROJECT_SOURCE_ID.test(projectSourceId) ||
      !ACTIONS.includes(requestedAction)
    ) {
      throw new PostgresProjectSourceLifecycleViewError(
        "PROJECT_SOURCE_LIFECYCLE_VIEW_REQUEST_INVALID",
        "A lifecycle preview requires a canonical ProjectSource id and supported action.",
      );
    }

    return this.#readTransaction(async (client, readAt) => {
      const stored = await this.#source(client, projectId, projectSourceId);
      if (stored === undefined) return undefined;
      const source = this.#record<PetraProjectSource>(
        "project-source",
        stored.payload,
        stored.record_hash,
        "project_source_id",
        projectSourceId,
      );
      if (
        source.project_id !== projectId ||
        source.content_hash !== canonicalHash(source.content)
      ) {
        throw this.#corrupt(
          "The current ProjectSource revision does not match its Project or content hash.",
        );
      }

      const content: ProjectSourceLifecycleContent = {
        requested_action: requestedAction,
        source_ref: {
          project_source_id: source.project_source_id,
          revision: source.revision,
          content_hash: source.content_hash,
          record_hash: stored.record_hash,
          status: source.content.status,
        },
        transition: this.#transition(requestedAction, source.content.status),
        impact: {
          scope: "registered_direct_and_scientific_downstream",
          groups: await this.#impactGroups(client, source),
          limitations: [
            "The initial preview follows direct parsed representation, scientific Claim and Assertion grounding, direct Artifact Work inputs, open Review membership, and GroundedResponse dependencies.",
            "It does not infer transitive profile-specific dependencies that lack a registered ProjectSource lifecycle adapter.",
          ],
        },
        retention: this.#retention(),
        operation: {
          state: "unavailable",
          reason:
            "ProjectSource lifecycle commands and their Project event receipts are not registered in this read-only preview slice.",
        },
        authority: await this.#authority(client, projectId),
      };
      const view: PetraProjectSourceLifecycleView = {
        schema_name: "petra.project-source-lifecycle-view",
        schema_version: "1.0.0",
        project_id: projectId,
        project_source_id: projectSourceId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid(
        "project-source-lifecycle-view",
        "1.0.0",
        view,
      );
      return view;
    });
  }

  async getProjectSourceLinkRemovalPreview(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceLinkRemovalPreview | undefined> {
    if (!PROJECT_SOURCE_ID.test(projectSourceId)) {
      throw new PostgresProjectSourceLifecycleViewError(
        "PROJECT_SOURCE_LIFECYCLE_VIEW_REQUEST_INVALID",
        "A link-removal preview requires a canonical ProjectSource identity.",
      );
    }
    return this.#readTransaction(async (client, readAt) => {
      const stored = await this.#source(client, projectId, projectSourceId);
      if (stored === undefined) return undefined;
      const source = this.#record<PetraProjectSource>(
        "project-source",
        stored.payload,
        stored.record_hash,
        "project_source_id",
        projectSourceId,
      );
      if (
        source.project_id !== projectId ||
        source.content_hash !== canonicalHash(source.content) ||
        source.content.status !== "active"
      ) {
        throw new ProjectSourceLinkRemovalError(
          "PROJECT_SOURCE_LINK_REMOVAL_SOURCE_STALE",
          "Project-link removal requires the exact current active ProjectSource.",
        );
      }
      const context = await client.query<{
        project_payload: unknown;
        project_record_hash: string;
        definition_payload: unknown;
        definition_record_hash: string;
      }>(
        `SELECT project_revision.payload AS project_payload,
                project_revision.record_hash AS project_record_hash,
                definition_revision.payload AS definition_payload,
                definition_revision.record_hash AS definition_record_hash
           FROM petra.projects AS project
           JOIN petra.project_revisions AS project_revision
             ON project_revision.project_id = project.project_id
            AND project_revision.revision = project.current_revision
           JOIN petra.project_definitions AS definition
             ON definition.project_id = project.project_id
           JOIN petra.project_definition_revisions AS definition_revision
             ON definition_revision.project_definition_id =
                definition.project_definition_id
            AND definition_revision.revision = definition.current_revision
          WHERE project.project_id = $1`,
        [projectId],
      );
      const row = context.rows[0];
      if (row === undefined) {
        throw this.#corrupt(
          "The Project or current ProjectDefinition is unavailable for link removal.",
        );
      }
      const project = this.#record<PetraProject>(
        "project",
        row.project_payload,
        row.project_record_hash,
        "project_id",
        projectId,
      );
      const definitionPayload = row.definition_payload as {
        project_definition_id?: unknown;
      };
      const definitionId = definitionPayload.project_definition_id;
      if (typeof definitionId !== "string") {
        throw this.#corrupt(
          "The current ProjectDefinition has no canonical identity.",
        );
      }
      const definition = this.#record<PetraProjectDefinition>(
        "project-definition",
        row.definition_payload,
        row.definition_record_hash,
        "project_definition_id",
        definitionId,
      );
      if (project.status !== "active" || definition.project_id !== projectId) {
        throw new ProjectSourceLinkRemovalError(
          "PROJECT_SOURCE_LINK_REMOVAL_PROJECT_STALE",
          "Project-link removal requires one active Project and its current ProjectDefinition.",
        );
      }
      const transition = this.#transition(
        "exclude_project_source",
        source.content.status,
      );
      if (transition.state !== "preview_available") {
        throw this.#corrupt(
          "An active ProjectSource did not produce an exclusion preview.",
        );
      }
      const expected = {
        project_ref: {
          project_id: project.project_id,
          revision: project.revision,
          record_hash: row.project_record_hash,
        },
        project_definition_ref: {
          project_definition_id: definition.project_definition_id,
          revision: definition.revision,
          content_hash: definition.content_hash,
          record_hash: row.definition_record_hash,
        },
        current_source_ref: {
          project_source_id: source.project_source_id,
          revision: source.revision,
          content_hash: source.content_hash,
          record_hash: stored.record_hash,
          status: "active" as const,
        },
      };
      const hashed = {
        project_id: projectId,
        project_source_id: projectSourceId,
        expected,
        transition,
        impact: {
          scope: "registered_direct_and_scientific_downstream" as const,
          groups: await this.#impactGroups(client, source),
          limitations: [
            "The preview covers registered direct and scientific downstream dependencies; unregistered profile-specific transitive dependencies are not inferred.",
          ] as [string],
        },
        retention: this.#retention(),
        operation: {
          state: "ready" as const,
          command_name: "ExcludeProjectSource" as const,
          method: "POST" as const,
          path: `/api/commands/projects/${projectId}/sources/${projectSourceId}/link-removal`,
          recovery_path: `/api/queries/projects/${projectId}/sources/${projectSourceId}/link-removal-recovery`,
          separate_local_copy_deletion: true as const,
        },
        read_at: readAt,
      };
      const preview: PetraProjectSourceLinkRemovalPreview = {
        schema_name: "petra.project-source-link-removal-preview",
        schema_version: "1.0.0",
        ...hashed,
        content_hash: canonicalHash(hashed),
      };
      this.#contracts.assertValid(
        "project-source-link-removal-preview",
        "1.0.0",
        preview,
      );
      return clone(preview);
    });
  }

  async #source(
    client: PoolClient,
    projectId: string,
    projectSourceId: string,
  ): Promise<SourceRow | undefined> {
    const result = await client.query<SourceRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.project_sources AS source
         JOIN petra.project_source_revisions AS revision
           ON revision.project_source_id = source.project_source_id
          AND revision.revision = source.current_revision
        WHERE source.project_id = $1
          AND source.project_source_id = $2`,
      [projectId, projectSourceId],
    );
    return result.rows[0];
  }

  async #impactGroups(
    client: PoolClient,
    source: PetraProjectSource,
  ): Promise<ProjectSourceLifecycleContent["impact"]["groups"]> {
    const manifestId =
      source.content.artifact_manifest_ref.artifact_manifest_id;
    const artifactResult = await client.query<ManifestRow>(
      `SELECT artifact_id, payload, record_hash
         FROM petra.artifact_manifests
        WHERE artifact_manifest_id = $1
          AND revision = $2
          AND record_hash = $3`,
      [
        manifestId,
        source.content.artifact_manifest_ref.revision,
        source.content.artifact_manifest_ref.record_hash,
      ],
    );
    const manifestRow = artifactResult.rows[0];
    if (manifestRow === undefined) {
      throw this.#corrupt(
        "The ProjectSource exact ArtifactManifest binding is unavailable.",
      );
    }
    const manifest = this.#record<PetraArtifactManifest>(
      "artifact-manifest",
      manifestRow.payload,
      manifestRow.record_hash,
      "artifact_manifest_id",
      manifestId,
    );
    if (manifest.artifact_id !== manifestRow.artifact_id) {
      throw this.#corrupt(
        "The exact ArtifactManifest payload does not match its bound Artifact.",
      );
    }
    const artifactId = manifest.artifact_id;

    return [
      await this.#group(
        client,
        "parsed_documents",
        "parsed_document",
        "parsed-document",
        "parsed_document_id",
        `SELECT document.parsed_document_id AS record_id,
                document.revision::text,
                document.record_hash,
                document.payload,
                'current'::text AS posture,
                count(*) OVER ()::text AS total_count
           FROM petra.parsed_documents AS document
          WHERE document.source_artifact_manifest_id = $1
          ORDER BY document.created_at, document.parsed_document_id
          LIMIT ${MAX_REFS}`,
        [manifestId],
      ),
      await this.#group(
        client,
        "structural_blocks",
        "structural_block",
        "structural-block",
        "structural_block_id",
        `SELECT block.structural_block_id AS record_id,
                block.revision::text,
                block.record_hash,
                block.payload,
                'current'::text AS posture,
                count(*) OVER ()::text AS total_count
           FROM petra.structural_blocks AS block
           JOIN petra.parsed_documents AS document
             ON document.parsed_document_id = block.parsed_document_id
          WHERE document.source_artifact_manifest_id = $1
          ORDER BY block.parsed_document_id, block.reading_order,
                   block.structural_block_id
          LIMIT ${MAX_REFS}`,
        [manifestId],
      ),
      await this.#group(
        client,
        "source_spans",
        "source_span",
        "source-span",
        "source_span_id",
        `SELECT span.source_span_id AS record_id,
                span.revision::text,
                span.record_hash,
                span.payload,
                'current'::text AS posture,
                count(*) OVER ()::text AS total_count
           FROM petra.source_spans AS span
           JOIN petra.parsed_documents AS document
             ON document.parsed_document_id = span.parsed_document_id
          WHERE document.source_artifact_manifest_id = $1
          ORDER BY span.parsed_document_id, span.structural_block_id,
                   span.source_span_id
          LIMIT ${MAX_REFS}`,
        [manifestId],
      ),
      await this.#group(
        client,
        "claims",
        "claim",
        "claim",
        "claim_id",
        `WITH matched AS (
           SELECT DISTINCT revision.evidence_id AS record_id,
                  revision.revision,
                  revision.record_hash,
                  revision.payload,
                  CASE WHEN head.current_revision = revision.revision
                    THEN 'current' ELSE 'historical' END AS posture
             FROM petra.claim_source_spans AS binding
             JOIN petra.source_spans AS span
               ON span.source_span_id = binding.source_span_id
             JOIN petra.parsed_documents AS document
               ON document.parsed_document_id = span.parsed_document_id
             JOIN petra.evidence_entity_revisions AS revision
               ON revision.evidence_id = binding.claim_id
              AND revision.evidence_kind = 'claim'
              AND revision.revision = binding.claim_revision
             JOIN petra.evidence_entities AS head
               ON head.evidence_id = revision.evidence_id
              AND head.evidence_kind = revision.evidence_kind
            WHERE document.source_artifact_manifest_id = $1
         )
         SELECT record_id, revision::text, record_hash, payload, posture,
                count(*) OVER ()::text AS total_count
           FROM matched
          ORDER BY record_id, revision
          LIMIT ${MAX_REFS}`,
        [manifestId],
      ),
      await this.#group(
        client,
        "assertions",
        "assertion",
        "assertion",
        "assertion_id",
        `WITH matched AS (
           SELECT DISTINCT revision.evidence_id AS record_id,
                  revision.revision,
                  revision.record_hash,
                  revision.payload,
                  CASE WHEN head.current_revision = revision.revision
                    THEN 'current' ELSE 'historical' END AS posture
             FROM petra.assertion_provenance AS binding
             JOIN petra.source_spans AS span
               ON span.source_span_id = binding.source_span_id
             JOIN petra.parsed_documents AS document
               ON document.parsed_document_id = span.parsed_document_id
             JOIN petra.evidence_entity_revisions AS revision
               ON revision.evidence_id = binding.assertion_id
              AND revision.evidence_kind = 'assertion'
              AND revision.revision = binding.assertion_revision
             JOIN petra.evidence_entities AS head
               ON head.evidence_id = revision.evidence_id
              AND head.evidence_kind = revision.evidence_kind
            WHERE document.source_artifact_manifest_id = $1
              AND binding.provenance_kind = 'source_span'
         )
         SELECT record_id, revision::text, record_hash, payload, posture,
                count(*) OVER ()::text AS total_count
           FROM matched
          ORDER BY record_id, revision
          LIMIT ${MAX_REFS}`,
        [manifestId],
      ),
      await this.#group(
        client,
        "active_work",
        "work_unit",
        "work-unit",
        "work_unit_id",
        `WITH matched AS (
           SELECT DISTINCT revision.work_unit_id AS record_id,
                  revision.revision,
                  revision.record_hash,
                  revision.payload,
                  'current'::text AS posture
             FROM petra.worker_input_bindings AS binding
             JOIN petra.worker_input_manifests AS input
               ON input.worker_input_manifest_id = binding.worker_input_manifest_id
             JOIN petra.work_units AS head
               ON head.work_unit_id = input.work_unit_id
             JOIN petra.work_unit_revisions AS revision
               ON revision.work_unit_id = head.work_unit_id
              AND revision.revision = head.current_revision
            WHERE input.project_id = $1
              AND binding.binding_kind = 'artifact'
              AND binding.artifact_id = $2
              AND revision.state IN ('requested', 'queued', 'running')
         )
         SELECT record_id, revision::text, record_hash, payload, posture,
                count(*) OVER ()::text AS total_count
           FROM matched
          ORDER BY record_id
          LIMIT ${MAX_REFS}`,
        [source.project_id, artifactId],
      ),
      await this.#group(
        client,
        "open_reviews",
        "review_session",
        "review-session",
        "review_session_id",
        `WITH source_evidence AS (
           SELECT DISTINCT binding.claim_id AS evidence_id,
                  binding.claim_revision AS evidence_revision
             FROM petra.claim_source_spans AS binding
             JOIN petra.source_spans AS span
               ON span.source_span_id = binding.source_span_id
             JOIN petra.parsed_documents AS document
               ON document.parsed_document_id = span.parsed_document_id
            WHERE document.source_artifact_manifest_id = $2
           UNION
           SELECT DISTINCT binding.assertion_id AS evidence_id,
                  binding.assertion_revision AS evidence_revision
             FROM petra.assertion_provenance AS binding
             JOIN petra.source_spans AS span
               ON span.source_span_id = binding.source_span_id
             JOIN petra.parsed_documents AS document
               ON document.parsed_document_id = span.parsed_document_id
            WHERE document.source_artifact_manifest_id = $2
              AND binding.provenance_kind = 'source_span'
         ), matched AS (
           SELECT DISTINCT revision.review_session_id AS record_id,
                  revision.revision,
                  revision.record_hash,
                  revision.payload,
                  'current'::text AS posture
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
            WHERE head.project_id = $1
              AND revision.lifecycle = 'open'
         )
         SELECT record_id, revision::text, record_hash, payload, posture,
                count(*) OVER ()::text AS total_count
           FROM matched
          ORDER BY record_id
          LIMIT ${MAX_REFS}`,
        [source.project_id, manifestId],
      ),
      await this.#group(
        client,
        "grounded_responses",
        "grounded_response",
        "grounded-response",
        "grounded_response_id",
        `WITH source_objects AS (
           SELECT 'source_span'::text AS object_kind,
                  span.source_span_id AS object_id,
                  span.revision AS object_revision,
                  span.record_hash AS object_hash
             FROM petra.source_spans AS span
             JOIN petra.parsed_documents AS document
               ON document.parsed_document_id = span.parsed_document_id
            WHERE document.source_artifact_manifest_id = $2
           UNION
           SELECT 'claim', revision.evidence_id, revision.revision,
                  revision.record_hash
             FROM petra.claim_source_spans AS binding
             JOIN petra.source_spans AS span
               ON span.source_span_id = binding.source_span_id
             JOIN petra.parsed_documents AS document
               ON document.parsed_document_id = span.parsed_document_id
             JOIN petra.evidence_entity_revisions AS revision
               ON revision.evidence_id = binding.claim_id
              AND revision.evidence_kind = 'claim'
              AND revision.revision = binding.claim_revision
            WHERE document.source_artifact_manifest_id = $2
           UNION
           SELECT 'assertion', revision.evidence_id, revision.revision,
                  revision.record_hash
             FROM petra.assertion_provenance AS binding
             JOIN petra.source_spans AS span
               ON span.source_span_id = binding.source_span_id
             JOIN petra.parsed_documents AS document
               ON document.parsed_document_id = span.parsed_document_id
             JOIN petra.evidence_entity_revisions AS revision
               ON revision.evidence_id = binding.assertion_id
              AND revision.evidence_kind = 'assertion'
              AND revision.revision = binding.assertion_revision
            WHERE document.source_artifact_manifest_id = $2
              AND binding.provenance_kind = 'source_span'
           UNION
           SELECT 'work_version', $3::text, $4::bigint, $5::text
         ), matched AS (
           SELECT DISTINCT revision.grounded_response_id AS record_id,
                  revision.revision,
                  revision.record_hash,
                  revision.payload,
                  CASE WHEN head.current_revision = revision.revision
                    THEN 'current' ELSE 'historical' END AS posture
             FROM petra.grounded_response_dependencies AS dependency
             JOIN source_objects AS object
               ON object.object_kind = dependency.object_kind
              AND object.object_id = dependency.object_id
              AND object.object_revision = dependency.object_revision
              AND object.object_hash = dependency.object_hash
             JOIN petra.grounded_response_revisions AS revision
               ON revision.grounded_response_id = dependency.grounded_response_id
              AND revision.revision = dependency.response_revision
             JOIN petra.grounded_responses AS head
               ON head.grounded_response_id = revision.grounded_response_id
            WHERE revision.project_id = $1
         )
         SELECT record_id, revision::text, record_hash, payload, posture,
                count(*) OVER ()::text AS total_count
           FROM matched
          ORDER BY record_id, revision
          LIMIT ${MAX_REFS}`,
        [
          source.project_id,
          manifestId,
          source.content.work_version_ref.work_version_id,
          source.content.work_version_ref.revision,
          source.content.work_version_ref.record_hash,
        ],
      ),
    ];
  }

  async #group(
    client: PoolClient,
    groupKind: GroupKind,
    recordKind: RecordKind,
    contractName: string,
    idField: string,
    query: string,
    parameters: unknown[],
  ): Promise<ProjectSourceLifecycleImpactGroup> {
    const result = await client.query<DependentRow>(query, parameters);
    const refs = result.rows.map((row) => {
      const revision = this.#safePosition(
        row.revision,
        `${recordKind} revision`,
      );
      const payload = this.#record<Record<string, unknown>>(
        contractName,
        row.payload,
        row.record_hash,
        idField,
        row.record_id,
      );
      if (payload.revision !== revision) {
        throw this.#corrupt(
          `The ${recordKind} row does not match its stored revision.`,
        );
      }
      return {
        record_kind: recordKind,
        record_id: row.record_id,
        revision,
        record_hash: row.record_hash,
        posture: row.posture,
        effect: "retained" as const,
      };
    });
    const totalCount =
      result.rows[0] === undefined
        ? 0
        : this.#safePosition(
            result.rows[0].total_count,
            `${groupKind} total count`,
          );
    return {
      group_kind: groupKind,
      total_count: totalCount,
      returned_count: refs.length,
      coverage: totalCount > refs.length ? "truncated" : "complete",
      refs,
      effect: "retained",
    };
  }

  #transition(
    action: ProjectSourceLifecycleAction,
    status: PetraProjectSource["content"]["status"],
  ): ProjectSourceLifecycleContent["transition"] {
    if (action === "delete_local_copy") {
      return {
        state: "unavailable",
        reason:
          "Local-copy deletion is not executed by the general ProjectSource status lifecycle route; use the dedicated exact-copy retention preview and command.",
      };
    }
    if (action === "exclude_project_source") {
      return status === "excluded"
        ? {
            state: "not_applicable",
            current_status: status,
            reason: "The ProjectSource is already excluded.",
          }
        : {
            state: "preview_available",
            from_status: status,
            to_status: "excluded",
            effect: "ordinary_new_use_disabled",
            reason:
              "Exclusion would end ordinary new Project use under this source binding while retaining its exact history and dependencies.",
          };
    }
    return status === "active"
      ? {
          state: "not_applicable",
          current_status: status,
          reason: "The ProjectSource is already active.",
        }
      : {
          state: "preview_available",
          from_status: status,
          to_status: "active",
          effect: "ordinary_new_use_restored",
          reason:
            "Restoration would permit ordinary new Project use under the existing exact source binding.",
        };
  }

  #retention(): ProjectSourceLifecycleContent["retention"] {
    return [
      {
        area: "project_source_history",
        state: "retained",
        reason: "Every immutable ProjectSource revision remains addressable.",
      },
      {
        area: "canonical_identity",
        state: "retained",
        reason: "The canonical Work identity remains unchanged.",
      },
      {
        area: "selected_work_version",
        state: "retained",
        reason: "The exact selected WorkVersion remains unchanged.",
      },
      {
        area: "artifact_manifest",
        state: "retained",
        reason:
          "The exact ArtifactManifest and rights lineage remain unchanged.",
      },
      {
        area: "local_artifact",
        state: "deletion_unavailable",
        reason:
          "This status-lifecycle view does not authorize deletion; the dedicated exact-copy preview owns retention eligibility and deletion recovery.",
      },
      {
        area: "parsed_representation",
        state: "retained",
        reason:
          "ParsedDocument, StructuralBlock, and SourceSpan records remain unchanged.",
      },
      {
        area: "provenance",
        state: "retained",
        reason:
          "Existing scientific provenance and downstream authority remain inspectable.",
      },
    ];
  }

  async #authority(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectSourceLifecycleContent["authority"]> {
    const result = await client.query<AuthorityRow>(
      `SELECT authority.event_position,
              stream.current_stream_revision AS stream_revision
         FROM petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = $1
        WHERE authority.singleton`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt("The PostgreSQL authority position is unavailable.");
    }
    return {
      isolation: "repeatable_read",
      event_position: this.#safePosition(row.event_position, "event position"),
      stream_revision: this.#safePosition(
        row.stream_revision ?? "0",
        "Project stream revision",
      ),
    };
  }

  #record<Value>(
    contractName: string,
    payload: unknown,
    recordHash: string,
    idField: string,
    recordId: string,
  ): Value {
    this.#contracts.assertValid(contractName, "1.0.0", payload);
    const record = clone(payload as Record<string, unknown>);
    if (record[idField] !== recordId || canonicalHash(record) !== recordHash) {
      throw this.#corrupt(
        `The stored ${contractName} record does not match its exact identity.`,
      );
    }
    return record as Value;
  }

  #safePosition(value: string, label: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw this.#corrupt(`${label} is outside Petra's safe range.`);
    }
    return parsed;
  }

  #corrupt(message: string): PostgresProjectSourceLifecycleViewError {
    return new PostgresProjectSourceLifecycleViewError(
      "PROJECT_SOURCE_LIFECYCLE_VIEW_STORED_RECORD_CORRUPT",
      message,
    );
  }

  async #readTransaction<Value>(
    operation: (client: PoolClient, readAt: string) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const timestamp = await client.query<{ read_at: Date }>(
        "SELECT transaction_timestamp() AS read_at",
      );
      const readAt = timestamp.rows[0]?.read_at.toISOString();
      if (readAt === undefined) {
        throw this.#corrupt("The transaction timestamp is unavailable.");
      }
      const result = await operation(client, readAt);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
