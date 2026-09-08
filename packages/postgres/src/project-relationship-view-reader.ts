import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraAssertion,
  PetraClaim,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectRelationshipView,
  PetraProjectionCheckpoint,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWork,
  PetraWorkVersion,
  ProjectRelationship,
  ProjectRelationshipNode,
  ProjectRelationshipSourceDestination,
  ProjectRelationshipViewContent,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  AuthorityGraphFreshness,
  AuthorityGraphNeighbor,
  AuthorityGraphObjectView,
  AuthorityGraphStore,
  ProjectRelationshipViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectRelationshipViewErrorCode =
  | "PROJECT_RELATIONSHIP_DEFINITION_MISSING"
  | "PROJECT_RELATIONSHIP_PROJECTION_INCOHERENT"
  | "PROJECT_RELATIONSHIP_PATH_UNSUPPORTED"
  | "PROJECT_RELATIONSHIP_STORED_RECORD_CORRUPT";

export class PostgresProjectRelationshipViewError extends Error {
  readonly code: PostgresProjectRelationshipViewErrorCode;

  constructor(code: PostgresProjectRelationshipViewErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectRelationshipViewError";
    this.code = code;
  }
}

interface ProjectContextRow {
  project_id: string;
  definition_payload: unknown;
  definition_record_hash: string | null;
  objective_payload: unknown;
  objective_record_hash: string | null;
}

interface PayloadHashRow {
  payload: unknown;
  record_hash: string;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

interface ObservedHeadRow {
  target_sequence: string;
  event_position: string;
  stream_revision: string;
}

interface SourceBindingRow {
  project_source_id: string;
  status: "active" | "excluded";
  structural_block_payload: unknown;
  structural_block_record_hash: string;
}

interface SourceContext {
  projectSourceId: string;
  status: "active" | "excluded";
  block: PetraStructuralBlock;
}

interface ExactPathRecords {
  assertion: PetraAssertion;
  claim: PetraClaim;
  workVersion: PetraWorkVersion;
  work: PetraWork;
  spans: PetraSourceSpan[];
  artifacts: PetraArtifact[];
  sourcesBySpan: Map<string, SourceContext>;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const titleCase = (value: string): string =>
  value
    .toLocaleLowerCase()
    .split("_")
    .map((part) => `${part.slice(0, 1).toLocaleUpperCase()}${part.slice(1)}`)
    .join(" ");

const exactSet = (values: readonly string[]): Set<string> => new Set(values);

const sameMembers = (
  left: readonly string[],
  right: readonly string[],
): boolean => {
  const leftSet = exactSet(left);
  const rightSet = exactSet(right);
  return (
    leftSet.size === left.length &&
    rightSet.size === right.length &&
    leftSet.size === rightSet.size &&
    [...leftSet].every((member) => rightSet.has(member))
  );
};

const selectedText = (span: PetraSourceSpan): string | undefined => {
  if (span.selector.selector_type === "text_quote") {
    return span.selector.quote.exact_text;
  }
  if (span.selector.selector_type !== "compound") return undefined;
  return span.selector.components.find(
    (component) => component.component_kind === "text_quote",
  )?.quote.exact_text;
};

const pageNumber = (span: PetraSourceSpan): number | undefined => {
  if (span.selector.selector_type === "page_region") {
    return span.selector.page_region.page_number;
  }
  if (span.selector.selector_type !== "compound") return undefined;
  return span.selector.components.find(
    (component) => component.component_kind === "page_region",
  )?.page_region.page_number;
};

const sourceDestination = (
  source: SourceContext | undefined,
): ProjectRelationshipSourceDestination | undefined =>
  source === undefined
    ? undefined
    : {
        project_source_id: source.projectSourceId,
        status: source.status,
        label:
          source.status === "active"
            ? "Open exact Source"
            : "Inspect retained excluded Source",
      };

const relationshipLabel = (
  predicate: ProjectRelationship["predicate"],
): string =>
  ({
    ASSERTS: "asserts",
    GROUNDED_IN: "grounded in",
    LOCATED_IN: "located in",
    VERSION_OF: "version of",
  })[predicate];

export class PostgresProjectRelationshipViewReader implements ProjectRelationshipViewReader {
  readonly #pool: Pool;
  readonly #graph: AuthorityGraphStore;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    graph: AuthorityGraphStore,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#graph = graph;
    this.#contracts = contracts;
  }

