import { createHash } from "node:crypto";

import type {
  FocusedGraphExactRef,
  FocusedGraphNode,
  FocusedGraphOmission,
  FocusedGraphPath,
  FocusedGraphProjectDefinitionRef,
  FocusedGraphProjectSnapshotRef,
  FocusedGraphRelationship,
  FocusedGraphResolvedSemantic,
  PetraAssertion,
  PetraClaim,
  PetraFocusedGraphView,
  PetraProjectDefinition,
  PetraProjectionCheckpoint,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  FocusedGraphQueryError,
  FocusedGraphViewContractError,
  FocusedGraphViewContractResolver,
  derivePetraId,
  parseFocusedGraphViewRequest,
  type AuthorityGraphFreshness,
  type AuthorityGraphObjectView,
  type AuthorityGraphStore,
  type FocusedGraphViewReader,
  type FocusedGraphViewRequest,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

interface ProjectContextRow {
  project_id: string;
  definition_payload: unknown;
  definition_record_hash: string | null;
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

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const sameExactRef = (
  left: FocusedGraphExactRef,
  right: FocusedGraphExactRef,
): boolean =>
  left.record_id === right.record_id &&
  left.revision === right.revision &&
  left.record_hash === right.record_hash;

const sameDefinitionRef = (
  left: FocusedGraphProjectDefinitionRef,
  right: FocusedGraphProjectDefinitionRef,
): boolean =>
  left.project_definition_id === right.project_definition_id &&
  left.revision === right.revision &&
  left.content_hash === right.content_hash &&
  left.record_hash === right.record_hash &&
  left.definition_family === right.definition_family;

const sameSnapshotRef = (
  left: FocusedGraphProjectSnapshotRef,
  right: FocusedGraphProjectSnapshotRef,
): boolean =>
  left.snapshot_id === right.snapshot_id &&
  left.revision === right.revision &&
  left.event_position === right.event_position &&
  left.content_hash === right.content_hash;

const meaningKind = (
  predicate: string,
): FocusedGraphRelationship["meaning_kind"] | undefined =>
  ({
    SUPPORTS: "support",
    REPLICATES: "support",
    CONTRADICTS: "contradiction",
    CHALLENGES: "contradiction",
    FAILS_TO_REPLICATE: "contradiction",
    QUALIFIES: "qualification",
    REFRAMES: "qualification",
    CRITIQUES_METHOD: "qualification",
    INTERPRETS: "qualification",
    ADOPTS: "inference",
    DIRECTLY_TESTS: "inference",
    EXTENDS: "inference",
  })[predicate] as FocusedGraphRelationship["meaning_kind"] | undefined;

/**
 * Current, one-hop query composition over immutable PostgreSQL records and the
 * rebuildable Neo4j authority projection. PostgreSQL supplies every returned
 * record and position; Neo4j supplies only bounded candidate membership.
 */
export class PostgresFocusedGraphViewReader implements FocusedGraphViewReader {
  readonly #pool: Pool;
  readonly #graph: AuthorityGraphStore;
  readonly #contracts: PetraContractRegistry;
  readonly #resolver: FocusedGraphViewContractResolver;

  constructor(
    pool: Pool,
    graph: AuthorityGraphStore,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#graph = graph;
    this.#contracts = contracts;
    this.#resolver = new FocusedGraphViewContractResolver(contracts);
  }

  async queryFocusedGraph(
    projectId: string,
    request: FocusedGraphViewRequest,
  ): Promise<PetraFocusedGraphView | undefined> {
    request = parseFocusedGraphViewRequest(request);
    if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId)) {
      throw this.#error(
        "FOCUSED_GRAPH_QUERY_INVALID",
        "A focused graph query requires one exact Project identity.",
      );
    }
    if (
      request.task_kind !== "neighborhood" ||
      request.semantic_layer !== "current" ||
      request.temporal_position.position_kind !== "current" ||
      request.temporal_position.dimension !== "project_snapshot" ||
      request.limits.maximum_depth !== 1
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_QUERY_INVALID",
        "This focused query owner supports only one current one-hop neighborhood.",
      );
    }

    return this.#readTransaction(async (client, readAt) => {
      const context = await this.#projectContext(client, projectId);
      if (context === undefined) return undefined;
      if (
        context.definition_payload === null ||
        context.definition_record_hash === null
      ) {
        throw this.#error(
          "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
          "A focused graph query requires an exact current ProjectDefinition.",
        );
      }
      const definition = this.#storedRecord<PetraProjectDefinition>(
        "project-definition",
        context.definition_payload,
        context.definition_record_hash,
      );
      if (definition.project_id !== projectId) {
        throw this.#corrupt(
          "The focused graph definition belongs to another Project.",
        );
      }
      const definitionRef: FocusedGraphProjectDefinitionRef = {
        project_definition_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
        record_hash: context.definition_record_hash,
        definition_family: definition.definition_family,
      };
      if (!sameDefinitionRef(request.project_definition_ref, definitionRef)) {
        throw this.#error(
          "FOCUSED_GRAPH_DEFINITION_STALE",
          "The requested ProjectDefinition is not the exact current definition revision.",
        );
      }

      const semantics = this.#resolveSemantics(definition, request);
      const checkpoint = await this.#checkpoint(client, projectId);
      if (
        checkpoint === undefined ||
        checkpoint.content.position.position_kind === "empty"
      ) {
        throw this.#error(
          "FOCUSED_GRAPH_PROJECTION_UNAVAILABLE",
          "No represented Neo4j projection position is available for this Project.",
        );
      }
      if (checkpoint.content.freshness.state === "blocked") {
        throw this.#error(
          "FOCUSED_GRAPH_PROJECTION_UNAVAILABLE",
          "The Neo4j projection is blocked at its last represented position.",
        );
      }
      const authority = await this.#authority(client, projectId);
      const observed = await this.#observedHead(client, projectId);
      if (observed === undefined) {
        throw this.#projectionIncoherent(
          "The Project has a projection checkpoint but no authoritative graph outbox head.",
        );
      }
      const represented = checkpoint.content.position;
      if (
        represented.target_sequence > observed.targetSequence ||
        represented.event_position > observed.eventPosition ||
        represented.stream_revision > observed.streamRevision
      ) {
        throw this.#projectionIncoherent(
          "The graph checkpoint is ahead of the authoritative Project graph head.",
        );
      }
      await this.#guardProjection(
        checkpoint,
        observed.targetSequence,
        represented.target_sequence,
        represented.stream_revision,
      );

      const requestedSnapshot = this.#snapshot({
        projectId,
        definitionRef,
        eventPosition: authority.eventPosition,
        streamRevision: authority.streamRevision,
        targetSequence: observed.targetSequence,
        positionKind: "requested",
      });
      if (
        request.expected_snapshot !== undefined &&
        !sameSnapshotRef(request.expected_snapshot, requestedSnapshot)
      ) {
        throw this.#error(
          "FOCUSED_GRAPH_SNAPSHOT_STALE",
          "The requested current Project snapshot is no longer current.",
        );
      }
      const representedSnapshot = this.#snapshot({
        projectId,
        definitionRef,
        eventPosition: represented.event_position,
        streamRevision: represented.stream_revision,
        targetSequence: represented.target_sequence,
        positionKind: "represented",
      });

      const focusGraph = await this.#graph.getObject(
        projectId,
        request.focus_ref.record_id,
      );
      if (focusGraph === undefined) {
        throw this.#error(
          "FOCUSED_GRAPH_FOCUS_NOT_FOUND",
          "The exact focused object is not represented in this Project projection.",
        );
      }
      this.#assertProjectedAt(focusGraph, checkpoint);
      if (
        focusGraph.elementKind !== "node" ||
        focusGraph.kind !== "Claim" ||
        focusGraph.authoritativeRevision !== request.focus_ref.revision ||
        focusGraph.recordHash !== request.focus_ref.record_hash
      ) {
        throw this.#error(
          "FOCUSED_GRAPH_SNAPSHOT_STALE",
          "The focused object no longer matches the requested exact revision.",
        );
      }
      const focusClaim = await this.#claim(client, focusGraph);

      const edgeBudget = Math.min(
        request.limits.maximum_relationships,
        request.limits.maximum_paths,
        Math.max(0, request.limits.maximum_nodes - 1),
      );
      const candidateLimit = Math.min(100, Math.max(1, edgeBudget + 1));
      const candidates = await this.#graph.getEvidenceRelations(
        projectId,
        focusClaim.claim_id,
        candidateLimit,
      );
      const claims = new Map<string, PetraClaim>([
        [focusClaim.claim_id, focusClaim],
      ]);
      const graphClaims = new Map<string, AuthorityGraphObjectView>([
        [focusGraph.id, focusGraph],
      ]);
      const selected: Array<{
        graph: AuthorityGraphObjectView;
        assertion: PetraAssertion;
      }> = [];
      let capped = false;
      for (const graphRelationship of candidates) {
        if (
          selected.length >= request.limits.maximum_relationships ||
          selected.length >= request.limits.maximum_paths
        ) {
          capped = true;
          break;
        }
        const exact = await this.#relationship(
          client,
          projectId,
          graphRelationship,
          checkpoint,
        );
        const endpointIds = [
          graphRelationship.sourceId!,
          graphRelationship.targetId!,
        ];
        const missingEndpointIds = endpointIds.filter((id) => !claims.has(id));
        if (
          claims.size + new Set(missingEndpointIds).size >
          request.limits.maximum_nodes
        ) {
          capped = true;
          break;
        }
        for (const endpointId of missingEndpointIds) {
          const graphNode = await this.#graph.getObject(projectId, endpointId);
          if (
            graphNode === undefined ||
            graphNode.elementKind !== "node" ||
            graphNode.kind !== "Claim"
          ) {
            throw this.#projectionIncoherent(
              "A projected scientific relationship has an unavailable or incompatible Claim endpoint.",
            );
          }
          this.#assertProjectedAt(graphNode, checkpoint);
          claims.set(endpointId, await this.#claim(client, graphNode));
          graphClaims.set(endpointId, graphNode);
        }
        selected.push({ graph: graphRelationship, assertion: exact });
      }
      if (candidates.length > selected.length) capped = true;

      await this.#guardProjection(
        checkpoint,
        observed.targetSequence,
        represented.target_sequence,
        represented.stream_revision,
      );

      const nodeKey = (id: string): string => `node:${id.toLowerCase()}`;
      const relationshipKey = (id: string): string =>
        `relationship:${id.toLowerCase()}`;
      const returnTarget =
        request.return_destination.state === "available"
          ? request.return_destination.target_ref
          : undefined;
      const representedRefs: FocusedGraphExactRef[] = [
        ...graphClaims.values(),
        ...selected.map(({ graph }) => ({
          id: graph.id,
          authoritativeRevision: graph.authoritativeRevision,
          recordHash: graph.recordHash,
        })),
      ].map((record) => ({
        record_id: record.id,
        revision: record.authoritativeRevision,
        record_hash: record.recordHash,
      }));
      if (
        returnTarget !== undefined &&
        !representedRefs.some((ref) => sameExactRef(ref, returnTarget))
      ) {
        throw this.#error(
          "FOCUSED_GRAPH_QUERY_INVALID",
          "The available return destination is outside this bounded result.",
        );
      }
      if (
        request.origin.origin_ref !== undefined &&
        !representedRefs.some((ref) =>
          sameExactRef(ref, request.origin.origin_ref!),
        )
      ) {
        throw this.#error(
          "FOCUSED_GRAPH_QUERY_INVALID",
          "The exact origin is outside this bounded result.",
        );
      }

      const nodes: FocusedGraphNode[] = [...claims.entries()]
        .sort(([left], [right]) =>
          left === focusClaim.claim_id
            ? -1
            : right === focusClaim.claim_id
              ? 1
              : left.localeCompare(right),
        )
        .map(([claimId, claim]) => {
          const graphNode = graphClaims.get(claimId)!;
          const ref: FocusedGraphExactRef = {
            record_id: claimId,
            revision: graphNode.authoritativeRevision,
            record_hash: graphNode.recordHash,
          };
          return {
            node_key: nodeKey(claimId),
            record_ref: ref,
            semantic_key: semantics.object.semantic_key,
            term: semantics.object.term,
            label: claim.canonical_text,
            summary: `A ${claim.claim_kind} ${semantics.object.term.singular} at exact canonical revision ${claim.revision}.`,
            layer: "current",
            authority_position: "current_authority",
            lifecycle: "represented",
            basis: {
              summary: `PostgreSQL canonical ${semantics.object.term.singular} with ${claim.basis.basis_kind} basis and ${claim.authority.zone} authority.`,
              record_refs: [ref],
              limitations: [
                "Exact source locations are composed by the existing source owner in a later focused-query slice.",
              ],
            },
            destination_keys:
              returnTarget !== undefined && sameExactRef(returnTarget, ref)
                ? [request.return_destination.destination_key]
                : [],
          };
        });

      const relationships: FocusedGraphRelationship[] = selected.map(
        ({ graph: graphRelationship, assertion }) => {
          const meaning = meaningKind(assertion.predicate);
          if (meaning === undefined) {
            throw this.#error(
              "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
              `The registered focused query does not map predicate ${assertion.predicate} to a renderer-neutral relationship meaning.`,
            );
          }
          const relationshipRef = {
            element_id: graphRelationship.id,
            revision: graphRelationship.authoritativeRevision,
            record_hash: graphRelationship.recordHash,
          };
          const exactRef: FocusedGraphExactRef = {
            record_id: graphRelationship.id,
            revision: graphRelationship.authoritativeRevision,
            record_hash: graphRelationship.recordHash,
          };
          return {
            relationship_key: relationshipKey(graphRelationship.id),
            relationship_ref: relationshipRef,
            semantic_key: semantics.relationship.semantic_key,
            term: semantics.relationship.term,
            predicate: assertion.predicate,
            meaning_kind: meaning,
            source_node_key: nodeKey(graphRelationship.sourceId!),
            target_node_key: nodeKey(graphRelationship.targetId!),
            direction: "outgoing",
            origin:
              assertion.assertion_kind === "model_inference"
                ? "model_inference"
                : "canonical_record",
            layer: "current",
            authority_position: "current_authority",
            summary: assertion.rationale,
            basis: {
              summary: `Exact canonical Assertion revision ${assertion.revision}; its recorded predicate remains ${assertion.predicate}.`,
              record_refs: [exactRef],
              limitations: [
                "This slice does not yet compose SourceSpan destinations into relationship Details.",
              ],
            },
            destination_keys:
              returnTarget !== undefined && sameExactRef(returnTarget, exactRef)
                ? [request.return_destination.destination_key]
                : [],
          };
        },
      );
      const paths: FocusedGraphPath[] = relationships.map((relationship) => ({
        path_key: `path:${relationship.relationship_ref.element_id.toLowerCase()}`,
        state: "complete",
        ordering_rationale:
          "One exact recorded relationship is the complete path within this one-hop result.",
        steps: [
          {
            position: 1,
            from_node_key: relationship.source_node_key,
            relationship_key: relationship.relationship_key,
            to_node_key: relationship.target_node_key,
            traversal_direction: "outgoing",
            repeated_member:
              relationship.source_node_key === relationship.target_node_key,
          },
        ],
        limitations: [],
      }));

      const taskWithoutHash = {
        request_id: request.request_id,
        task_kind: request.task_kind,
        task_semantic_key: semantics.task.semantic_key,
        question: request.question,
        question_hash: canonicalHash(request.question),
        focus_refs: [request.focus_ref] as [FocusedGraphExactRef],
        origin: request.origin,
        return_destination_key: request.return_destination.destination_key,
      };
      const projectionState =
        represented.target_sequence === observed.targetSequence
          ? "current"
          : "catching_up";
      const pendingRecords =
        observed.targetSequence - represented.target_sequence;
      const outOfScopeOmission: FocusedGraphOmission = {
        omission_kind: "out_of_scope",
        description:
          "Whole-Project traversal, structural provenance, other semantic layers, and expansion are outside this result.",
        count: { state: "unknown" },
      };
      const omissions: [FocusedGraphOmission, ...FocusedGraphOmission[]] =
        capped
          ? [
              {
                omission_kind: "capped",
                description:
                  "Additional recorded one-hop relationships may exist beyond the caller-visible node, relationship, or path limit.",
                count: { state: "unknown" },
              },
              outOfScopeOmission,
            ]
          : [outOfScopeOmission];
      const content: PetraFocusedGraphView["content"] = {
        task: {
          ...taskWithoutHash,
          request_hash: canonicalHash(taskWithoutHash),
        },
        profile: {
          project_definition_ref: definitionRef,
          kernel_compatibility: definition.content.kernel_compatibility,
          label: definition.content.label,
          focused_graph_registration: semantics.focusedGraph,
          resolved_semantics: [
            semantics.task,
            semantics.object,
            semantics.relationship,
            semantics.action,
          ],
        },
        source_views: [],
        requested_snapshot: requestedSnapshot,
        represented_snapshot: representedSnapshot,
        semantic_layer: "current",
        temporal_position: request.temporal_position,
        projection_position: {
          authority_source: "postgresql",
          projection_source: "neo4j_rebuildable_projection",
          state: projectionState,
          checkpoint_ref: {
            record_id: checkpoint.projection_checkpoint_id,
            revision: checkpoint.revision,
            record_hash: canonicalHash(checkpoint),
          },
          represented_event_position: represented.event_position,
          observed_event_position: observed.eventPosition,
          pending_records: pendingRecords,
          detail:
            projectionState === "current"
              ? `Neo4j represents the exact PostgreSQL checkpoint at Project stream revision ${represented.stream_revision}.`
              : `Neo4j safely represents Project stream revision ${represented.stream_revision}; ${pendingRecords} graph ${pendingRecords === 1 ? "record is" : "records are"} pending through revision ${observed.streamRevision}.`,
        },
        scope: {
          description:
            "One exact current Claim neighborhood from the bounded scientific relationship projection.",
          included_relationship_semantics: [
            semantics.relationship.semantic_key,
          ],
          directions: ["outgoing", "incoming"],
          included_layers: ["current"],
          limits: structuredClone(request.limits),
          coverage: capped ? "capped" : "complete_for_scope",
          omissions,
        },
        nodes,
        relationships,
        paths,
        selection: {
          state: "selected",
          selection_kind: "node",
          selected_keys: [nodeKey(focusClaim.claim_id)],
        },
        destinations: [structuredClone(request.return_destination)],
        actions: [
          {
            action_key: `action:${semantics.action.semantic_key.replaceAll(".", ":")}`,
            action_kind: "return_to_origin",
            semantic_key: semantics.action.semantic_key,
            label: semantics.action.term.singular,
            consequence: "read_only_navigation",
            target_keys: [nodeKey(focusClaim.claim_id)],
            availability:
              request.return_destination.state === "available"
                ? {
                    state: "available",
                    destination_key: request.return_destination.destination_key,
                  }
                : {
                    state: "unavailable",
                    reason: request.return_destination.reason,
                  },
          },
        ],
        authority_boundary: {
          postgresql_authoritative: true,
          neo4j_rebuildable_projection: true,
          renderer_neutral: true,
          renderer_queries_projection: false,
          layout_grants_authority: false,
          selection_grants_authority: false,
          actions_issue_domain_mutation: false,
          correction_requires_canonical_owner: true,
          work_requires_typed_preview: true,
        },
        limitations: [
          "Version 1 of this query owner supports only a current one-hop Claim neighborhood.",
          "PostgreSQL supplies authority; Neo4j supplies rebuildable bounded membership and never domain authority.",
        ],
      };
      const view: PetraFocusedGraphView = {
        schema_name: "petra.focused-graph-view",
        schema_version: "1.0.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      try {
        return this.#resolver.resolve(definition, view).view;
      } catch (error) {
        if (error instanceof FocusedGraphViewContractError) {
          if (
            error.code === "FOCUSED_GRAPH_CONTRACT_INVALID" ||
            error.code === "FOCUSED_GRAPH_DEFINITION_MISMATCH"
          ) {
            throw this.#corrupt(error.message);
          }
          if (error.code === "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE") {
            throw this.#projectionIncoherent(error.message);
          }
          throw this.#error(
            "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
            error.message,
          );
        }
        throw error;
      }
    });
  }

  #resolveSemantics(
    definition: PetraProjectDefinition,
    request: FocusedGraphViewRequest,
  ): {
    focusedGraph: {
      semantic_key: "petra.focused-graph";
      registration_kind: "extension";
      contract: FocusedGraphResolvedSemantic["contract"];
    };
    task: FocusedGraphResolvedSemantic;
    object: FocusedGraphResolvedSemantic;
    relationship: FocusedGraphResolvedSemantic;
    action: FocusedGraphResolvedSemantic;
  } {
    const exact = (
      semanticKey: string,
      role: FocusedGraphResolvedSemantic["role"],
    ): FocusedGraphResolvedSemantic => {
      const registrations = definition.content.registrations.filter(
        (candidate) => candidate.semantic_key === semanticKey,
      );
      const terms = definition.content.terms.filter(
        (candidate) => candidate.semantic_key === semanticKey,
      );
      if (
        registrations.length !== 1 ||
        terms.length !== 1 ||
        registrations[0] === undefined ||
        terms[0] === undefined
      ) {
        throw this.#error(
          "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
          `The exact ${semanticKey} ${role} meaning is not registered once by this ProjectDefinition.`,
        );
      }
      return {
        semantic_key: semanticKey,
        role,
        registration_kind: registrations[0]
          .registration_kind as FocusedGraphResolvedSemantic["registration_kind"],
        contract: structuredClone(registrations[0].contract),
        term: structuredClone(terms[0]),
      };
    };
    const graphRegistrations = definition.content.registrations.filter(
      (candidate) => candidate.semantic_key === "petra.focused-graph",
    );
    const focusedGraph = graphRegistrations[0];
    if (
      graphRegistrations.length !== 1 ||
      focusedGraph === undefined ||
      focusedGraph.registration_kind !== "extension"
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        "The exact ProjectDefinition does not register one focused graph extension.",
      );
    }
    const task = exact(request.task_semantic_key, "task");
    const object = exact(request.object_semantic_key, "object");
    const relationship = exact(
      request.relationship_semantic_key,
      "relationship",
    );
    const action = exact(request.return_action_semantic_key, "action");
    if (
      task.registration_kind !== "objective_schema" ||
      object.registration_kind !== "object_schema" ||
      object.contract.name !== "petra.claim" ||
      relationship.registration_kind !== "relationship_schema" ||
      relationship.contract.name !== "petra.assertion" ||
      action.registration_kind !== "extension"
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        "The requested task, Claim, relationship, or return action is incompatible with this bounded query owner.",
      );
    }
    return {
      focusedGraph: {
        semantic_key: "petra.focused-graph",
        registration_kind: "extension",
        contract: structuredClone(focusedGraph.contract),
      },
      task,
      object,
      relationship,
      action,
    };
  }

  async #projectContext(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectContextRow | undefined> {
    const result = await client.query<ProjectContextRow>(
      `SELECT project.project_id,
              definition_revision.payload AS definition_payload,
              definition_revision.record_hash AS definition_record_hash
         FROM petra.projects AS project
         LEFT JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         LEFT JOIN petra.project_definition_revisions AS definition_revision
           ON definition_revision.project_definition_id =
                definition.project_definition_id
          AND definition_revision.revision = definition.current_revision
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
      throw this.#corrupt("The focused graph checkpoint record is corrupt.");
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
    const eventPosition = Number(row?.event_position);
    const streamRevision = Number(row?.stream_revision ?? 0);
    if (
      row === undefined ||
      !Number.isSafeInteger(eventPosition) ||
      !Number.isSafeInteger(streamRevision)
    ) {
      throw this.#corrupt("The PostgreSQL authority position is unavailable.");
    }
    return { eventPosition, streamRevision };
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
        "Neo4j and the authoritative PostgreSQL checkpoint do not identify the same represented position.",
      );
    }
  }

  #assertProjectedAt(
    graphObject: AuthorityGraphObjectView,
    checkpoint: PetraProjectionCheckpoint,
  ): void {
    if (checkpoint.content.position.position_kind !== "advanced") {
      throw this.#projectionIncoherent(
        "A graph member cannot be read from an empty checkpoint.",
      );
    }
    const targetSequence = graphObject.properties.target_sequence;
    const streamRevision = graphObject.properties.stream_revision;
    const eventPosition = graphObject.properties.event_position;
    if (
      graphObject.projectId !== undefined &&
      graphObject.projectId !== checkpoint.project_id
    ) {
      throw this.#projectionIncoherent(
        "A graph member crossed the exact Project boundary.",
      );
    }
    if (
      typeof targetSequence === "number" &&
      targetSequence > checkpoint.content.position.target_sequence
    ) {
      throw this.#projectionIncoherent(
        "A graph member is newer than the represented checkpoint.",
      );
    }
    if (
      typeof streamRevision === "number" &&
      streamRevision > checkpoint.content.position.stream_revision
    ) {
      throw this.#projectionIncoherent(
        "A graph member is newer than the represented Project stream revision.",
      );
    }
    if (
      typeof eventPosition === "number" &&
      eventPosition > checkpoint.content.position.event_position
    ) {
      throw this.#projectionIncoherent(
        "A graph member is newer than the represented authority event.",
      );
    }
  }

  async #claim(
    client: PoolClient,
    graphNode: AuthorityGraphObjectView,
  ): Promise<PetraClaim> {
    const result = await client.query<PayloadHashRow>(
      `SELECT payload, record_hash
         FROM petra.evidence_entity_revisions
        WHERE evidence_id = $1 AND evidence_kind = 'claim' AND revision = $2`,
      [graphNode.id, graphNode.authoritativeRevision],
    );
    const claim = this.#exactGraphRecord<PetraClaim>(
      "claim",
      result.rows[0],
      graphNode,
    );
    if (
      claim.claim_id !== graphNode.id ||
      claim.revision !== graphNode.authoritativeRevision ||
      claim.authority.zone !== "trusted"
    ) {
      throw this.#projectionIncoherent(
        "A projected current Claim does not resolve to exact trusted PostgreSQL authority.",
      );
    }
    return claim;
  }

  async #relationship(
    client: PoolClient,
    projectId: string,
    graphRelationship: AuthorityGraphObjectView,
    checkpoint: PetraProjectionCheckpoint,
  ): Promise<PetraAssertion> {
    if (
      graphRelationship.elementKind !== "relationship" ||
      graphRelationship.relationClass !== "scientific" ||
      graphRelationship.projectId !== projectId ||
      graphRelationship.assertionId !== graphRelationship.id ||
      graphRelationship.sourceId === undefined ||
      graphRelationship.targetId === undefined
    ) {
      throw this.#projectionIncoherent(
        "The bounded Neo4j query returned a non-scientific or cross-Project relationship.",
      );
    }
    this.#assertProjectedAt(graphRelationship, checkpoint);
    const result = await client.query<PayloadHashRow>(
      `SELECT payload, record_hash
         FROM petra.evidence_entity_revisions
        WHERE evidence_id = $1 AND evidence_kind = 'assertion' AND revision = $2`,
      [graphRelationship.id, graphRelationship.authoritativeRevision],
    );
    const assertion = this.#exactGraphRecord<PetraAssertion>(
      "assertion",
      result.rows[0],
      graphRelationship,
    );
    if (
      assertion.assertion_id !== graphRelationship.id ||
      assertion.revision !== graphRelationship.authoritativeRevision ||
      assertion.predicate !== graphRelationship.kind ||
      assertion.subject_id !== graphRelationship.sourceId ||
      assertion.object.object_kind !== "entity" ||
      assertion.object.entity_id !== graphRelationship.targetId ||
      assertion.authority.zone !== "trusted"
    ) {
      throw this.#projectionIncoherent(
        "A projected relationship does not resolve to one exact trusted PostgreSQL Assertion.",
      );
    }
    return assertion;
  }

  #exactGraphRecord<Value>(
    schemaName: "claim" | "assertion",
    row: PayloadHashRow | undefined,
    graphObject: AuthorityGraphObjectView,
  ): Value {
    if (
      row === undefined ||
      row.record_hash !== graphObject.recordHash ||
      canonicalHash(row.payload) !== row.record_hash
    ) {
      throw this.#projectionIncoherent(
        `Projected ${graphObject.kind} ${graphObject.id} does not resolve to its exact PostgreSQL record.`,
      );
    }
    this.#contracts.assertValid(schemaName, "1.0.0", row.payload);
    return structuredClone(row.payload) as Value;
  }

  #snapshot(input: {
    projectId: string;
    definitionRef: FocusedGraphProjectDefinitionRef;
    eventPosition: number;
    streamRevision: number;
    targetSequence: number;
    positionKind: "requested" | "represented";
  }): FocusedGraphProjectSnapshotRef {
    const material = {
      project_id: input.projectId,
      project_definition_ref: input.definitionRef,
      semantic_layer: "current",
      event_position: input.eventPosition,
      stream_revision: input.streamRevision,
      graph_target_sequence: input.targetSequence,
      position_kind: input.positionKind,
    };
    return {
      snapshot_id: derivePetraId("snapshot", canonicalize(material)),
      revision: 1,
      event_position: input.eventPosition,
      content_hash: canonicalHash(material),
    };
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
    return structuredClone(payload) as Value;
  }

  #error(
    code: ConstructorParameters<typeof FocusedGraphQueryError>[0],
    message: string,
  ): FocusedGraphQueryError {
    return new FocusedGraphQueryError(code, message);
  }

  #corrupt(message: string): FocusedGraphQueryError {
    return this.#error("FOCUSED_GRAPH_STORED_RECORD_CORRUPT", message);
  }

  #projectionIncoherent(message: string): FocusedGraphQueryError {
    return this.#error("FOCUSED_GRAPH_PROJECTION_INCOHERENT", message);
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
        throw this.#corrupt(
          "PostgreSQL did not provide a transaction timestamp.",
        );
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
