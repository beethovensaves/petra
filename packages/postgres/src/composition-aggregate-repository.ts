import { createHash } from "node:crypto";

import type {
  ContextObjectRef,
  PetraCitationBundle,
  PetraCompositionPlan,
  PetraCompositionRequest,
  PetraDraftArtifact,
  PetraDraftSpan,
  PetraEvidencePacket,
  PetraProvenanceMap,
  ProvenanceBasis,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  CompositionAggregate,
  InMemoryContextPacketRegistry,
  RegisterCompositionInput,
} from "@petra/core";
import { InMemoryCompositionRegistry } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type CompositionAggregatePersistenceErrorCode =
  | "COMPOSITION_AGGREGATE_ID_CONFLICT"
  | "COMPOSITION_AGGREGATE_COMPONENT_ID_CONFLICT"
  | "COMPOSITION_AGGREGATE_REFERENCE_MISSING"
  | "COMPOSITION_AGGREGATE_REFERENCE_MISMATCH"
  | "COMPOSITION_AGGREGATE_GROUNDED_RESPONSE_NOT_REUSABLE"
  | "COMPOSITION_AGGREGATE_REVISION_UNSUPPORTED"
  | "COMPOSITION_AGGREGATE_STORED_RECORD_CORRUPT";

export class CompositionAggregatePersistenceError extends Error {
  readonly code: CompositionAggregatePersistenceErrorCode;

  constructor(code: CompositionAggregatePersistenceErrorCode, message: string) {
    super(message);
    this.name = "CompositionAggregatePersistenceError";
    this.code = code;
  }
}

interface StoredRow {
  record_hash: string;
  payload: unknown;
}

interface StoredDraftRow extends StoredRow {
  aggregate_hash: string;
}

interface GroundedResponseRow {
  grounded_response_id: string;
  revision: string;
  content_hash: string;
}

interface CanonicalReference {
  id: string;
  revision: number;
  hash: string;
}

interface AuthorityDependency extends CanonicalReference {
  role: "provenance" | "citation";
  kind:
    | "claim"
    | "assertion"
    | "source_span"
    | "work"
    | "work_version"
    | "author"
    | "external_identifier";
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const aggregateFrom = (
  input: RegisterCompositionInput,
): CompositionAggregate => ({
  draft: clone(input.draft),
  spans: clone(input.spans),
  provenanceMap: clone(input.provenanceMap),
  citationBundle: clone(input.citationBundle),
});

const dependencyKey = (dependency: AuthorityDependency): string =>
  [
    dependency.role,
    dependency.kind,
    dependency.id,
    dependency.revision,
    dependency.hash,
  ].join(":");

export class PostgresCompositionAggregateRepository {
  readonly #pool: Pool;
  readonly #packets: InMemoryContextPacketRegistry;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    packets: InMemoryContextPacketRegistry,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#packets = packets;
    this.#contracts = contracts;
  }

