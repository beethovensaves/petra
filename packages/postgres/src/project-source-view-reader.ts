import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraAuthor,
  PetraParsedDocument,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraProjectSourceView,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWork,
  PetraWorkVersion,
  ProjectSourceRepresentationSummary,
  ProjectSourceViewContent,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ProjectSourceViewReader } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectSourceViewErrorCode =
  | "PROJECT_SOURCE_VIEW_STORED_RECORD_CORRUPT"
  | "PROJECT_SOURCE_VIEW_DEFINITION_MISMATCH";

export class PostgresProjectSourceViewError extends Error {
  readonly code: PostgresProjectSourceViewErrorCode;

  constructor(code: PostgresProjectSourceViewErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectSourceViewError";
    this.code = code;
  }
}

interface SourceRow {
  project_source_id: string;
  source_payload: unknown;
  definition_payload: unknown;
  work_payload: unknown;
  work_record_hash: string;
  work_version_payload: unknown;
  work_version_record_hash: string;
  manifest_payload: unknown;
  manifest_record_hash: string;
  artifact_payload: unknown;
  rights_payload: unknown;
  rights_record_hash: string;
}

interface AuthorRow {
  payload: unknown;
  record_hash: string;
}

interface DocumentRow {
  payload: unknown;
  record_hash: string;
  block_count: string;
  span_count: string;
  claim_count: string;
  assertion_count: string;
}