  async getProjectRelationshipView(
    projectId: string,
  ): Promise<PetraProjectRelationshipView | undefined> {
    return this.#readTransaction(async (client, readAt) => {
      const context = await this.#projectContext(client, projectId);
      if (context === undefined) return undefined;
      if (
        context.definition_payload === null ||
        context.definition_record_hash === null
      ) {
        throw new PostgresProjectRelationshipViewError(
          "PROJECT_RELATIONSHIP_DEFINITION_MISSING",
          "A Project relationship result requires an exact current ProjectDefinition.",
        );
      }
      const definition = this.#storedRecord<PetraProjectDefinition>(
        "project-definition",
        context.definition_payload,
        context.definition_record_hash,
      );
      if (definition.project_id !== projectId) {
        throw this.#corrupt("The graph definition belongs to another Project.");
      }
      this.#assertScientificDefinition(definition);
      const objective =
        context.objective_payload === null ||
        context.objective_record_hash === null
          ? undefined
          : this.#storedRecord<PetraProjectObjective>(
              "project-objective",
              context.objective_payload,
              context.objective_record_hash,
            );
      if (
        objective !== undefined &&
        (objective.project_id !== projectId ||
          objective.project_definition_ref.project_definition_id !==
            definition.project_definition_id ||
          objective.project_definition_ref.revision !== definition.revision ||
          objective.project_definition_ref.content_hash !==
            definition.content_hash)
      ) {
        throw this.#corrupt(
          "The focused Objective does not resolve through the current ProjectDefinition.",
        );
      }

      const checkpoint = await this.#checkpoint(client, projectId);
      if (
        checkpoint === undefined ||
        checkpoint.content.position.position_kind === "empty"
      ) {
        return undefined;
      }
      const authority = await this.#authority(client, projectId);
      const observed = await this.#observedHead(client, projectId);
      if (observed === undefined) {
        throw this.#projectionIncoherent(
          "The Project has an advanced graph checkpoint but no authoritative graph outbox head.",
        );
      }
      const represented = checkpoint.content.position;
      if (
        represented.target_sequence > observed.targetSequence ||
        represented.event_position > observed.eventPosition ||
        represented.stream_revision > observed.streamRevision
      ) {
        throw this.#projectionIncoherent(
          "The graph checkpoint is ahead of the authoritative Project outbox.",
        );
      }

      await this.#guardProjection(
        checkpoint,
        observed.targetSequence,
        represented.target_sequence,
        represented.stream_revision,
      );
      const assertions = await this.#graph.getProjectRelationships(projectId, {
        predicates: ["ASSERTS"],
        limit: 1,
      });
      const assertionEdge = assertions[0];
      if (assertionEdge === undefined) return undefined;
      this.#assertGraphRelationship(
        assertionEdge,
        "ASSERTS",
        assertionEdge.sourceId,
        assertionEdge.targetId,
      );
      if (
        assertionEdge.assertionId === undefined ||
        assertionEdge.id !== assertionEdge.assertionId
      ) {
        throw this.#projectionIncoherent(
          "The selected graph relationship is not bound to an exact Assertion identity.",
        );
      }
      const edgeTargetSequence = assertionEdge.properties.target_sequence;
      const edgeStreamRevision = assertionEdge.properties.stream_revision;
      const edgeEventPosition = assertionEdge.properties.event_position;
      if (
        assertionEdge.projectId !== projectId ||
        typeof edgeTargetSequence !== "number" ||
        edgeTargetSequence > represented.target_sequence ||
        typeof edgeStreamRevision !== "number" ||
        edgeStreamRevision > represented.stream_revision ||
        typeof edgeEventPosition !== "number" ||
        edgeEventPosition > represented.event_position
      ) {
        throw this.#projectionIncoherent(
          "The selected relationship does not belong to the represented Project position.",
        );
      }

      const path = await this.#graph.getProvenancePath(
        projectId,
        assertionEdge.assertionId,
      );
      if (path === undefined) {
        throw this.#projectionIncoherent(
          "The selected ASSERTS relationship has no complete projected provenance path.",
        );
      }
      if (
        path.assertion.id !== assertionEdge.id ||
        path.assertion.recordHash !== assertionEdge.recordHash
      ) {
        throw this.#projectionIncoherent(
          "The graph returned two different representations of the selected Assertion.",
        );
      }
      if (path.sourceSpans.length > 100) {
        throw new PostgresProjectRelationshipViewError(
          "PROJECT_RELATIONSHIP_PATH_UNSUPPORTED",
          "The current bounded reader supports at most 100 SourceSpans in one selected provenance path.",
        );
      }

      const records = await this.#exactPathRecords(client, projectId, path);
      const relationships = await this.#exactRelationships(
        projectId,
        path,
        records,
      );
      await this.#guardProjection(
        checkpoint,
        observed.targetSequence,
        represented.target_sequence,
        represented.stream_revision,
      );

      const nodes = this.#nodes(path, records);
      const question =
        objective?.content.statement ??
        "How is the selected Claim grounded in its exact source?";
      const scope =
        "One current Claim-ASSERTS relationship and its retained WorkVersion, Work, SourceSpan, and Artifact provenance path.";
      const queryInput = {
        query_kind: "scientific_provenance_path" as const,
        question,
        scope,
        focus_ref: {
          record_id: records.assertion.assertion_id,
          revision: records.assertion.revision,
          record_hash: assertionEdge.recordHash,
        },
        ...(objective === undefined
          ? {}
          : {
              objective_ref: {
                record_id: objective.objective_id,
                revision: objective.revision,
                record_hash: canonicalHash(objective),
              },
            }),
        requested_position: "current_authority" as const,
        maximum_depth: 3 as const,
      };
      const projectionState = this.#projectionState(
        checkpoint,
        represented.target_sequence,
        observed.targetSequence,
      );
      const pendingRecords =
        observed.targetSequence - represented.target_sequence;
      const projectionDetail =
        projectionState === "current"
          ? `The graph represents Project stream revision ${represented.stream_revision} at authoritative event ${represented.event_position}.`
          : projectionState === "catching_up"
            ? `The graph safely represents Project stream revision ${represented.stream_revision} at event ${represented.event_position}; ${pendingRecords} ${pendingRecords === 1 ? "record is" : "records are"} pending through Project stream revision ${observed.streamRevision}.`
            : checkpoint.content.freshness.state === "blocked"
              ? checkpoint.content.freshness.message
              : "The graph projection is blocked at its last exact represented position.";
      const findingTerm = this.#term(definition, "finding", "Claim");
      const sourceTerm = this.#term(definition, "reference", "Source");
      const content: ProjectRelationshipViewContent = {
        query: { request_hash: canonicalHash(queryInput), ...queryInput },
        profile: {
          project_definition_ref: {
            record_id: definition.project_definition_id,
            revision: definition.revision,
            content_hash: definition.content_hash,
          },
          label: definition.content.label,
          object_term: findingTerm,
          relationship_term: "Relationship",
          source_term: sourceTerm,
        },
        capabilities: {
          current: "available",
          working: "unavailable",
          historical: "unavailable",
          comparison: "unavailable",
          expansion: "unavailable",
          continuation: "unavailable",
          text_peer: "available",
        },
        position: {
          isolation: "repeatable_read_with_projection_guard",
          authority: {
            event_position: authority.eventPosition,
            stream_revision: authority.streamRevision,
          },
          projection: {
            checkpoint_ref: {
              record_id: checkpoint.projection_checkpoint_id,
              revision: checkpoint.revision,
              content_hash: checkpoint.content_hash,
            },
            state: projectionState,
            represented_event_position: represented.event_position,
            represented_stream_revision: represented.stream_revision,
            represented_target_sequence: represented.target_sequence,
            observed_event_position: observed.eventPosition,
            observed_stream_revision: observed.streamRevision,
            observed_target_sequence: observed.targetSequence,
            pending_records: pendingRecords,
            detail: projectionDetail,
            ...(checkpoint.content.freshness.state === "blocked"
              ? {
                  failure_code: checkpoint.content.freshness.failure_code,
                }
              : {}),
          },
        },
        layer: "current",
        nodes: nodes as ProjectRelationshipViewContent["nodes"],
        relationships:
          relationships as ProjectRelationshipViewContent["relationships"],
        path: {
          path_kind: "scientific_provenance",
          state: "complete_for_selected_relationship",
          ordering_rationale:
            "The selected ASSERTS relationship is shown first, followed by Claim grounding, Artifact location, and Work identity context.",
          steps: this.#pathSteps(relationships),
        },
        completeness: {
          state: "complete_for_selected_relationship",
          scope:
            "Complete for the selected ASSERTS relationship and its recorded provenance path; not a whole-Project graph.",
          returned_nodes: nodes.length,
          returned_relationships: relationships.length,
          known_path_nodes: nodes.length,
          known_path_relationships: relationships.length,
          filtered_members: 0,
          hidden_working_members: 0,
          traversal_limit: 3,
          omissions: [
            "Working and historical layers, comparison, expansion, continuation, and whole-Project totals are unavailable in version 1.0.",
          ],
        },
        limitations: [
          "This current-only projection result does not reconstruct historical positions or include unapplied Review candidates.",
          "Graph position and line length are client-owned presentation and carry no authority or scientific meaning.",
        ],
      };
      const view: PetraProjectRelationshipView = {
        schema_name: "petra.project-relationship-view",
        schema_version: "1.0.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid("project-relationship-view", "1.0.0", view);
      return view;
    });
  }

  async #projectContext(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectContextRow | undefined> {
    const result = await client.query<ProjectContextRow>(
      `SELECT project.project_id,
              definition_revision.payload AS definition_payload,
              definition_revision.record_hash AS definition_record_hash,
              objective_revision.payload AS objective_payload,
              objective_revision.record_hash AS objective_record_hash
         FROM petra.projects AS project
         LEFT JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         LEFT JOIN petra.project_definition_revisions AS definition_revision
           ON definition_revision.project_definition_id =
                definition.project_definition_id
          AND definition_revision.revision = definition.current_revision
         LEFT JOIN petra.project_objective_focus AS focus
           ON focus.project_id = project.project_id
         LEFT JOIN petra.project_objective_revisions AS objective_revision
           ON objective_revision.project_id = focus.project_id
          AND objective_revision.objective_id = focus.objective_id
          AND objective_revision.revision = focus.objective_revision
          AND objective_revision.content_hash = focus.objective_content_hash
        WHERE project.project_id = $1`,
      [projectId],
    );
    return result.rows[0];
  }

  async #checkpoint(
    client: PoolClient,
    projectId: string,
  ): Promise<PetraProjectionCheckpoint | undefined> {
    const result = await client.query<PayloadHashRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.projection_checkpoints AS head
         JOIN petra.projection_checkpoint_revisions AS revision
           ON revision.projection_checkpoint_id = head.projection_checkpoint_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.target = 'neo4j_graph'
          AND head.projection_name = 'petra.authority_graph'
        ORDER BY revision.recorded_at DESC
        LIMIT 1`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const checkpoint = this.#storedRecord<PetraProjectionCheckpoint>(
      "projection-checkpoint",
      row.payload,
      row.record_hash,
    );
    if (
      checkpoint.project_id !== projectId ||
      checkpoint.content_hash !== canonicalHash(checkpoint.content)
    ) {
      throw this.#corrupt("The graph checkpoint record is corrupt.");
    }
    return checkpoint;
  }

  async #authority(
    client: PoolClient,
    projectId: string,
  ): Promise<{ eventPosition: number; streamRevision: number }> {
    const result = await client.query<AuthorityRow>(
      `SELECT authority.event_position::text,
              stream.current_stream_revision::text AS stream_revision
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
      eventPosition: Number(row.event_position),
      streamRevision: Number(row.stream_revision ?? 0),
    };
  }

  async #observedHead(
    client: PoolClient,
    projectId: string,
  ): Promise<
    | { targetSequence: number; eventPosition: number; streamRevision: number }
    | undefined
  > {
    const result = await client.query<ObservedHeadRow>(
      `SELECT head.current_target_sequence::text AS target_sequence,
              event.event_position::text,
              event.stream_revision::text
         FROM petra.outbox_target_heads AS head
         JOIN petra.outbox_records AS outbox
           ON outbox.target = head.target
          AND outbox.partition_key = head.project_id
          AND outbox.target_sequence = head.current_target_sequence
         JOIN petra.domain_events AS event
           ON event.event_id = outbox.event_id
          AND event.project_id = head.project_id
        WHERE head.target = 'neo4j_graph' AND head.project_id = $1`,
      [projectId],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : {
          targetSequence: Number(row.target_sequence),
          eventPosition: Number(row.event_position),
          streamRevision: Number(row.stream_revision),
        };
  }

  async #guardProjection(
    checkpoint: PetraProjectionCheckpoint,
    observedTargetSequence: number,
    representedTargetSequence: number,
    representedStreamRevision: number,
  ): Promise<void> {
    const freshness = await this.#graph.getFreshness(
      checkpoint.project_id,
      checkpoint.projection,
      observedTargetSequence,
    );
    this.#assertFreshness(
      freshness,
      representedTargetSequence,
      representedStreamRevision,
    );
  }

  #assertFreshness(
    freshness: AuthorityGraphFreshness,
    representedTargetSequence: number,
    representedStreamRevision: number,
  ): void {
    if (
      freshness.state === "ahead_invalid" ||
      freshness.projectedTargetSequence !== representedTargetSequence ||
      freshness.projectedStreamRevision !== representedStreamRevision
    ) {
      throw this.#projectionIncoherent(
        "Neo4j and the authoritative PostgreSQL graph checkpoint do not identify the same represented position.",
      );
    }
  }

  async #exactPathRecords(
    client: PoolClient,
    projectId: string,
    path: NonNullable<
      Awaited<ReturnType<AuthorityGraphStore["getProvenancePath"]>>
    >,
  ): Promise<ExactPathRecords> {
    this.#assertGraphNode(path.work, "Work");
    this.#assertGraphNode(path.workVersion, "WorkVersion");
    this.#assertGraphNode(path.claim, "Claim");
    for (const span of path.sourceSpans)
      this.#assertGraphNode(span, "SourceSpan");
    for (const artifact of path.artifacts)
      this.#assertGraphNode(artifact, "Artifact");

    const [assertion, claim, workVersion, work] = await Promise.all([
      this.#evidenceRecord<PetraAssertion>(client, "assertion", path.assertion),
      this.#evidenceRecord<PetraClaim>(client, "claim", path.claim),
      this.#canonicalRecord<PetraWorkVersion>(
        client,
        "work-version",
        "work_version",
        path.workVersion,
      ),
      this.#canonicalRecord<PetraWork>(client, "work", "work", path.work),
    ]);
    if (
      assertion.predicate !== "ASSERTS" ||
      assertion.object.object_kind !== "entity" ||
      assertion.object.entity_id !== claim.claim_id ||
      assertion.subject_id !== workVersion.work_version_id ||
      workVersion.work_id !== work.work_id ||
      claim.basis.basis_kind !== "source" ||
      claim.basis.work_version_id !== workVersion.work_version_id ||
      assertion.authority.zone !== "trusted" ||
      claim.authority.zone !== "trusted"
    ) {
      throw this.#projectionIncoherent(
        "The represented path is not one exact trusted source-grounded Claim-ASSERTS relationship.",
      );
    }
    if (
      !sameMembers(
        claim.basis.source_span_ids,
        path.sourceSpans.map((span) => span.id),
      )
    ) {
      throw this.#projectionIncoherent(
        "The projected provenance path does not contain the Claim's exact SourceSpan set.",
      );
    }

    const spans: PetraSourceSpan[] = [];
    const sourcesBySpan = new Map<string, SourceContext>();
    for (const graphSpan of path.sourceSpans) {
      const span = await this.#sourceSpanRecord(client, graphSpan);
      const source = await this.#sourceContext(
        client,
        projectId,
        workVersion.work_version_id,
        span,
      );
      spans.push(span);
      sourcesBySpan.set(span.source_span_id, source);
    }
    const artifacts: PetraArtifact[] = [];
    for (const graphArtifact of path.artifacts) {
      artifacts.push(await this.#artifactRecord(client, graphArtifact));
    }
    if (
      !sameMembers(
        [...new Set(spans.map((span) => span.artifact_id))],
        artifacts.map((artifact) => artifact.artifact_id),
      ) ||
      spans.some(
        (span) =>
          artifacts.find(
            (artifact) => artifact.artifact_id === span.artifact_id,
          )?.content_hash !== span.artifact_content_hash,
      )
    ) {
      throw this.#projectionIncoherent(
        "The projected SourceSpan and Artifact nodes do not reproduce exact authoritative byte identities.",
      );
    }
    return {
      assertion,
      claim,
      workVersion,
      work,
      spans,
      artifacts,
      sourcesBySpan,
    };
  }

  async #evidenceRecord<Value extends PetraClaim | PetraAssertion>(
    client: PoolClient,
    kind: "claim" | "assertion",
    graphObject: AuthorityGraphObjectView,
  ): Promise<Value> {
    const result = await client.query<PayloadHashRow>(
      `SELECT payload, record_hash
         FROM petra.evidence_entity_revisions
        WHERE evidence_id = $1 AND evidence_kind = $2 AND revision = $3`,
      [graphObject.id, kind, graphObject.authoritativeRevision],
    );
    return this.#exactGraphRecord<Value>(kind, result.rows[0], graphObject);
  }

  async #canonicalRecord<Value>(
    client: PoolClient,
    schemaName: string,
    entityKind: string,
    graphObject: AuthorityGraphObjectView,
  ): Promise<Value> {
    const result = await client.query<PayloadHashRow>(
      `SELECT payload, record_hash
         FROM petra.canonical_entity_revisions
        WHERE entity_id = $1 AND entity_kind = $2 AND revision = $3`,
      [graphObject.id, entityKind, graphObject.authoritativeRevision],
    );
    return this.#exactGraphRecord<Value>(
      schemaName,
      result.rows[0],
      graphObject,
    );
  }

  async #sourceSpanRecord(
    client: PoolClient,
    graphObject: AuthorityGraphObjectView,
  ): Promise<PetraSourceSpan> {
    const result = await client.query<PayloadHashRow>(
      `SELECT payload, record_hash
         FROM petra.source_spans
        WHERE source_span_id = $1 AND revision = $2`,
      [graphObject.id, graphObject.authoritativeRevision],
    );
    return this.#exactGraphRecord<PetraSourceSpan>(
      "source-span",
      result.rows[0],
      graphObject,
    );
  }

  async #artifactRecord(
    client: PoolClient,
    graphObject: AuthorityGraphObjectView,
  ): Promise<PetraArtifact> {
    const result = await client.query<PayloadHashRow>(
      `SELECT payload, record_hash
         FROM petra.artifacts
        WHERE artifact_id = $1 AND revision = $2`,
      [graphObject.id, graphObject.authoritativeRevision],
    );
    return this.#exactGraphRecord<PetraArtifact>(
      "artifact",
      result.rows[0],
      graphObject,
    );
  }

  #exactGraphRecord<Value>(
    schemaName: string,
    row: PayloadHashRow | undefined,
    graphObject: AuthorityGraphObjectView,
  ): Value {
    if (
      row === undefined ||
      row.record_hash !== graphObject.recordHash ||
      canonicalHash(row.payload) !== row.record_hash
    ) {
      throw this.#projectionIncoherent(
        `Projected ${graphObject.kind} ${graphObject.id} does not resolve to its exact PostgreSQL authority record.`,
      );
    }
    this.#contracts.assertValid(schemaName, "1.0.0", row.payload);
    return clone(row.payload as Value);
  }

  async #sourceContext(
    client: PoolClient,
    projectId: string,
    workVersionId: string,
    span: PetraSourceSpan,
  ): Promise<SourceContext> {
    const result = await client.query<SourceBindingRow>(
      `SELECT source.project_source_id, binding.status,
              block.payload AS structural_block_payload,
              block.record_hash AS structural_block_record_hash
         FROM petra.source_spans AS exact_span
         JOIN petra.structural_blocks AS block
           ON block.parsed_document_id = exact_span.parsed_document_id
          AND block.structural_block_id = exact_span.structural_block_id
         JOIN petra.parsed_documents AS document
           ON document.parsed_document_id = exact_span.parsed_document_id
         JOIN petra.project_sources AS source
           ON source.project_id = $1
         JOIN petra.project_source_revisions AS binding
           ON binding.project_source_id = source.project_source_id
          AND binding.revision = source.current_revision
          AND binding.work_version_id = $2
          AND binding.artifact_manifest_id = document.source_artifact_manifest_id
        WHERE exact_span.source_span_id = $3
          AND exact_span.revision = $4`,
      [projectId, workVersionId, span.source_span_id, span.revision],
    );
    const row = result.rows[0];
    if (row === undefined || result.rows.length !== 1) {
      throw this.#projectionIncoherent(
        "A projected SourceSpan does not resolve through one exact ProjectSource binding.",
      );
    }
    const block = this.#storedRecord<PetraStructuralBlock>(
      "structural-block",
      row.structural_block_payload,
      row.structural_block_record_hash,
    );
    if (block.content.content_kind !== "text") {
      throw new PostgresProjectRelationshipViewError(
        "PROJECT_RELATIONSHIP_PATH_UNSUPPORTED",
        "The current scientific text peer requires an inspectable textual StructuralBlock.",
      );
    }
    return {
      projectSourceId: row.project_source_id,
      status: row.status,
      block,
    };
  }

  async #exactRelationships(
    projectId: string,
    path: NonNullable<
      Awaited<ReturnType<AuthorityGraphStore["getProvenancePath"]>>
    >,
    records: ExactPathRecords,
  ): Promise<ProjectRelationship[]> {
    const assertion = this.#relationship(
      path.assertion,
      "ASSERTS",
      records.workVersion.work_version_id,
      records.claim.claim_id,
      canonicalHash(records.assertion),
      "The WorkVersion states this exact Claim.",
      `Trusted ${titleCase(records.assertion.assertion_kind)} Assertion revision ${records.assertion.revision} with human acceptance.`,
      records.assertion.assertion_id,
    );

    const versionNeighbors = await this.#graph.getNeighborhood(
      projectId,
      records.workVersion.work_version_id,
      { direction: "outgoing", predicates: ["VERSION_OF"], limit: 100 },
    );
    const versionEdge = this.#singleNeighbor(
      versionNeighbors,
      "VERSION_OF",
      records.workVersion.work_version_id,
      records.work.work_id,
    );
    const versionEdgeId = `version:${records.workVersion.work_version_id}:of:${records.work.work_id}`;
    const version = this.#relationship(
      versionEdge.relationship,
      "VERSION_OF",
      records.workVersion.work_version_id,
      records.work.work_id,
      canonicalHash({
        edgeId: versionEdgeId,
        sourceRecord: records.workVersion,
      }),
      "The represented WorkVersion belongs to this Work identity.",
      `WorkVersion revision ${records.workVersion.revision}.`,
    );

    const groundingNeighbors = await this.#graph.getNeighborhood(
      projectId,
      records.claim.claim_id,
      { direction: "outgoing", predicates: ["GROUNDED_IN"], limit: 100 },
    );
    if (
      !sameMembers(
        groundingNeighbors.map((neighbor) => neighbor.node.id),
        records.spans.map((span) => span.source_span_id),
      )
    ) {
      throw this.#projectionIncoherent(
        "The Claim grounding relationships do not reproduce its exact SourceSpan membership.",
      );
    }
    const relationships: ProjectRelationship[] = [assertion];
    for (const span of records.spans) {
      const grounding = this.#singleNeighbor(
        groundingNeighbors,
        "GROUNDED_IN",
        records.claim.claim_id,
        span.source_span_id,
      );
      const groundingEdgeId = `claim:${records.claim.claim_id}:grounded-in:${span.source_span_id}`;
      relationships.push(
        this.#relationship(
          grounding.relationship,
          "GROUNDED_IN",
          records.claim.claim_id,
          span.source_span_id,
          canonicalHash({
            edgeId: groundingEdgeId,
            sourceRecord: { claim: records.claim, spanId: span.source_span_id },
          }),
          "The Claim identifies this exact SourceSpan as its principal basis.",
          `Claim revision ${records.claim.revision} source basis.`,
        ),
      );
      const locationNeighbors = await this.#graph.getNeighborhood(
        projectId,
        span.source_span_id,
        { direction: "outgoing", predicates: ["LOCATED_IN"], limit: 100 },
      );
      const location = this.#singleNeighbor(
        locationNeighbors,
        "LOCATED_IN",
        span.source_span_id,
        span.artifact_id,
      );
      const locationEdgeId = `span:${span.source_span_id}:located-in:${span.artifact_id}`;
      relationships.push(
        this.#relationship(
          location.relationship,
          "LOCATED_IN",
          span.source_span_id,
          span.artifact_id,
          canonicalHash({ edgeId: locationEdgeId, sourceRecord: span }),
          "The SourceSpan selects material from this exact Artifact.",
          `SourceSpan revision ${span.revision} and its Artifact content hash.`,
        ),
      );
    }
    relationships.push(version);
    return relationships;
  }

  #singleNeighbor(
    neighbors: readonly AuthorityGraphNeighbor[],
    predicate: ProjectRelationship["predicate"],
    sourceId: string,
    targetId: string,
  ): AuthorityGraphNeighbor {
    const matches = neighbors.filter(
      (neighbor) =>
        neighbor.direction === "outgoing" &&
        neighbor.relationship.kind === predicate &&
        neighbor.relationship.sourceId === sourceId &&
        neighbor.relationship.targetId === targetId &&
        neighbor.node.id === targetId,
    );
    if (matches.length !== 1 || matches[0] === undefined) {
      throw this.#projectionIncoherent(
        `The projected ${predicate} relationship does not resolve exactly once.`,
      );
    }
    return matches[0];
  }

  #relationship(
    graphObject: AuthorityGraphObjectView,
    predicate: ProjectRelationship["predicate"],
    sourceId: string,
    targetId: string,
    expectedHash: string,
    summary: string,
    basis: string,
    assertionId?: string,
  ): ProjectRelationship {
    this.#assertGraphRelationship(graphObject, predicate, sourceId, targetId);
    if (graphObject.recordHash !== expectedHash) {
      throw this.#projectionIncoherent(
        `The projected ${predicate} relationship hash does not reproduce its exact authority basis.`,
      );
    }
    return {
      relationship_ref: {
        element_id: graphObject.id,
        revision: graphObject.authoritativeRevision,
        record_hash: graphObject.recordHash,
      },
      predicate,
      relation_class:
        predicate === "ASSERTS"
          ? "representation"
          : predicate === "GROUNDED_IN"
            ? "provenance"
            : "structural",
      source_id: sourceId,
      target_id: targetId,
      direction: "outgoing",
      label: relationshipLabel(predicate),
      summary,
      basis,
      layer: "current",
      ...(assertionId === undefined ? {} : { assertion_id: assertionId }),
    };
  }

  #nodes(
    path: NonNullable<
      Awaited<ReturnType<AuthorityGraphStore["getProvenancePath"]>>
    >,
    records: ExactPathRecords,
  ): ProjectRelationshipNode[] {
    const claimBasis = records.claim.basis;
    if (claimBasis.basis_kind !== "source") {
      throw this.#corrupt(
        "The selected scientific Claim no longer has a source basis.",
      );
    }
    const uniqueSources = new Map<string, SourceContext>();
    for (const source of records.sourcesBySpan.values()) {
      uniqueSources.set(source.projectSourceId, source);
    }
    const commonSource =
      uniqueSources.size === 1 ? [...uniqueSources.values()][0] : undefined;
    const node = (
      graphObject: AuthorityGraphObjectView,
      objectKind: ProjectRelationshipNode["object_kind"],
      label: string,
      summary: string,
      basis: string,
      source?: SourceContext,
    ): ProjectRelationshipNode => ({
      node_ref: {
        record_id: graphObject.id,
        revision: graphObject.authoritativeRevision,
        record_hash: graphObject.recordHash,
      },
      object_kind: objectKind,
      label,
      summary,
      basis,
      layer: "current",
      lifecycle: "represented",
      ...(sourceDestination(source) === undefined
        ? {}
        : { source_destination: sourceDestination(source)! }),
    });
    const result: ProjectRelationshipNode[] = [
      node(
        path.claim,
        "claim",
        records.claim.canonical_text,
        `A ${records.claim.claim_kind} Claim retained in trusted scientific authority.`,
        `${titleCase(claimBasis.source_scope)}; ${records.spans.length} exact ${records.spans.length === 1 ? "source span" : "source spans"}; ${claimBasis.source_stance} and human accepted.`,
        commonSource,
      ),
      node(
        path.workVersion,
        "work_version",
        records.workVersion.version_label,
        `The ${records.workVersion.publication_status.replaceAll("_", " ")} WorkVersion that asserts the selected Claim.`,
        `Exact WorkVersion revision ${records.workVersion.revision} in the represented projection.`,
        commonSource,
      ),
      node(
        path.work,
        "work",
        records.work.title,
        "The scholarly Work owning the represented version.",
        `Exact Work revision ${records.work.revision} in the represented projection.`,
        commonSource,
      ),
    ];
    for (const span of records.spans) {
      const graphSpan = path.sourceSpans.find(
        (candidate) => candidate.id === span.source_span_id,
      );
      const source = records.sourcesBySpan.get(span.source_span_id);
      if (graphSpan === undefined || source === undefined) {
        throw this.#projectionIncoherent(
          "The exact SourceSpan lost its projected or ProjectSource identity during composition.",
        );
      }
      const location = [
        pageNumber(span) === undefined ? undefined : `page ${pageNumber(span)}`,
        source.block.structural_path.join(" / "),
      ]
        .filter((part): part is string => part !== undefined && part !== "")
        .join(" in ");
      result.push(
        node(
          graphSpan,
          "source_span",
          selectedText(span) ?? `SourceSpan ${span.source_span_id}`,
          `${titleCase(span.verification.status)}${location === "" ? "" : ` on ${location}`}.`,
          `SourceSpan revision ${span.revision} over the verified source bytes; ProjectSource is ${source.status}.`,
          source,
        ),
      );
    }
    for (const artifact of records.artifacts) {
      const graphArtifact = path.artifacts.find(
        (candidate) => candidate.id === artifact.artifact_id,
      );
      const source = records.spans
        .filter((span) => span.artifact_id === artifact.artifact_id)
        .map((span) => records.sourcesBySpan.get(span.source_span_id))
        .find(
          (candidate): candidate is SourceContext => candidate !== undefined,
        );
      if (graphArtifact === undefined) {
        throw this.#projectionIncoherent(
          "The exact Artifact lost its projected identity during composition.",
        );
      }
      result.push(
        node(
          graphArtifact,
          "artifact",
          `Verified ${artifact.artifact_kind.toLocaleUpperCase()} copy`,
          `A ${artifact.byte_size}-byte content-addressed ${artifact.media_type} Artifact retained by Petra.`,
          `Artifact revision ${artifact.revision}; byte identity ${artifact.content_hash}.`,
          source,
        ),
      );
    }
    return result;
  }

  #pathSteps(
    relationships: readonly ProjectRelationship[],
  ): ProjectRelationshipViewContent["path"]["steps"] {
    const seen = new Set<string>();
    return relationships.map((relationship, index) => {
      const repeated =
        seen.has(relationship.source_id) || seen.has(relationship.target_id);
      seen.add(relationship.source_id);
      seen.add(relationship.target_id);
      return {
        position: index + 1,
        from_node_id: relationship.source_id,
        relationship_id: relationship.relationship_ref.element_id,
        to_node_id: relationship.target_id,
        repeated_member: repeated,
      };
    }) as ProjectRelationshipViewContent["path"]["steps"];
  }

  #assertScientificDefinition(definition: PetraProjectDefinition): void {
    const hasRegistration = (
      kind: "object_schema" | "relationship_schema",
      name: "petra.claim" | "petra.assertion",
    ): boolean =>
      definition.content.registrations.some(
        (registration) =>
          registration.registration_kind === kind &&
          registration.contract.name === name &&
          registration.contract.version === "1.0.0",
      );
    if (
      !hasRegistration("object_schema", "petra.claim") ||
      !hasRegistration("relationship_schema", "petra.assertion")
    ) {
      throw new PostgresProjectRelationshipViewError(
        "PROJECT_RELATIONSHIP_PATH_UNSUPPORTED",
        "The current relationship renderer requires registered Claim and Assertion semantics.",
      );
    }
  }

  #term(
    definition: PetraProjectDefinition,
    family: "finding" | "reference",
    fallback: string,
  ): string {
    return (
      definition.content.terms.find((term) => term.generic_family === family)
        ?.singular ?? fallback
    );
  }

  #assertGraphNode(
    graphObject: AuthorityGraphObjectView,
    kind: "Work" | "WorkVersion" | "Claim" | "SourceSpan" | "Artifact",
  ): void {
    if (graphObject.elementKind !== "node" || graphObject.kind !== kind) {
      throw this.#projectionIncoherent(
        `The provenance path contains an invalid ${kind} node.`,
      );
    }
  }

  #assertGraphRelationship(
    graphObject: AuthorityGraphObjectView,
    predicate: ProjectRelationship["predicate"],
    sourceId: string | undefined,
    targetId: string | undefined,
  ): void {
    if (
      graphObject.elementKind !== "relationship" ||
      graphObject.kind !== predicate ||
      sourceId === undefined ||
      targetId === undefined ||
      graphObject.sourceId !== sourceId ||
      graphObject.targetId !== targetId
    ) {
      throw this.#projectionIncoherent(
        `The provenance path contains an invalid ${predicate} relationship.`,
      );
    }
  }

  #projectionState(
    checkpoint: PetraProjectionCheckpoint,
    representedTargetSequence: number,
    observedTargetSequence: number,
  ): "current" | "catching_up" | "blocked" {
    if (checkpoint.content.freshness.state === "blocked") return "blocked";
    return representedTargetSequence === observedTargetSequence
      ? "current"
      : "catching_up";
  }

  #storedRecord<Value>(
    schemaName: string,
    payload: unknown,
    expectedHash: string,
  ): Value {
    this.#contracts.assertValid(schemaName, "1.0.0", payload);
    if (canonicalHash(payload) !== expectedHash) {
      throw this.#corrupt(`Stored ${schemaName} record hash is invalid.`);
    }
    return clone(payload as Value);
  }

  #corrupt(message: string): PostgresProjectRelationshipViewError {
    return new PostgresProjectRelationshipViewError(
      "PROJECT_RELATIONSHIP_STORED_RECORD_CORRUPT",
      message,
    );
  }

  #projectionIncoherent(message: string): PostgresProjectRelationshipViewError {
    return new PostgresProjectRelationshipViewError(
      "PROJECT_RELATIONSHIP_PROJECTION_INCOHERENT",
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
        throw new Error("PostgreSQL did not provide a transaction timestamp.");
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