  async register(
    input: RegisterCompositionInput,
  ): Promise<CompositionAggregate> {
    this.#assertContracts(input);
    if (input.draft.revision !== 1) {
      throw new CompositionAggregatePersistenceError(
        "COMPOSITION_AGGREGATE_REVISION_UNSUPPORTED",
        "The first durable composition slice accepts only a root DraftArtifact; additive editing opens in M1.8-W09.",
      );
    }
    const candidate = aggregateFrom(input);
    const candidateHash = canonicalHash(candidate);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `composition-draft:${input.draft.draft_artifact_id}`,
        `composition-plan:${input.draft.composition_plan_ref.record_id}`,
        `composition-provenance:${input.provenanceMap.provenance_map_id}`,
        `composition-citations:${input.citationBundle.citation_bundle_id}`,
        ...input.spans.map((span) => `composition-span:${span.draft_span_id}`),
      ]);

      const existing = await this.#selectDraft(
        client,
        input.draft.draft_artifact_id,
        input.draft.revision,
      );
      if (existing !== undefined) {
        const stored = await this.#loadAggregate(
          client,
          input.draft.draft_artifact_id,
          input.draft.revision,
        );
        if (
          existing.aggregate_hash !== candidateHash ||
          !same(stored, candidate)
        ) {
          throw new CompositionAggregatePersistenceError(
            "COMPOSITION_AGGREGATE_ID_CONFLICT",
            "The DraftArtifact revision is already bound to a different composition aggregate.",
          );
        }
        return stored;
      }

      await this.#requireComponentIdsAvailable(client, input);
      const controls = await this.#requireDurableControls(client, input.draft);
      const evidence = this.#packets.getEvidencePacket(
        input.draft.evidence_packet_ref.evidence_packet_id,
      );
      if (evidence === undefined || !same(evidence, controls.evidence)) {
        throw new CompositionAggregatePersistenceError(
          "COMPOSITION_AGGREGATE_REFERENCE_MISMATCH",
          "The in-memory EvidencePacket must exactly match its durable record before composition persistence.",
        );
      }
      const validator = new InMemoryCompositionRegistry(this.#packets);
      validator.registerRequest(clone(controls.request));
      validator.registerPlan(clone(controls.plan));
      validator.register(clone(input));
      await this.#requireCanonicalCitationReferences(client, input);
      const groundedResponse = await this.#resolveGroundedResponse(
        client,
        input.draft,
      );

      await this.#insertDraft(
        client,
        input.draft,
        candidateHash,
        groundedResponse,
      );
      await this.#insertSpans(client, input.spans);
      await this.#insertProvenance(client, input.provenanceMap);
      await this.#insertCitations(client, input.citationBundle);
      await this.#insertDependencies(client, input);
      return candidate;
    });
  }

  async get(
    draftArtifactId: string,
    revision: number,
  ): Promise<CompositionAggregate | undefined> {
    const client = await this.#pool.connect();
    try {
      const row = await this.#selectDraft(client, draftArtifactId, revision);
      return row === undefined
        ? undefined
        : await this.#loadAggregate(client, draftArtifactId, revision);
    } finally {
      client.release();
    }
  }

  async getCurrent(
    draftArtifactId: string,
  ): Promise<CompositionAggregate | undefined> {
    const result = await this.#pool.query<{ current_revision: string }>(
      `SELECT current_revision
         FROM petra.draft_artifacts
        WHERE draft_artifact_id = $1`,
      [draftArtifactId],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : this.get(draftArtifactId, Number(row.current_revision));
  }

  #assertContracts(input: RegisterCompositionInput): void {
    this.#contracts.assertValid(
      "draft-artifact",
      input.draft.schema_version,
      input.draft,
    );
    for (const span of input.spans) {
      this.#contracts.assertValid("draft-span", span.schema_version, span);
    }
    this.#contracts.assertValid(
      "provenance-map",
      input.provenanceMap.schema_version,
      input.provenanceMap,
    );
    this.#contracts.assertValid(
      "citation-bundle",
      input.citationBundle.schema_version,
      input.citationBundle,
    );
  }

  async #requireDurableControls(
    client: PoolClient,
    draft: PetraDraftArtifact,
  ): Promise<{
    request: PetraCompositionRequest;
    plan: PetraCompositionPlan;
    evidence: PetraEvidencePacket;
  }> {
    const request = await this.#selectStored(
      client,
      "petra.composition_requests",
      "composition_request_id",
      draft.composition_request_ref.record_id,
    );
    const plan = await this.#selectStored(
      client,
      "petra.composition_plans",
      "composition_plan_id",
      draft.composition_plan_ref.record_id,
    );
    const evidence = await this.#selectStored(
      client,
      "petra.evidence_packets",
      "evidence_packet_id",
      draft.evidence_packet_ref.evidence_packet_id,
    );
    if (request === undefined || plan === undefined || evidence === undefined) {
      throw new CompositionAggregatePersistenceError(
        "COMPOSITION_AGGREGATE_REFERENCE_MISSING",
        "The exact durable CompositionRequest, CompositionPlan, and EvidencePacket must exist first.",
      );
    }
    this.#assertStoredRecord(request, "CompositionRequest");
    this.#assertStoredRecord(plan, "CompositionPlan");
    this.#assertStoredRecord(evidence, "EvidencePacket");
    this.#contracts.assertValid(
      "composition-request",
      "1.0.0",
      request.payload,
    );
    this.#contracts.assertValid("composition-plan", "1.0.0", plan.payload);
    this.#contracts.assertValid("evidence-packet", "1.0.0", evidence.payload);
    return {
      request: clone(request.payload) as PetraCompositionRequest,
      plan: clone(plan.payload) as PetraCompositionPlan,
      evidence: clone(evidence.payload) as PetraEvidencePacket,
    };
  }

  async #resolveGroundedResponse(
    client: PoolClient,
    draft: PetraDraftArtifact,
  ): Promise<GroundedResponseRow | undefined> {
    if (draft.production.origin_kind !== "model_generated") return undefined;
    const result = await client.query<GroundedResponseRow>(
      `SELECT response.grounded_response_id,
              revision.revision::text AS revision,
              revision.content_hash
         FROM petra.grounded_responses AS response
         JOIN petra.grounded_response_revisions AS revision
           ON revision.grounded_response_id = response.grounded_response_id
          AND revision.revision = response.current_revision
        WHERE response.project_id = $1
          AND response.evidence_packet_id = $2
          AND response.evidence_packet_hash = $3
          AND response.snapshot_id = $4
          AND response.snapshot_revision = $5
          AND response.snapshot_event_position = $6
          AND response.snapshot_hash = $7
          AND response.model_request_id = $8
          AND response.model_call_id = $9
          AND revision.cache_state = 'reusable'
        ORDER BY response.grounded_response_id
        LIMIT 2`,
      [
        draft.project_id,
        draft.evidence_packet_ref.evidence_packet_id,
        draft.evidence_packet_ref.content_hash,
        draft.snapshot_ref.snapshot_id,
        draft.snapshot_ref.snapshot_revision,
        draft.snapshot_ref.event_position,
        draft.snapshot_ref.content_hash,
        draft.production.model_request_id,
        draft.production.model_call_id,
      ],
    );
    if (result.rows.length !== 1) {
      throw new CompositionAggregatePersistenceError(
        "COMPOSITION_AGGREGATE_GROUNDED_RESPONSE_NOT_REUSABLE",
        "A model-generated draft must resolve to exactly one current reusable GroundedResponse with the same execution, EvidencePacket, and snapshot.",
      );
    }
    return result.rows[0];
  }

  async #requireCanonicalCitationReferences(
    client: PoolClient,
    input: RegisterCompositionInput,
  ): Promise<void> {
    const references = new Map<string, CanonicalReference>();
    for (const citation of input.citationBundle.content.citations) {
      for (const reference of [
        {
          id: citation.work_ref.work_id,
          revision: citation.work_ref.revision,
          hash: citation.work_ref.content_hash,
        },
        {
          id: citation.work_version_ref.work_version_id,
          revision: citation.work_version_ref.revision,
          hash: citation.work_version_ref.content_hash,
        },
        ...citation.author_refs.map((author) => ({
          id: author.author_id,
          revision: author.revision,
          hash: author.content_hash,
        })),
        ...citation.external_identifier_refs.map((identifier) => ({
          id: identifier.external_identifier_id,
          revision: identifier.revision,
          hash: identifier.content_hash,
        })),
      ]) {
        references.set(`${reference.id}:${reference.revision}`, reference);
      }
    }
    const values = [...references.values()];
    const result = await client.query<{ matched: string }>(
      `SELECT count(*)::text AS matched
         FROM unnest($1::text[], $2::bigint[], $3::text[])
              AS expected(entity_id, revision, record_hash)
         JOIN petra.canonical_entity_revisions AS actual
           ON actual.entity_id = expected.entity_id
          AND actual.revision = expected.revision
          AND actual.record_hash = expected.record_hash`,
      [
        values.map((value) => value.id),
        values.map((value) => value.revision),
        values.map((value) => value.hash),
      ],
    );
    if (Number(result.rows[0]?.matched ?? 0) !== values.length) {
      throw new CompositionAggregatePersistenceError(
        "COMPOSITION_AGGREGATE_REFERENCE_MISSING",
        "Every canonical Work, WorkVersion, Author, and external identifier cited by the bundle must exist at the exact durable revision and hash.",
      );
    }
  }

  async #requireComponentIdsAvailable(
    client: PoolClient,
    input: RegisterCompositionInput,
  ): Promise<void> {
    const checks = await Promise.all([
      client.query(
        "SELECT 1 FROM petra.provenance_maps WHERE provenance_map_id = $1",
        [input.provenanceMap.provenance_map_id],
      ),
      client.query(
        "SELECT 1 FROM petra.citation_bundles WHERE citation_bundle_id = $1",
        [input.citationBundle.citation_bundle_id],
      ),
      client.query(
        "SELECT draft_span_id FROM petra.draft_spans WHERE draft_span_id = ANY($1::text[])",
        [input.spans.map((span) => span.draft_span_id)],
      ),
    ]);
    if (checks.some((result) => result.rowCount !== 0)) {
      throw new CompositionAggregatePersistenceError(
        "COMPOSITION_AGGREGATE_COMPONENT_ID_CONFLICT",
        "A DraftSpan, ProvenanceMap, or CitationBundle identity is already owned by another aggregate.",
      );
    }
  }

  async #insertDraft(
    client: PoolClient,
    draft: PetraDraftArtifact,
    aggregateHash: string,
    grounded: GroundedResponseRow | undefined,
  ): Promise<void> {
    const production = draft.production;
    await client.query(
      `INSERT INTO petra.draft_artifacts (
         draft_artifact_id, project_id, current_revision, created_at
       ) VALUES ($1, $2, $3, $4::timestamptz)`,
      [
        draft.draft_artifact_id,
        draft.project_id,
        draft.revision,
        draft.created_at,
      ],
    );
    await client.query(
      `INSERT INTO petra.draft_artifact_revisions (
         draft_artifact_id, revision, project_id,
         snapshot_id, snapshot_revision, snapshot_event_position, snapshot_hash,
         composition_request_id, composition_request_revision,
         composition_request_hash, composition_plan_id,
         composition_plan_revision, composition_plan_hash,
         evidence_packet_id, evidence_packet_revision, evidence_packet_hash,
         provenance_map_id, provenance_map_revision,
         citation_bundle_id, citation_bundle_revision,
         lineage_kind, parent_revision, edit_origin, production_origin,
         model_request_id, model_call_id, grounded_response_id,
         grounded_response_revision, grounded_response_hash, researcher_id,
         validation_state, content_hash, aggregate_hash,
         created_by_actor_id, created_by_actor_kind, created_at,
         record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
         $31, $32, $33, $34, $35, $36::timestamptz, $37, $38::jsonb
       )`,
      [
        draft.draft_artifact_id,
        draft.revision,
        draft.project_id,
        draft.snapshot_ref.snapshot_id,
        draft.snapshot_ref.snapshot_revision,
        draft.snapshot_ref.event_position,
        draft.snapshot_ref.content_hash,
        draft.composition_request_ref.record_id,
        draft.composition_request_ref.revision,
        draft.composition_request_ref.content_hash,
        draft.composition_plan_ref.record_id,
        draft.composition_plan_ref.revision,
        draft.composition_plan_ref.content_hash,
        draft.evidence_packet_ref.evidence_packet_id,
        draft.evidence_packet_ref.revision,
        draft.evidence_packet_ref.content_hash,
        draft.provenance_map_ref.provenance_map_id,
        draft.provenance_map_ref.revision,
        draft.citation_bundle_ref.citation_bundle_id,
        draft.citation_bundle_ref.revision,
        draft.lineage.lineage_kind,
        draft.lineage.lineage_kind === "revision"
          ? draft.lineage.parent_revision
          : null,
        draft.lineage.lineage_kind === "revision"
          ? draft.lineage.edit_origin
          : null,
        production.origin_kind,
        production.origin_kind === "model_generated"
          ? production.model_request_id
          : null,
        production.origin_kind === "model_generated"
          ? production.model_call_id
          : null,
        grounded?.grounded_response_id ?? null,
        grounded?.revision ?? null,
        grounded?.content_hash ?? null,
        production.origin_kind === "researcher_authored"
          ? production.researcher_id
          : null,
        draft.validation.state,
        draft.content_hash,
        aggregateHash,
        draft.created_by.actor_id,
        draft.created_by.actor_kind,
        draft.created_at,
        canonicalHash(draft),
        JSON.stringify(draft),
      ],
    );
  }

  async #insertSpans(
    client: PoolClient,
    spans: readonly PetraDraftSpan[],
  ): Promise<void> {
    for (const span of spans) {
      await client.query(
        `INSERT INTO petra.draft_spans (
           draft_span_id, revision, draft_artifact_id,
           draft_artifact_revision, draft_content_hash, project_id,
           start_codepoint, end_codepoint, exact_text_hash, materiality,
           semantic_origin, scientific_force, content_hash,
           created_by_actor_id, created_by_actor_kind, created_at,
           record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16::timestamptz, $17, $18::jsonb
         )`,
        [
          span.draft_span_id,
          span.revision,
          span.draft_ref.draft_artifact_id,
          span.draft_ref.revision,
          span.draft_ref.content_hash,
          span.project_id,
          span.content.start,
          span.content.end,
          span.content.exact_text_hash,
          span.content.materiality,
          span.content.semantic_origin,
          span.content.scientific_force,
          span.content_hash,
          span.created_by.actor_id,
          span.created_by.actor_kind,
          span.created_at,
          canonicalHash(span),
          JSON.stringify(span),
        ],
      );
    }
  }

  async #insertProvenance(
    client: PoolClient,
    map: PetraProvenanceMap,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.provenance_maps (
         provenance_map_id, revision, draft_artifact_id,
         draft_artifact_revision, draft_content_hash,
         evidence_packet_id, evidence_packet_revision, evidence_packet_hash,
         project_id, map_state, content_hash, compiled_by_actor_id,
         compiled_by_actor_kind, compiled_at, record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14::timestamptz, $15, $16::jsonb
       )`,
      [
        map.provenance_map_id,
        map.revision,
        map.draft_ref.draft_artifact_id,
        map.draft_ref.revision,
        map.draft_ref.content_hash,
        map.evidence_packet_ref.evidence_packet_id,
        map.evidence_packet_ref.revision,
        map.evidence_packet_ref.content_hash,
        map.project_id,
        map.content.state,
        map.content_hash,
        map.compiled_by.actor_id,
        map.compiled_by.actor_kind,
        map.compiled_at,
        canonicalHash(map),
        JSON.stringify(map),
      ],
    );
    for (const [mappingIndex, mapping] of map.content.mappings.entries()) {
      const mappingPosition = mappingIndex + 1;
      await client.query(
        `INSERT INTO petra.provenance_span_mappings (
           provenance_map_id, provenance_map_revision, position,
           draft_span_id, draft_span_revision, mapping_state,
           record_hash, payload
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [
          map.provenance_map_id,
          map.revision,
          mappingPosition,
          mapping.draft_span_id,
          mapping.draft_span_revision,
          mapping.mapping_state,
          canonicalHash(mapping),
          JSON.stringify(mapping),
        ],
      );
      for (const [basisIndex, basis] of mapping.bases.entries()) {
        const evidence = basis.basis_kind === "evidence" ? basis : undefined;
        await client.query(
          `INSERT INTO petra.provenance_bases (
             provenance_map_id, provenance_map_revision, mapping_position,
             basis_position, basis_kind, relation, evidence_selection_order,
             object_kind, object_id, object_revision, object_hash,
             record_hash, payload
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13::jsonb
           )`,
          [
            map.provenance_map_id,
            map.revision,
            mappingPosition,
            basisIndex + 1,
            basis.basis_kind,
            basis.relation,
            evidence?.evidence_selection_order ?? null,
            evidence?.object_ref.object_kind ?? null,
            evidence?.object_ref.object_id ?? null,
            evidence?.object_ref.object_revision ?? null,
            evidence?.object_ref.object_hash ?? null,
            canonicalHash(basis),
            JSON.stringify(basis),
          ],
        );
      }
    }
  }

  async #insertCitations(
    client: PoolClient,
    bundle: PetraCitationBundle,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.citation_bundles (
         citation_bundle_id, revision, draft_artifact_id,
         draft_artifact_revision, draft_content_hash,
         evidence_packet_id, evidence_packet_revision, evidence_packet_hash,
         project_id, style_kind, style_name, style_version, content_hash,
         compiled_by_actor_id, compiled_by_actor_kind, compiled_at,
         record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16::timestamptz, $17, $18::jsonb
       )`,
      [
        bundle.citation_bundle_id,
        bundle.revision,
        bundle.draft_ref.draft_artifact_id,
        bundle.draft_ref.revision,
        bundle.draft_ref.content_hash,
        bundle.evidence_packet_ref.evidence_packet_id,
        bundle.evidence_packet_ref.revision,
        bundle.evidence_packet_ref.content_hash,
        bundle.project_id,
        bundle.content.style.style_kind,
        bundle.content.style.style_name,
        bundle.content.style.style_version,
        bundle.content_hash,
        bundle.compiled_by.actor_id,
        bundle.compiled_by.actor_kind,
        bundle.compiled_at,
        canonicalHash(bundle),
        JSON.stringify(bundle),
      ],
    );
    for (const [
      citationIndex,
      citation,
    ] of bundle.content.citations.entries()) {
      const position = citationIndex + 1;
      await client.query(
        `INSERT INTO petra.citation_entries (
           citation_bundle_id, citation_bundle_revision, position,
           citation_id, bibliography_key, work_id, work_revision, work_hash,
           work_version_id, work_version_revision, work_version_hash,
           identity_status, metadata_completeness, processing_depth,
           record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16::jsonb
         )`,
        [
          bundle.citation_bundle_id,
          bundle.revision,
          position,
          citation.citation_id,
          citation.bibliography_key,
          citation.work_ref.work_id,
          citation.work_ref.revision,
          citation.work_ref.content_hash,
          citation.work_version_ref.work_version_id,
          citation.work_version_ref.revision,
          citation.work_version_ref.content_hash,
          citation.identity_status,
          citation.metadata_completeness,
          citation.source_access.processing_depth,
          canonicalHash(citation),
          JSON.stringify(citation),
        ],
      );
      for (const [authorIndex, author] of citation.author_refs.entries()) {
        await client.query(
          `INSERT INTO petra.citation_author_refs (
             citation_bundle_id, citation_bundle_revision, citation_position,
             author_position, author_id, author_revision, author_hash,
             display_name
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            bundle.citation_bundle_id,
            bundle.revision,
            position,
            authorIndex + 1,
            author.author_id,
            author.revision,
            author.content_hash,
            author.display_name,
          ],
        );
      }
      for (const [
        identifierIndex,
        identifier,
      ] of citation.external_identifier_refs.entries()) {
        await client.query(
          `INSERT INTO petra.citation_external_identifier_refs (
             citation_bundle_id, citation_bundle_revision, citation_position,
             identifier_position, external_identifier_id,
             external_identifier_revision, external_identifier_hash,
             namespace, normalized_value, verification_status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            bundle.citation_bundle_id,
            bundle.revision,
            position,
            identifierIndex + 1,
            identifier.external_identifier_id,
            identifier.revision,
            identifier.content_hash,
            identifier.namespace,
            identifier.normalized_value,
            identifier.verification_status,
          ],
        );
      }
      for (const [
        spanIndex,
        spanId,
      ] of citation.linked_draft_span_ids.entries()) {
        await client.query(
          `INSERT INTO petra.citation_linked_spans (
             citation_bundle_id, citation_bundle_revision, citation_position,
             span_position, draft_span_id, draft_span_revision
           ) VALUES ($1, $2, $3, $4, $5, 1)`,
          [
            bundle.citation_bundle_id,
            bundle.revision,
            position,
            spanIndex + 1,
            spanId,
          ],
        );
      }
      for (const [
        sourceIndex,
        sourceSpanId,
      ] of citation.source_access.source_span_ids.entries()) {
        await client.query(
          `INSERT INTO petra.citation_source_spans (
             citation_bundle_id, citation_bundle_revision, citation_position,
             source_span_position, source_span_id
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            bundle.citation_bundle_id,
            bundle.revision,
            position,
            sourceIndex + 1,
            sourceSpanId,
          ],
        );
      }
    }
    for (const [
      index,
      artifact,
    ] of bundle.content.bibliography_artifacts.entries()) {
      await client.query(
        `INSERT INTO petra.citation_bibliography_artifacts (
           citation_bundle_id, citation_bundle_revision, position,
           format, artifact_id, artifact_hash
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          bundle.citation_bundle_id,
          bundle.revision,
          index + 1,
          artifact.format,
          artifact.artifact_id,
          artifact.content_hash,
        ],
      );
    }
  }

  async #insertDependencies(
    client: PoolClient,
    input: RegisterCompositionInput,
  ): Promise<void> {
    const dependencies = this.#dependencies(input);
    for (const [index, dependency] of dependencies.entries()) {
      await client.query(
        `INSERT INTO petra.draft_authority_dependencies (
           draft_artifact_id, draft_artifact_revision, position,
           dependency_role, object_kind, object_id, object_revision,
           object_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          input.draft.draft_artifact_id,
          input.draft.revision,
          index + 1,
          dependency.role,
          dependency.kind,
          dependency.id,
          dependency.revision,
          dependency.hash,
        ],
      );
    }
  }

  #dependencies(input: RegisterCompositionInput): AuthorityDependency[] {
    const dependencies = new Map<string, AuthorityDependency>();
    const usedEvidenceOrders = new Set<number>();
    const add = (dependency: AuthorityDependency): void => {
      dependencies.set(dependencyKey(dependency), dependency);
    };
    const addObjectRef = (
      role: AuthorityDependency["role"],
      ref: ContextObjectRef,
    ): void => {
      add({
        role,
        kind: ref.object_kind,
        id: ref.object_id,
        revision: ref.object_revision,
        hash: ref.object_hash,
      });
    };
    for (const mapping of input.provenanceMap.content.mappings) {
      for (const basis of mapping.bases) {
        this.#collectProvenanceBasis(basis, usedEvidenceOrders, addObjectRef);
      }
    }
    const evidenceByOrder = new Map(
      this.#packets
        .getEvidencePacket(input.draft.evidence_packet_ref.evidence_packet_id)
        ?.content.selected_evidence.map((selection) => [
          selection.context_selection_order,
          selection,
        ]) ?? [],
    );
    for (const order of usedEvidenceOrders) {
      const selection = evidenceByOrder.get(order);
      if (selection === undefined) continue;
      addObjectRef("provenance", clone(selection.object_ref));
      for (const sourceOrder of selection.source_span_selection_orders) {
        const source = evidenceByOrder.get(sourceOrder);
        if (source !== undefined) {
          addObjectRef("provenance", clone(source.object_ref));
        }
      }
    }
    for (const citation of input.citationBundle.content.citations) {
      add({
        role: "citation",
        kind: "work",
        id: citation.work_ref.work_id,
        revision: citation.work_ref.revision,
        hash: citation.work_ref.content_hash,
      });
      add({
        role: "citation",
        kind: "work_version",
        id: citation.work_version_ref.work_version_id,
        revision: citation.work_version_ref.revision,
        hash: citation.work_version_ref.content_hash,
      });
      for (const author of citation.author_refs) {
        add({
          role: "citation",
          kind: "author",
          id: author.author_id,
          revision: author.revision,
          hash: author.content_hash,
        });
      }
      for (const identifier of citation.external_identifier_refs) {
        add({
          role: "citation",
          kind: "external_identifier",
          id: identifier.external_identifier_id,
          revision: identifier.revision,
          hash: identifier.content_hash,
        });
      }
    }
    return [...dependencies.values()].sort((left, right) =>
      dependencyKey(left).localeCompare(dependencyKey(right)),
    );
  }

  #collectProvenanceBasis(
    basis: ProvenanceBasis,
    usedOrders: Set<number>,
    addObjectRef: (
      role: AuthorityDependency["role"],
      ref: ContextObjectRef,
    ) => void,
  ): void {
    if (basis.basis_kind === "evidence") {
      usedOrders.add(basis.evidence_selection_order);
      addObjectRef("provenance", basis.object_ref);
    } else if (basis.basis_kind === "petra_inference") {
      for (const order of basis.evidence_selection_orders)
        usedOrders.add(order);
    }
  }

  async #loadAggregate(
    client: PoolClient,
    draftArtifactId: string,
    revision: number,
  ): Promise<CompositionAggregate> {
    const draftRow = await this.#selectDraft(client, draftArtifactId, revision);
    if (draftRow === undefined) {
      throw new CompositionAggregatePersistenceError(
        "COMPOSITION_AGGREGATE_REFERENCE_MISSING",
        "The requested DraftArtifact revision does not exist.",
      );
    }
    this.#assertStoredRecord(draftRow, "DraftArtifact");
    this.#contracts.assertValid("draft-artifact", "1.0.0", draftRow.payload);
    const draft = clone(draftRow.payload) as PetraDraftArtifact;
    const [spanResult, provenanceResult, citationResult] = await Promise.all([
      client.query<StoredRow>(
        `SELECT record_hash, payload
           FROM petra.draft_spans
          WHERE draft_artifact_id = $1 AND draft_artifact_revision = $2`,
        [draftArtifactId, revision],
      ),
      client.query<StoredRow>(
        `SELECT record_hash, payload
           FROM petra.provenance_maps
          WHERE provenance_map_id = $1 AND revision = $2`,
        [
          draft.provenance_map_ref.provenance_map_id,
          draft.provenance_map_ref.revision,
        ],
      ),
      client.query<StoredRow>(
        `SELECT record_hash, payload
           FROM petra.citation_bundles
          WHERE citation_bundle_id = $1 AND revision = $2`,
        [
          draft.citation_bundle_ref.citation_bundle_id,
          draft.citation_bundle_ref.revision,
        ],
      ),
    ]);
    const spansById = new Map<string, PetraDraftSpan>();
    for (const row of spanResult.rows) {
      this.#assertStoredRecord(row, "DraftSpan");
      this.#contracts.assertValid("draft-span", "1.0.0", row.payload);
      const span = clone(row.payload) as PetraDraftSpan;
      spansById.set(span.draft_span_id, span);
    }
    const spans = draft.content.draft_span_ids.map((id) => spansById.get(id));
    const provenanceRow = provenanceResult.rows[0];
    const citationRow = citationResult.rows[0];
    if (
      spans.some((span) => span === undefined) ||
      spansById.size !== spans.length ||
      provenanceRow === undefined ||
      citationRow === undefined
    ) {
      throw new CompositionAggregatePersistenceError(
        "COMPOSITION_AGGREGATE_STORED_RECORD_CORRUPT",
        "The stored aggregate is missing one or more declared components.",
      );
    }
    this.#assertStoredRecord(provenanceRow, "ProvenanceMap");
    this.#assertStoredRecord(citationRow, "CitationBundle");
    this.#contracts.assertValid(
      "provenance-map",
      "1.0.0",
      provenanceRow.payload,
    );
    this.#contracts.assertValid(
      "citation-bundle",
      "1.0.0",
      citationRow.payload,
    );
    const aggregate: CompositionAggregate = {
      draft,
      spans: spans as PetraDraftSpan[],
      provenanceMap: clone(provenanceRow.payload) as PetraProvenanceMap,
      citationBundle: clone(citationRow.payload) as PetraCitationBundle,
    };
    if (draftRow.aggregate_hash !== canonicalHash(aggregate)) {
      throw new CompositionAggregatePersistenceError(
        "COMPOSITION_AGGREGATE_STORED_RECORD_CORRUPT",
        "The stored composition components no longer match the aggregate hash.",
      );
    }
    return aggregate;
  }

  async #selectDraft(
    client: PoolClient,
    draftArtifactId: string,
    revision: number,
  ): Promise<StoredDraftRow | undefined> {
    const result = await client.query<StoredDraftRow>(
      `SELECT aggregate_hash, record_hash, payload
         FROM petra.draft_artifact_revisions
        WHERE draft_artifact_id = $1 AND revision = $2`,
      [draftArtifactId, revision],
    );
    return result.rows[0];
  }

  async #selectStored(
    client: PoolClient,
    table: string,
    idColumn: string,
    id: string,
  ): Promise<StoredRow | undefined> {
    const allowed = new Map([
      ["petra.composition_requests", "composition_request_id"],
      ["petra.composition_plans", "composition_plan_id"],
      ["petra.evidence_packets", "evidence_packet_id"],
    ]);
    if (allowed.get(table) !== idColumn) {
      throw new Error("Unsupported composition aggregate table selection.");
    }
    const result = await client.query<StoredRow>(
      `SELECT record_hash, payload FROM ${table} WHERE ${idColumn} = $1`,
      [id],
    );
    return result.rows[0];
  }

  #assertStoredRecord(row: StoredRow, label: string): void {
    if (row.record_hash !== canonicalHash(row.payload)) {
      throw new CompositionAggregatePersistenceError(
        "COMPOSITION_AGGREGATE_STORED_RECORD_CORRUPT",
        `${label} payload no longer matches its stored canonical record hash.`,
      );
    }
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
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
      await client.query("BEGIN");
      const value = await operation(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