interface PreviewRow {
  block_payload: unknown;
  block_record_hash: string;
  span_payload: unknown;
  span_record_hash: string;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

export class PostgresProjectSourceViewReader implements ProjectSourceViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async listProjectSourceViews(
    projectId: string,
  ): Promise<PetraProjectSourceView[]> {
    return this.#readTransaction(async (client, readAt) => {
      const rows = await this.#selectSourceRows(client, projectId);
      const views: PetraProjectSourceView[] = [];
      for (const row of rows)
        views.push(await this.#compose(client, row, readAt));
      return views;
    });
  }

  async getProjectSourceView(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceView | undefined> {
    return this.#readTransaction((client, readAt) =>
      this.readSourceInSnapshot(client, readAt, projectId, projectSourceId),
    );
  }

  /** Internal composition seam; caller owns a REPEATABLE READ READ ONLY transaction. */
  async readSourceInSnapshot(
    client: PoolClient,
    readAt: string,
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceView | undefined> {
    const rows = await this.#selectSourceRows(
      client,
      projectId,
      projectSourceId,
    );
    return rows[0] === undefined
      ? undefined
      : await this.#compose(client, rows[0], readAt);
  }

  async #selectSourceRows(
    client: PoolClient,
    projectId: string,
    projectSourceId?: string,
  ): Promise<SourceRow[]> {
    const result = await client.query<SourceRow>(
      `SELECT source.project_source_id,
              binding.payload AS source_payload,
              definition.payload AS definition_payload,
              work.payload AS work_payload,
              work.record_hash AS work_record_hash,
              version.payload AS work_version_payload,
              version.record_hash AS work_version_record_hash,
              manifest.payload AS manifest_payload,
              manifest.record_hash AS manifest_record_hash,
              artifact.payload AS artifact_payload,
              rights.payload AS rights_payload,
              rights.record_hash AS rights_record_hash
         FROM petra.project_sources AS source
         JOIN petra.project_source_revisions AS binding
           ON binding.project_source_id = source.project_source_id
          AND binding.revision = source.current_revision
         JOIN petra.project_definition_revisions AS definition
           ON definition.project_id = binding.project_id
          AND definition.project_definition_id = binding.project_definition_id
          AND definition.revision = binding.project_definition_revision
          AND definition.content_hash = binding.project_definition_content_hash
         JOIN petra.canonical_entity_revisions AS work
           ON work.entity_id = binding.work_id
          AND work.entity_kind = 'work'
          AND work.revision = binding.work_revision
          AND work.record_hash = binding.work_record_hash
         JOIN petra.canonical_entity_revisions AS version
           ON version.entity_id = binding.work_version_id
          AND version.entity_kind = 'work_version'
          AND version.revision = binding.work_version_revision
          AND version.record_hash = binding.work_version_record_hash
         JOIN petra.artifact_manifests AS manifest
           ON manifest.artifact_manifest_id = binding.artifact_manifest_id
          AND manifest.revision = binding.artifact_manifest_revision
          AND manifest.record_hash = binding.artifact_manifest_record_hash
         JOIN petra.artifacts AS artifact
           ON artifact.artifact_id = manifest.artifact_id
          AND artifact.content_hash = manifest.storage_content_hash
         JOIN petra.rights_decisions AS rights
           ON rights.rights_decision_id = manifest.rights_decision_id
          AND rights.artifact_manifest_id = manifest.artifact_manifest_id
        WHERE source.project_id = $1
          AND ($2::text IS NULL OR source.project_source_id = $2)
        ORDER BY binding.added_at, source.project_source_id`,
      [projectId, projectSourceId ?? null],
    );
    return result.rows;
  }

  async #compose(
    client: PoolClient,
    row: SourceRow,
    readAt: string,
  ): Promise<PetraProjectSourceView> {
    const source = this.#record<PetraProjectSource>(
      "project-source",
      row.source_payload,
    );
    const definition = this.#record<PetraProjectDefinition>(
      "project-definition",
      row.definition_payload,
    );
    const work = this.#record<PetraWork>("work", row.work_payload);
    const version = this.#record<PetraWorkVersion>(
      "work-version",
      row.work_version_payload,
    );
    const manifest = this.#record<PetraArtifactManifest>(
      "artifact-manifest",
      row.manifest_payload,
    );
    const artifact = this.#record<PetraArtifact>(
      "artifact",
      row.artifact_payload,
    );
    const rights = this.#record<PetraRightsDecision>(
      "rights-decision",
      row.rights_payload,
    );

    this.#assertSourceChain(
      source,
      definition,
      work,
      version,
      manifest,
      artifact,
      rights,
      row,
    );
    const authors = await this.#authors(client, source);
    const document = await this.#document(
      client,
      manifest.artifact_manifest_id,
    );
    const representation = await this.#representation(client, rights, document);
    const role = definition.content.terms.find(
      (term) => term.semantic_key === source.content.source_role,
    );
    if (role === undefined || role.generic_family !== "reference") {
      throw new PostgresProjectSourceViewError(
        "PROJECT_SOURCE_VIEW_DEFINITION_MISMATCH",
        "The bound source role has no reference term in its exact ProjectDefinition.",
      );
    }
    const authority = await this.#authorityPosition(client, source.project_id);
    const content: ProjectSourceViewContent = {
      binding: {
        binding_kind: source.content.binding_kind,
        revision: source.revision,
        content_hash: source.content_hash,
        project_definition_ref: {
          record_id: definition.project_definition_id,
          revision: definition.revision,
          content_hash: definition.content_hash,
        },
        source_role: source.content.source_role,
        source_role_label: role.singular,
        status: source.content.status,
        added_at: source.added_at,
      },
      identity: {
        work_ref: {
          record_id: work.work_id,
          revision: work.revision,
          content_hash: row.work_record_hash,
        },
        title: work.title,
        work_kind: work.work_kind,
        identity_status: work.identity_status,
        work_version_ref: {
          record_id: version.work_version_id,
          revision: version.revision,
          content_hash: row.work_version_record_hash,
        },
        version_label: version.version_label,
        publication_status: version.publication_status,
        ...(version.published_date === undefined
          ? {}
          : { published_date: clone(version.published_date) }),
        creators: authors,
      },
      copy: {
        manifest_ref: {
          record_id: manifest.artifact_manifest_id,
          revision: manifest.revision,
          content_hash: row.manifest_record_hash,
        },
        artifact_ref: {
          record_id: artifact.artifact_id,
          revision: artifact.revision,
          content_hash: artifact.content_hash,
        },
        artifact_kind: artifact.artifact_kind,
        media_type: artifact.media_type,
        byte_size: artifact.byte_size,
        origin_kind: manifest.origin.origin_kind,
        source_location: rights.source_location,
        ...(manifest.origin.origin_kind === "user_supplied"
          ? { original_filename: manifest.origin.original_filename }
          : {}),
        availability: manifest.storage_ref.availability,
        integrity_status: manifest.integrity.status,
        recorded_at: manifest.recorded_at,
      },
      rights: {
        rights_ref: {
          record_id: rights.rights_decision_id,
          revision: rights.revision,
          content_hash: row.rights_record_hash,
        },
        license_status: rights.license_status,
        license_label: this.#licenseLabel(rights),
        access_basis: rights.access_basis,
        decision_status: rights.decision_status,
        permissions: clone(rights.permissions),
        conditions: clone(rights.conditions),
        policy_version: rights.policy_version,
      },
      representation: representation.summary,
      downstream_use: {
        claim_count: representation.claimCount,
        assertion_count: representation.assertionCount,
      },
      authority,
    };
    const view: PetraProjectSourceView = {
      schema_name: "petra.project-source-view",
      schema_version: "1.0.0",
      project_id: source.project_id,
      project_source_id: source.project_source_id,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid("project-source-view", "1.0.0", view);
    return view;
  }

  #assertSourceChain(
    source: PetraProjectSource,
    definition: PetraProjectDefinition,
    work: PetraWork,
    version: PetraWorkVersion,
    manifest: PetraArtifactManifest,
    artifact: PetraArtifact,
    rights: PetraRightsDecision,
    row: SourceRow,
  ): void {
    const refs = source.content;
    if (
      source.project_source_id !== row.project_source_id ||
      source.content_hash !== canonicalHash(source.content) ||
      definition.project_id !== source.project_id ||
      definition.project_definition_id !==
        refs.project_definition_ref.project_definition_id ||
      definition.revision !== refs.project_definition_ref.revision ||
      definition.content_hash !== refs.project_definition_ref.content_hash ||
      definition.content_hash !== canonicalHash(definition.content) ||
      work.work_id !== refs.work_ref.work_id ||
      work.revision !== refs.work_ref.revision ||
      canonicalHash(work) !== refs.work_ref.record_hash ||
      version.work_version_id !== refs.work_version_ref.work_version_id ||
      version.revision !== refs.work_version_ref.revision ||
      version.work_id !== work.work_id ||
      canonicalHash(version) !== refs.work_version_ref.record_hash ||
      manifest.artifact_manifest_id !==
        refs.artifact_manifest_ref.artifact_manifest_id ||
      canonicalHash(manifest) !== refs.artifact_manifest_ref.record_hash ||
      manifest.artifact_id !== artifact.artifact_id ||
      manifest.storage_ref.content_hash !== artifact.content_hash ||
      manifest.rights_decision_id !== rights.rights_decision_id ||
      rights.artifact_manifest_id !== manifest.artifact_manifest_id ||
      canonicalHash(rights) !== row.rights_record_hash
    ) {
      throw new PostgresProjectSourceViewError(
        "PROJECT_SOURCE_VIEW_STORED_RECORD_CORRUPT",
        "The ProjectSource authority chain does not resolve to its exact bound records.",
      );
    }
  }

  async #authors(
    client: PoolClient,
    source: PetraProjectSource,
  ): Promise<ProjectSourceViewContent["identity"]["creators"]> {
    const result = await client.query<AuthorRow>(
      `SELECT author.payload, author.record_hash
         FROM petra.project_source_author_refs AS ref
         JOIN petra.canonical_entity_revisions AS author
           ON author.entity_id = ref.author_id
          AND author.entity_kind = 'author'
          AND author.revision = ref.author_revision
          AND author.record_hash = ref.author_record_hash
        WHERE ref.project_source_id = $1
          AND ref.project_source_revision = $2
        ORDER BY ref.position`,
      [source.project_source_id, source.revision],
    );
    if (result.rows.length !== source.content.author_refs.length) {
      throw new PostgresProjectSourceViewError(
        "PROJECT_SOURCE_VIEW_STORED_RECORD_CORRUPT",
        "The ProjectSource author binding is incomplete.",
      );
    }
    return result.rows.map((row, index) => {
      const author = this.#record<PetraAuthor>("author", row.payload);
      const expected = source.content.author_refs[index];
      if (
        expected === undefined ||
        author.author_id !== expected.author_id ||
        author.revision !== expected.revision ||
        row.record_hash !== expected.record_hash ||
        canonicalHash(author) !== expected.record_hash
      ) {
        throw new PostgresProjectSourceViewError(
          "PROJECT_SOURCE_VIEW_STORED_RECORD_CORRUPT",
          "The ProjectSource author binding does not resolve exactly.",
        );
      }
      return {
        author_ref: {
          record_id: author.author_id,
          revision: author.revision,
          content_hash: row.record_hash,
        },
        display_name: author.display_name,
        author_kind: author.author_kind,
        identity_status: author.identity_status,
      };
    }) as ProjectSourceViewContent["identity"]["creators"];
  }

  async #document(
    client: PoolClient,
    artifactManifestId: string,
  ): Promise<DocumentRow | undefined> {
    const result = await client.query<DocumentRow>(
      `SELECT document.payload,
              document.record_hash,
              (SELECT count(*) FROM petra.structural_blocks AS block
                WHERE block.parsed_document_id = document.parsed_document_id)::text
                AS block_count,
              (SELECT count(*) FROM petra.source_spans AS span
                WHERE span.parsed_document_id = document.parsed_document_id)::text
                AS span_count,
              (SELECT count(DISTINCT claim.claim_id)
                 FROM petra.source_spans AS span
                 JOIN petra.claim_source_spans AS claim
                   ON claim.source_span_id = span.source_span_id
                WHERE span.parsed_document_id = document.parsed_document_id)::text
                AS claim_count,
              (SELECT count(DISTINCT assertion.assertion_id)
                 FROM petra.source_spans AS span
                 JOIN petra.assertion_provenance AS assertion
                   ON assertion.source_span_id = span.source_span_id
                WHERE span.parsed_document_id = document.parsed_document_id)::text
                AS assertion_count
         FROM petra.parsed_documents AS document
        WHERE document.source_artifact_manifest_id = $1
        ORDER BY document.created_at DESC, document.parsed_document_id DESC
        LIMIT 1`,
      [artifactManifestId],
    );
    return result.rows[0];
  }

  async #representation(
    client: PoolClient,
    rights: PetraRightsDecision,
    row: DocumentRow | undefined,
  ): Promise<{
    summary: ProjectSourceRepresentationSummary;
    claimCount: number;
    assertionCount: number;
  }> {
    if (row === undefined) {
      return {
        summary: {
          extent: rights.permissions.parse ? "identity_only" : "restricted",
          extent_label: rights.permissions.parse
            ? "Identity and verified copy only"
            : "Processing restricted",
          page_count: 0,
          block_count: 0,
          source_span_count: 0,
        },
        claimCount: 0,
        assertionCount: 0,
      };
    }
    const document = this.#record<PetraParsedDocument>(
      "parsed-document",
      row.payload,
    );
    if (canonicalHash(document) !== row.record_hash) {
      throw new PostgresProjectSourceViewError(
        "PROJECT_SOURCE_VIEW_STORED_RECORD_CORRUPT",
        "The selected ParsedDocument record hash is invalid.",
      );
    }
    const preview = await this.#preview(client, document.parsed_document_id);
    const complete = document.quality_state === "complete";
    return {
      summary: {
        extent: complete ? "complete" : "partial",
        extent_label: complete
          ? "Complete parsed representation"
          : `Parsed representation · ${document.quality_state.replace("_", " ")}`,
        document_ref: {
          record_id: document.parsed_document_id,
          revision: document.revision,
          content_hash: row.record_hash,
        },
        source_format: document.source_format,
        ...(document.document_language === undefined
          ? {}
          : { document_language: document.document_language }),
        quality_state: document.quality_state,
        page_count: document.pages.length,
        block_count: Number(row.block_count),
        source_span_count: Number(row.span_count),
        ...(preview === undefined ? {} : { preview }),
      },
      claimCount: Number(row.claim_count),
      assertionCount: Number(row.assertion_count),
    };
  }

  async #preview(
    client: PoolClient,
    parsedDocumentId: string,
  ): Promise<ProjectSourceRepresentationSummary["preview"]> {
    const result = await client.query<PreviewRow>(
      `SELECT block.payload AS block_payload,
              block.record_hash AS block_record_hash,
              span.payload AS span_payload,
              span.record_hash AS span_record_hash
         FROM petra.parsed_document_block_declarations AS declaration
         JOIN petra.structural_blocks AS block
           ON block.parsed_document_id = declaration.parsed_document_id
          AND block.structural_block_id = declaration.structural_block_id
         JOIN petra.structural_block_span_declarations AS span_declaration
           ON span_declaration.parsed_document_id = block.parsed_document_id
          AND span_declaration.structural_block_id = block.structural_block_id
         JOIN petra.source_spans AS span
           ON span.source_span_id = span_declaration.source_span_id
        WHERE declaration.parsed_document_id = $1
          AND block.content_kind = 'text'
        ORDER BY declaration.reading_order, span_declaration.position
        LIMIT 1`,
      [parsedDocumentId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const block = this.#record<PetraStructuralBlock>(
      "structural-block",
      row.block_payload,
    );
    const span = this.#record<PetraSourceSpan>("source-span", row.span_payload);
    if (
      block.content.content_kind !== "text" ||
      canonicalHash(block) !== row.block_record_hash ||
      canonicalHash(span) !== row.span_record_hash
    ) {
      throw new PostgresProjectSourceViewError(
        "PROJECT_SOURCE_VIEW_STORED_RECORD_CORRUPT",
        "The selected source preview does not resolve exactly.",
      );
    }
    const page = block.page_locations[0]?.page_number;
    const heading = block.structural_path.join(" / ");
    return {
      span_ref: {
        record_id: span.source_span_id,
        revision: span.revision,
        content_hash: row.span_record_hash,
      },
      structural_block_ref: {
        record_id: block.structural_block_id,
        revision: block.revision,
        content_hash: row.block_record_hash,
      },
      heading,
      locator: `${page === undefined ? "Location unavailable" : `Page ${page}`} · ${heading}`,
      text: block.content.text,
      verification_status: span.verification.status,
    };
  }

  async #authorityPosition(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectSourceViewContent["authority"]> {
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
      throw new PostgresProjectSourceViewError(
        "PROJECT_SOURCE_VIEW_STORED_RECORD_CORRUPT",
        "The PostgreSQL authority position is unavailable.",
      );
    }
    return {
      isolation: "repeatable_read",
      event_position: Number(row.event_position),
      stream_revision: Number(row.stream_revision ?? 0),
    };
  }

  #licenseLabel(rights: PetraRightsDecision): string {
    return (
      rights.observed_license?.identifier ??
      rights.observed_license?.statement ??
      (rights.license_status === "restricted"
        ? "Restricted"
        : rights.license_status === "unknown"
          ? "Unknown license"
          : "Known license")
    );
  }

  #record<Value>(name: string, payload: unknown): Value {
    this.#contracts.assertValid(name, "1.0.0", payload);
    return clone(payload as Value);
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
      if (readAt === undefined)
        throw new Error("PostgreSQL did not provide a read timestamp.");
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
