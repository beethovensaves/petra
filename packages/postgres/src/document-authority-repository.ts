import { createHash } from "node:crypto";

import type {
  ActorRef,
  JsonPointer,
  LineRange,
  PageRegion,
  PetraArtifact,
  PetraParsedDocument,
  PetraSourceSpan,
  PetraStructuralBlock,
  SectionPath,
  TextQuote,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  DocumentRegistrationError,
  InMemoryDocumentRegistry,
} from "@petra/core";
import type {
  DocumentAuthorityRepository,
  PersistDocumentBundleInput,
  RegisteredDocumentBundle,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresDocumentAuthorityErrorCode =
  | "DOCUMENT_ID_CONFLICT"
  | "PARSER_RUN_ID_CONFLICT"
  | "STRUCTURAL_BLOCK_ID_CONFLICT"
  | "SOURCE_SPAN_ID_CONFLICT"
  | "DOCUMENT_BUNDLE_INCOMPLETE"
  | "DOCUMENT_REFERENCE_MISSING"
  | "DOCUMENT_RELATION_INVALID"
  | "DOCUMENT_PARSE_NOT_PERMITTED";

export class PostgresDocumentAuthorityError extends Error {
  readonly code: PostgresDocumentAuthorityErrorCode;

  constructor(code: PostgresDocumentAuthorityErrorCode, message: string) {
    super(message);
    this.name = "PostgresDocumentAuthorityError";
    this.code = code;
  }
}

interface IdHashRow {
  record_id: string;
  record_hash: string;
}

interface ArtifactPayloadRow {
  artifact_id: string;
  payload: unknown;
}

interface DocumentPayloadRow {
  source_artifact_manifest_id: string;
  payload: unknown;
}

interface PayloadRow {
  payload: unknown;
}

interface SourcePermissionRow {
  origin_work_version_id: string | null;
}

interface SelectorColumns {
  selectorType: PetraSourceSpan["selector"]["selector_type"];
  selectedTextHash: string | null;
  startCodepoint: number | null;
  endCodepoint: number | null;
  pageNumber: number | null;
  sectionPath: readonly string[] | null;
  jsonPointer: string | null;
  startLine: number | null;
  endLine: number | null;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const recordHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const artifactManifestIdPattern = /^artifact_manifest_[0-9A-HJKMNP-TV-Z]{26}$/;

const selectorColumns = (span: PetraSourceSpan): SelectorColumns => {
  let selectedTextHash: string | null = null;
  let startCodepoint: number | null = null;
  let endCodepoint: number | null = null;
  let pageNumber: number | null = null;
  let sectionPath: readonly string[] | null = null;
  let jsonPointer: string | null = null;
  let startLine: number | null = null;
  let endLine: number | null = null;

  const textQuote = (quote: TextQuote): void => {
    selectedTextHash = quote.selected_text_hash;
    startCodepoint = quote.start_codepoint;
    endCodepoint = quote.end_codepoint;
  };
  const region = (value: PageRegion): void => {
    pageNumber = value.page_number;
  };
  const path = (value: SectionPath): void => {
    sectionPath = value.segments;
  };
  const pointer = (value: JsonPointer): void => {
    jsonPointer = value.pointer;
  };
  const lines = (value: LineRange): void => {
    startLine = value.start_line;
    endLine = value.end_line;
  };

  const { selector } = span;
  switch (selector.selector_type) {
    case "text_quote":
      textQuote(selector.quote);
      break;
    case "page_region":
      region(selector.page_region);
      break;
    case "section_path":
      path(selector.section_path);
      break;
    case "json_pointer":
      pointer(selector.json_pointer);
      break;
    case "line_range":
      lines(selector.line_range);
      break;
    case "compound":
      for (const component of selector.components) {
        switch (component.component_kind) {
          case "text_quote":
            textQuote(component.quote);
            break;
          case "page_region":
            region(component.page_region);
            break;
          case "section_path":
            path(component.section_path);
            break;
          case "json_pointer":
            pointer(component.json_pointer);
            break;
          case "line_range":
            lines(component.line_range);
            break;
        }
      }
      break;
  }

  return {
    selectorType: selector.selector_type,
    selectedTextHash,
    startCodepoint,
    endCodepoint,
    pageNumber,
    sectionPath,
    jsonPointer,
    startLine,
    endLine,
  };
};

const registeredCopy = (
  bundle: RegisteredDocumentBundle,
): RegisteredDocumentBundle => clone(bundle);

export class PostgresDocumentAuthorityRepository implements DocumentAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerDocumentBundle(
    input: PersistDocumentBundleInput,
  ): Promise<RegisteredDocumentBundle> {
    const bundle = this.#normalizeAndValidateContracts(input);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await this.#lock(
        client,
        bundle.sourceArtifactManifestId,
        bundle.document.parsed_document_id,
        bundle.document.parser_run_id,
        ...bundle.blocks.map((block) => block.structural_block_id),
        ...bundle.spans.map((span) => span.source_span_id),
      );
      await this.#requireReferencesAndValidate(client, bundle);

      const existing = await client.query<DocumentPayloadRow>(
        `SELECT source_artifact_manifest_id, payload
           FROM petra.parsed_documents
          WHERE parsed_document_id = $1`,
        [bundle.document.parsed_document_id],
      );
      if (existing.rows[0] !== undefined) {
        await this.#requireExactReplay(client, bundle, existing.rows[0]);
        await client.query("COMMIT");
        return registeredCopy(bundle);
      }

      await this.#requireUnusedIdentities(client, bundle);
      await this.#insertDocument(client, bundle);
      await this.#insertBlocksAndDeclarations(client, bundle);
      await this.#insertSpans(client, bundle.spans);
      await client.query("COMMIT");
      return registeredCopy(bundle);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getDocumentBundle(
    parsedDocumentId: string,
  ): Promise<RegisteredDocumentBundle | undefined> {
    const documentResult = await this.#pool.query<DocumentPayloadRow>(
      `SELECT source_artifact_manifest_id, payload
         FROM petra.parsed_documents
        WHERE parsed_document_id = $1`,
      [parsedDocumentId],
    );
    const documentRow = documentResult.rows[0];
    if (documentRow === undefined) return undefined;
    this.#contracts.assertValid(
      "parsed-document",
      "1.0.0",
      documentRow.payload,
    );
    const document = documentRow.payload as PetraParsedDocument;

    const blockResult = await this.#pool.query<PayloadRow>(
      `SELECT block.payload
         FROM petra.structural_blocks AS block
        WHERE block.parsed_document_id = $1
        ORDER BY block.reading_order`,
      [parsedDocumentId],
    );
    const blocks = blockResult.rows.map(({ payload }) => {
      this.#contracts.assertValid("structural-block", "1.0.0", payload);
      return payload as PetraStructuralBlock;
    });

    const spanResult = await this.#pool.query<PayloadRow>(
      `SELECT span.payload
         FROM petra.structural_block_span_declarations AS declaration
         JOIN petra.structural_blocks AS block
           ON block.parsed_document_id = declaration.parsed_document_id
          AND block.structural_block_id = declaration.structural_block_id
         JOIN petra.source_spans AS span
           ON span.source_span_id = declaration.source_span_id
        WHERE declaration.parsed_document_id = $1
        ORDER BY block.reading_order, declaration.position`,
      [parsedDocumentId],
    );
    const spans = spanResult.rows.map(({ payload }) => {
      this.#contracts.assertValid("source-span", "1.0.0", payload);
      return payload as PetraSourceSpan;
    });

    return registeredCopy({
      sourceArtifactManifestId: documentRow.source_artifact_manifest_id,
      document,
      blocks,
      spans,
    });
  }

  async getParsedDocument(
    parsedDocumentId: string,
  ): Promise<PetraParsedDocument | undefined> {
    return this.#getRecord(
      "parsed_documents",
      "parsed_document_id",
      parsedDocumentId,
      "parsed-document",
    );
  }

  async getStructuralBlock(
    structuralBlockId: string,
  ): Promise<PetraStructuralBlock | undefined> {
    return this.#getRecord(
      "structural_blocks",
      "structural_block_id",
      structuralBlockId,
      "structural-block",
    );
  }

  async getSourceSpan(
    sourceSpanId: string,
  ): Promise<PetraSourceSpan | undefined> {
    return this.#getRecord(
      "source_spans",
      "source_span_id",
      sourceSpanId,
      "source-span",
    );
  }

  async getSourceSpansForArtifact(
    artifactId: string,
  ): Promise<PetraSourceSpan[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload
         FROM petra.source_spans
        WHERE artifact_id = $1
        ORDER BY created_at, source_span_id`,
      [artifactId],
    );
    return result.rows.map(({ payload }) => {
      this.#contracts.assertValid("source-span", "1.0.0", payload);
      return clone(payload as PetraSourceSpan);
    });
  }

  #normalizeAndValidateContracts(
    input: PersistDocumentBundleInput,
  ): RegisteredDocumentBundle {
    if (!artifactManifestIdPattern.test(input.sourceArtifactManifestId)) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_RELATION_INVALID",
        "A DocumentBundle must name one valid source ArtifactManifest.",
      );
    }
    this.#contracts.assertValid("parsed-document", "1.0.0", input.document);
    for (const block of input.blocks) {
      this.#contracts.assertValid("structural-block", "1.0.0", block);
    }
    for (const span of input.spans) {
      this.#contracts.assertValid("source-span", "1.0.0", span);
    }

    const blocksById = new Map<string, PetraStructuralBlock>();
    for (const block of input.blocks) {
      if (blocksById.has(block.structural_block_id)) {
        throw new PostgresDocumentAuthorityError(
          "DOCUMENT_BUNDLE_INCOMPLETE",
          "A DocumentBundle cannot repeat a StructuralBlock.",
        );
      }
      blocksById.set(block.structural_block_id, block);
    }
    if (blocksById.size !== input.document.block_ids.length) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_BUNDLE_INCOMPLETE",
        "A DocumentBundle must contain every and only declared StructuralBlock.",
      );
    }
    const blocks = input.document.block_ids.map((blockId) => {
      const block = blocksById.get(blockId);
      if (block === undefined) {
        throw new PostgresDocumentAuthorityError(
          "DOCUMENT_BUNDLE_INCOMPLETE",
          "A DocumentBundle is missing a declared StructuralBlock.",
        );
      }
      return block;
    });

    const spansById = new Map<string, PetraSourceSpan>();
    for (const span of input.spans) {
      if (spansById.has(span.source_span_id)) {
        throw new PostgresDocumentAuthorityError(
          "DOCUMENT_BUNDLE_INCOMPLETE",
          "A DocumentBundle cannot repeat a SourceSpan.",
        );
      }
      spansById.set(span.source_span_id, span);
    }
    const declaredSpanIds = blocks.flatMap((block) => block.source_span_ids);
    if (new Set(declaredSpanIds).size !== declaredSpanIds.length) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_RELATION_INVALID",
        "A SourceSpan may be declared by exactly one StructuralBlock.",
      );
    }
    if (spansById.size !== declaredSpanIds.length) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_BUNDLE_INCOMPLETE",
        "A DocumentBundle must contain every and only declared SourceSpan.",
      );
    }
    const spans = declaredSpanIds.map((spanId) => {
      const span = spansById.get(spanId);
      if (span === undefined) {
        throw new PostgresDocumentAuthorityError(
          "DOCUMENT_BUNDLE_INCOMPLETE",
          "A DocumentBundle is missing a declared SourceSpan.",
        );
      }
      return span;
    });

    return registeredCopy({
      sourceArtifactManifestId: input.sourceArtifactManifestId,
      document: input.document,
      blocks,
      spans,
    });
  }

  async #requireReferencesAndValidate(
    client: PoolClient,
    bundle: RegisteredDocumentBundle,
  ): Promise<void> {
    const { document, blocks, spans } = bundle;
    const artifactIds = new Set<string>([
      document.source_artifact_id,
      document.parser_output_artifact_id,
    ]);
    for (const block of blocks) {
      if (block.content.content_kind === "structured_artifact") {
        artifactIds.add(block.content.structured_artifact_id);
      }
    }
    const artifacts = await client.query<ArtifactPayloadRow>(
      `SELECT artifact_id, payload
         FROM petra.artifacts
        WHERE artifact_id = ANY($1::text[])`,
      [[...artifactIds]],
    );
    const artifactsById = new Map<string, PetraArtifact>();
    for (const row of artifacts.rows) {
      this.#contracts.assertValid("artifact", "1.0.0", row.payload);
      artifactsById.set(row.artifact_id, row.payload as PetraArtifact);
    }

    const sourcePermission = await client.query<SourcePermissionRow>(
      `SELECT manifest.origin_work_version_id
         FROM petra.artifact_manifests AS manifest
         JOIN petra.rights_decisions AS rights
           ON rights.rights_decision_id = manifest.rights_decision_id
          AND rights.artifact_manifest_id = manifest.artifact_manifest_id
        WHERE manifest.artifact_manifest_id = $1
          AND manifest.artifact_id = $2
          AND manifest.storage_content_hash = $3
          AND rights.parse_permitted`,
      [
        bundle.sourceArtifactManifestId,
        document.source_artifact_id,
        document.source_artifact_content_hash,
      ],
    );
    if (sourcePermission.rows[0] === undefined) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_PARSE_NOT_PERMITTED",
        "The exact source acquisition is missing or does not permit parsing.",
      );
    }
    const originWorkVersionId = sourcePermission.rows[0].origin_work_version_id;
    if (
      originWorkVersionId !== null &&
      originWorkVersionId !== document.work_version_id
    ) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_RELATION_INVALID",
        "The ParsedDocument WorkVersion differs from its acquired source copy.",
      );
    }

    const parserLineage = await client.query(
      `SELECT 1
         FROM petra.artifact_manifests AS manifest
         JOIN petra.artifact_manifest_inputs AS input
           ON input.artifact_manifest_id = manifest.artifact_manifest_id
        WHERE manifest.artifact_id = $1
          AND manifest.origin_kind = 'generated'
          AND input.input_artifact_id = $2`,
      [document.parser_output_artifact_id, document.source_artifact_id],
    );
    if (parserLineage.rowCount === 0) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_RELATION_INVALID",
        "The parser-output Artifact must retain the source Artifact as generated input provenance.",
      );
    }

    const workVersion = await client.query(
      `SELECT 1
         FROM petra.canonical_entities
        WHERE entity_id = $1 AND entity_kind = 'work_version'`,
      [document.work_version_id],
    );
    if (workVersion.rowCount !== 1) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_REFERENCE_MISSING",
        "The ParsedDocument WorkVersion is not registered.",
      );
    }

    const actors = new Map<string, ActorRef>();
    actors.set(
      `${document.created_by.actor_id}\u0000${document.created_by.actor_kind}`,
      document.created_by,
    );
    for (const span of spans) {
      actors.set(
        `${span.created_by.actor_id}\u0000${span.created_by.actor_kind}`,
        span.created_by,
      );
    }
    for (const actor of actors.values())
      await this.#requireActor(client, actor);

    for (const artifactId of artifactIds) {
      if (!artifactsById.has(artifactId)) {
        throw new PostgresDocumentAuthorityError(
          "DOCUMENT_REFERENCE_MISSING",
          `Document Artifact ${artifactId} is not registered.`,
        );
      }
    }

    const validator = new InMemoryDocumentRegistry({
      getByArtifactId: (artifactId) => {
        const artifact = artifactsById.get(artifactId);
        return artifact === undefined ? undefined : { artifact };
      },
    });
    try {
      validator.registerParsedDocument(document);
      for (const block of blocks) validator.registerStructuralBlock(block);
      for (const span of spans) validator.attachSourceSpan(span);
    } catch (error) {
      if (error instanceof DocumentRegistrationError) {
        throw new PostgresDocumentAuthorityError(
          "DOCUMENT_RELATION_INVALID",
          `${error.code}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  async #requireActor(client: PoolClient, actor: ActorRef): Promise<void> {
    const result = await client.query<{ actor_kind: ActorRef["actor_kind"] }>(
      "SELECT actor_kind FROM petra.actors WHERE actor_id = $1",
      [actor.actor_id],
    );
    if (result.rows[0]?.actor_kind !== actor.actor_kind) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_REFERENCE_MISSING",
        "Document authorship must resolve to the exact registered Actor kind.",
      );
    }
  }

  async #lock(client: PoolClient, ...keys: string[]): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #requireExactReplay(
    client: PoolClient,
    bundle: RegisteredDocumentBundle,
    existing: DocumentPayloadRow,
  ): Promise<void> {
    if (
      existing.source_artifact_manifest_id !==
        bundle.sourceArtifactManifestId ||
      recordHash(existing.payload) !== recordHash(bundle.document)
    ) {
      throw new PostgresDocumentAuthorityError(
        "DOCUMENT_ID_CONFLICT",
        "The ParsedDocument ID is already bound to different canonical content or source authority.",
      );
    }
    const blockRows = await client.query<IdHashRow>(
      `SELECT structural_block_id AS record_id, record_hash
         FROM petra.structural_blocks
        WHERE parsed_document_id = $1`,
      [bundle.document.parsed_document_id],
    );
    const spanRows = await client.query<IdHashRow>(
      `SELECT source_span_id AS record_id, record_hash
         FROM petra.source_spans
        WHERE parsed_document_id = $1`,
      [bundle.document.parsed_document_id],
    );
    this.#requireExactMembers(
      blockRows.rows,
      bundle.blocks.map((block) => ({
        id: block.structural_block_id,
        hash: recordHash(block),
      })),
      "STRUCTURAL_BLOCK_ID_CONFLICT",
      "The existing ParsedDocument has different StructuralBlocks.",
    );
    this.#requireExactMembers(
      spanRows.rows,
      bundle.spans.map((span) => ({
        id: span.source_span_id,
        hash: recordHash(span),
      })),
      "SOURCE_SPAN_ID_CONFLICT",
      "The existing ParsedDocument has different SourceSpans.",
    );
  }

  #requireExactMembers(
    existing: readonly IdHashRow[],
    proposed: readonly { id: string; hash: string }[],
    code: "STRUCTURAL_BLOCK_ID_CONFLICT" | "SOURCE_SPAN_ID_CONFLICT",
    message: string,
  ): void {
    const hashes = new Map(
      existing.map((row) => [row.record_id, row.record_hash]),
    );
    if (
      hashes.size !== proposed.length ||
      proposed.some(({ id, hash }) => hashes.get(id) !== hash)
    ) {
      throw new PostgresDocumentAuthorityError(code, message);
    }
  }

  async #requireUnusedIdentities(
    client: PoolClient,
    bundle: RegisteredDocumentBundle,
  ): Promise<void> {
    const parserRun = await client.query(
      "SELECT 1 FROM petra.parsed_documents WHERE parser_run_id = $1",
      [bundle.document.parser_run_id],
    );
    if (parserRun.rowCount !== 0) {
      throw new PostgresDocumentAuthorityError(
        "PARSER_RUN_ID_CONFLICT",
        "The parser run is already bound to another ParsedDocument.",
      );
    }
    await this.#requireIdsUnused(
      client,
      "structural_blocks",
      "structural_block_id",
      bundle.blocks.map((block) => block.structural_block_id),
      "STRUCTURAL_BLOCK_ID_CONFLICT",
      "A StructuralBlock ID is already registered.",
    );
    await this.#requireIdsUnused(
      client,
      "source_spans",
      "source_span_id",
      bundle.spans.map((span) => span.source_span_id),
      "SOURCE_SPAN_ID_CONFLICT",
      "A SourceSpan ID is already registered.",
    );
  }

  async #requireIdsUnused(
    client: PoolClient,
    table: "structural_blocks" | "source_spans",
    column: "structural_block_id" | "source_span_id",
    ids: readonly string[],
    code: "STRUCTURAL_BLOCK_ID_CONFLICT" | "SOURCE_SPAN_ID_CONFLICT",
    message: string,
  ): Promise<void> {
    if (ids.length === 0) return;
    const result = await client.query(
      `SELECT 1 FROM petra.${table} WHERE ${column} = ANY($1::text[]) LIMIT 1`,
      [ids],
    );
    if (result.rowCount !== 0) {
      throw new PostgresDocumentAuthorityError(code, message);
    }
  }

  async #insertDocument(
    client: PoolClient,
    bundle: RegisteredDocumentBundle,
  ): Promise<void> {
    const { document } = bundle;
    await client.query(
      `INSERT INTO petra.parsed_documents (
         parsed_document_id, revision, source_artifact_id,
         source_artifact_content_hash, source_artifact_manifest_id,
         parser_output_artifact_id, work_version_id, work_version_kind,
         parser_run_id, source_format, document_language, adapter_name,
         adapter_version, normalization_version, parser_name, parser_version,
         parser_configuration_hash, parser_started_at, parser_completed_at,
         quality_state, created_by_actor_id, created_by_actor_kind, schema_name,
         schema_version, record_hash, payload, created_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, 'work_version', $8, $9, $10, $11,
         $12, $13, $14, $15, $16, $17::timestamptz, $18::timestamptz, $19,
         $20, $21, $22, $23, $24, $25::jsonb, $26::timestamptz
       )`,
      [
        document.parsed_document_id,
        document.revision,
        document.source_artifact_id,
        document.source_artifact_content_hash,
        bundle.sourceArtifactManifestId,
        document.parser_output_artifact_id,
        document.work_version_id,
        document.parser_run_id,
        document.source_format,
        document.document_language ?? null,
        document.adapter.name,
        document.adapter.version,
        document.normalization_version,
        document.parser_provenance.parser.name,
        document.parser_provenance.parser.version,
        document.parser_provenance.configuration_hash,
        document.parser_provenance.started_at,
        document.parser_provenance.completed_at,
        document.quality_state,
        document.created_by.actor_id,
        document.created_by.actor_kind,
        document.schema_name,
        document.schema_version,
        recordHash(document),
        JSON.stringify(document),
        document.created_at,
      ],
    );

    for (const [readingOrder, blockId] of document.block_ids.entries()) {
      await client.query(
        `INSERT INTO petra.parsed_document_block_declarations (
           parsed_document_id, reading_order, structural_block_id
         ) VALUES ($1, $2, $3)`,
        [document.parsed_document_id, readingOrder, blockId],
      );
    }
  }

  async #insertBlocksAndDeclarations(
    client: PoolClient,
    bundle: RegisteredDocumentBundle,
  ): Promise<void> {
    for (const block of bundle.blocks) {
      const contentHash =
        block.content.content_kind === "visual_only"
          ? null
          : block.content.content_hash;
      const structuredArtifactId =
        block.content.content_kind === "structured_artifact"
          ? block.content.structured_artifact_id
          : null;
      await client.query(
        `INSERT INTO petra.structural_blocks (
           structural_block_id, revision, parsed_document_id, block_kind,
           content_layer, reading_order, parent_block_id, previous_block_id,
           next_block_id, content_kind, content_hash, structured_artifact_id,
           schema_name, schema_version, record_hash, payload, created_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
           $15, $16::jsonb, $17::timestamptz
         )`,
        [
          block.structural_block_id,
          block.revision,
          block.parsed_document_id,
          block.block_kind,
          block.content_layer,
          block.reading_order,
          block.parent_block_id ?? null,
          block.previous_block_id ?? null,
          block.next_block_id ?? null,
          block.content.content_kind,
          contentHash,
          structuredArtifactId,
          block.schema_name,
          block.schema_version,
          recordHash(block),
          JSON.stringify(block),
          block.created_at,
        ],
      );
      for (const [index, childId] of block.child_block_ids.entries()) {
        await client.query(
          `INSERT INTO petra.structural_block_children (
             parsed_document_id, parent_block_id, position, child_block_id
           ) VALUES ($1, $2, $3, $4)`,
          [
            block.parsed_document_id,
            block.structural_block_id,
            index + 1,
            childId,
          ],
        );
      }
      for (const [index, spanId] of block.source_span_ids.entries()) {
        await client.query(
          `INSERT INTO petra.structural_block_span_declarations (
             parsed_document_id, structural_block_id, position, source_span_id
           ) VALUES ($1, $2, $3, $4)`,
          [
            block.parsed_document_id,
            block.structural_block_id,
            index + 1,
            spanId,
          ],
        );
      }
    }
  }

  async #insertSpans(
    client: PoolClient,
    spans: readonly PetraSourceSpan[],
  ): Promise<void> {
    for (const span of spans) {
      const selector = selectorColumns(span);
      await client.query(
        `INSERT INTO petra.source_spans (
           source_span_id, revision, artifact_id, artifact_content_hash,
           parsed_document_id, parser_run_id, structural_block_id,
           selector_schema_version, selector_type, selected_text_hash,
           start_codepoint, end_codepoint, page_number, section_path,
           json_pointer, start_line, end_line, extraction_method,
           extraction_method_version, normalization_version,
           verification_status, verified_at, created_by_actor_id,
           created_by_actor_kind, schema_name, schema_version, record_hash,
           payload, created_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14::text[], $15, $16, $17, $18, $19, $20, $21,
           $22::timestamptz, $23, $24, $25, $26, $27, $28::jsonb,
           $29::timestamptz
         )`,
        [
          span.source_span_id,
          span.revision,
          span.artifact_id,
          span.artifact_content_hash,
          span.parsed_document_id,
          span.parser_run_id,
          span.structural_block_id,
          span.selector_schema_version,
          selector.selectorType,
          selector.selectedTextHash,
          selector.startCodepoint,
          selector.endCodepoint,
          selector.pageNumber,
          selector.sectionPath,
          selector.jsonPointer,
          selector.startLine,
          selector.endLine,
          span.extraction.method,
          span.extraction.method_version,
          span.extraction.normalization_version,
          span.verification.status,
          span.verification.verified_at,
          span.created_by.actor_id,
          span.created_by.actor_kind,
          span.schema_name,
          span.schema_version,
          recordHash(span),
          JSON.stringify(span),
          span.created_at,
        ],
      );
    }
  }

  async #getRecord<RecordType extends object>(
    table: "parsed_documents" | "structural_blocks" | "source_spans",
    column: "parsed_document_id" | "structural_block_id" | "source_span_id",
    id: string,
    contractName: "parsed-document" | "structural-block" | "source-span",
  ): Promise<RecordType | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload FROM petra.${table} WHERE ${column} = $1`,
      [id],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid(contractName, "1.0.0", payload);
    return clone(payload as RecordType);
  }
}
