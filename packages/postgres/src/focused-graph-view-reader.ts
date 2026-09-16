import { createHash } from "node:crypto";

import type {
  FocusedGraphDetailsContent,
  FocusedGraphExactRef,
  FocusedGraphGroupV11,
  FocusedGraphNode,
  FocusedGraphOmission,
  FocusedGraphPath,
  FocusedGraphProjectDefinitionRef,
  FocusedGraphProjectSnapshotRef,
  FocusedGraphRelationship,
  FocusedGraphResolvedSemantic,
  FocusedGraphSemanticDestination,
  FocusedGraphSourceInspection,
  PetraAssertion,
  PetraClaim,
  PetraFocusedGraphDetailsView,
  PetraFocusedGraphView,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
  PetraProjectionCheckpoint,
  PetraSourceSpan,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  FocusedGraphQueryError,
  FocusedGraphViewContractError,
  FocusedGraphViewContractResolver,
  derivePetraId,
  parseFocusedGraphDetailsViewRequest,
  parseFocusedGraphViewRequest,
  type AuthorityGraphFreshness,
  type AuthorityGraphObjectView,
  type AuthorityGraphStore,
  type FocusedGraphExplorationViewRequest,
  type FocusedGraphDetailsViewRequest,
  type FocusedGraphReadRequest,
  type FocusedGraphViewReader,
  type FocusedGraphViewRequest,
  type PetraFocusedGraphReadView,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import { PostgresProjectObjectLocationViewReader } from "./project-object-location-view-reader.js";
import { PostgresProjectSourceViewReader } from "./project-source-view-reader.js";

interface ProjectContextRow {
  project_id: string;
  definition_payload: unknown;
  definition_record_hash: string | null;
}

interface PayloadHashRow {
  payload: unknown;
  record_hash: string;
}

interface SourceSpanRow extends PayloadHashRow {
  project_scoped: boolean;
}

interface SourceBindingRow {
  project_source_id: string;
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

type WorkingRow = PayloadHashRow;

interface WorkingSelection {
  relationship: PetraWorkingRelationship;
  relationshipHash: string;
  assertion: PetraAssertion;
  candidate: PetraWorkingCandidate;
  candidateHash: string;
  claim: PetraClaim;
  currentNodeId: string;
  currentIsSubject: boolean;
}

interface HistoricalEventRow {
  event_position: string;
  stream_revision: string;
  recorded_at: Date;
  target_sequence: string | null;
}

interface HistoricalMemberRow {
  graph_element_kind: "node" | "relationship";
  object_id: string;
  object_revision: string;
  operation: "upsert" | "tombstone";
}

interface ResolvedFocusedGraphSemantics {
  focusedGraph: {
    semantic_key: "petra.focused-graph";
    registration_kind: "extension";
    contract: FocusedGraphResolvedSemantic["contract"];
  };
  task: FocusedGraphResolvedSemantic;
  object: FocusedGraphResolvedSemantic;
  relationship: FocusedGraphResolvedSemantic;
  action: FocusedGraphResolvedSemantic;
  expansion?: FocusedGraphResolvedSemantic;
}

type FocusedGraphMeaning = FocusedGraphRelationship["meaning_kind"];
type FocusedGraphOrigin = FocusedGraphRelationship["origin"];

interface ExpansionRecipe {
  readonly meaningKinds: ReadonlySet<FocusedGraphMeaning>;
  readonly directions: ReadonlySet<"outgoing" | "incoming">;
}

const ALL_SCIENTIFIC_MEANINGS: readonly FocusedGraphMeaning[] = [
  "citation",
  "support",
  "contradiction",
  "qualification",
  "inference",
  "provenance",
];

const EXPANSION_RECIPES = new Map<string, ExpansionRecipe>([
  [
    "scientific.graph.trace-sources",
    {
      meaningKinds: new Set<FocusedGraphMeaning>(["citation", "provenance"]),
      directions: new Set(["outgoing", "incoming"]),
    },
  ],
  [
    "scientific.graph.show-contrary",
    {
      meaningKinds: new Set<FocusedGraphMeaning>(["contradiction"]),
      directions: new Set(["outgoing", "incoming"]),
    },
  ],
  [
    "scientific.graph.show-downstream",
    {
      meaningKinds: new Set<FocusedGraphMeaning>(ALL_SCIENTIFIC_MEANINGS),
      directions: new Set(["outgoing"]),
    },
  ],
]);

interface TraversalStep {
  readonly relationshipId: string;
  readonly fromId: string;
  readonly toId: string;
  readonly traversalDirection: "outgoing" | "incoming";
  readonly repeatedMember: boolean;
}

interface CurrentSelection {
  readonly graph: AuthorityGraphObjectView;
  readonly assertion: PetraAssertion;
  readonly traversal: readonly TraversalStep[];
}

interface CurrentTraversalResult {
  readonly claims: Map<string, PetraClaim>;
  readonly graphClaims: Map<string, AuthorityGraphObjectView>;
  readonly selected: CurrentSelection[];
  readonly capped: boolean;
  readonly filtered: number;
  readonly unknownMembership: boolean;
}

const isExplorationRequest = (
  request: FocusedGraphReadRequest,
): request is FocusedGraphExplorationViewRequest =>
  "exploration" in request && request.exploration !== undefined;

const assertionOrigin = (assertion: PetraAssertion): FocusedGraphOrigin =>
  assertion.assertion_kind === "model_inference"
    ? "model_inference"
    : "canonical_record";

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
    CITES: "citation",
    CITES_AS_BACKGROUND: "citation",
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
    ASSUMES: "inference",
    DIRECTLY_TESTS: "inference",
    EXTENDS: "inference",
    PREDICTS: "inference",
    TESTS: "inference",
    TESTS_CAUSE: "inference",
    ASSERTS: "provenance",
  })[predicate] as FocusedGraphRelationship["meaning_kind"] | undefined;

const MAX_SOURCE_LOCATIONS = 96;

interface SourceLocation {
  readonly ref: FocusedGraphExactRef;
  readonly span: PetraSourceSpan;
  readonly projectScoped: boolean;
}

const sourceSpanIdsForClaim = (claim: PetraClaim): readonly string[] =>
  claim.basis.basis_kind === "source" ? claim.basis.source_span_ids : [];

const sourceSpanIdsForAssertion = (
  assertion: PetraAssertion,
): readonly string[] =>
  assertion.provenance_refs
    .filter((ref) => ref.provenance_kind === "source_span")
    .map((ref) => ref.source_span_id);

const unique = (values: readonly string[]): string[] => [...new Set(values)];

const uniqueRefs = (
  values: readonly FocusedGraphExactRef[],
): FocusedGraphExactRef[] => [
  ...new Map(
    values.map((value) => {
      const ref: FocusedGraphExactRef = {
        record_id: value.record_id,
        revision: value.revision,
        record_hash: value.record_hash,
      };
      return [`${ref.record_id}:${ref.revision}:${ref.record_hash}`, ref];
    }),
  ).values(),
];

const titleCase = (value: string): string =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const sourceLocationSummary = (location: SourceLocation): string => {
  const selector = location.span.selector;
  const selectorKinds =
    selector.selector_type === "compound"
      ? selector.components.map((component) => component.component_kind)
      : [selector.selector_type];
  return `${titleCase(location.span.verification.status)} ${selectorKinds
    .map(titleCase)
    .join(
      ", ",
    )} SourceSpan ${location.span.source_span_id} revision ${location.span.revision}`;
};

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
  readonly #objectLocations: PostgresProjectObjectLocationViewReader;
  readonly #sourceViews: PostgresProjectSourceViewReader;

  constructor(
    pool: Pool,
    graph: AuthorityGraphStore,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#graph = graph;
    this.#contracts = contracts;
    this.#resolver = new FocusedGraphViewContractResolver(contracts);
    this.#objectLocations = new PostgresProjectObjectLocationViewReader(
      pool,
      contracts,
    );
    this.#sourceViews = new PostgresProjectSourceViewReader(pool, contracts);
  }

  async queryFocusedGraphDetails(
    projectId: string,
    request: FocusedGraphDetailsViewRequest,
  ): Promise<PetraFocusedGraphDetailsView | undefined> {
    request = parseFocusedGraphDetailsViewRequest(request);
    const graph = await this.queryFocusedGraph(
      projectId,
      request.focused_graph_request,
    );
    if (graph === undefined) return undefined;
    if (
      graph.schema_name !== request.expected_graph.schema_name ||
      graph.schema_version !== request.expected_graph.schema_version ||
      graph.content_hash !== request.expected_graph.content_hash
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_SNAPSHOT_STALE",
        "The selected Details request no longer matches the exact focused graph result.",
      );
    }

    const nodes = new Map(
      graph.content.nodes.map((node) => [node.node_key, node] as const),
    );
    const relationships = new Map(
      graph.content.relationships.map(
        (relationship) =>
          [relationship.relationship_key, relationship] as const,
      ),
    );
    const paths = new Map(
      graph.content.paths.map((path) => [path.path_key, path] as const),
    );
    const selectedNodes = new Set<string>();
    const selectedRelationships = new Set<string>();
    const selectedPaths: FocusedGraphPath[] = [];
    for (const key of request.selection.selected_keys) {
      if (request.selection.selection_kind === "node") {
        if (!nodes.has(key)) this.#selectionUnavailable(key);
        selectedNodes.add(key);
      } else if (request.selection.selection_kind === "relationship") {
        if (!relationships.has(key)) this.#selectionUnavailable(key);
        selectedRelationships.add(key);
      } else {
        const path = paths.get(key);
        if (path === undefined) this.#selectionUnavailable(key);
        selectedPaths.push(path);
        for (const step of path.steps) {
          selectedNodes.add(step.from_node_key);
          selectedNodes.add(step.to_node_key);
          selectedRelationships.add(step.relationship_key);
        }
      }
    }

    return this.#readTransaction(async (client, readAt) => {
      const authority = await this.#authority(client, projectId);
      if (
        graph.content.semantic_layer !== "historical" &&
        authority.eventPosition !==
          graph.content.requested_snapshot.event_position
      ) {
        throw this.#error(
          "FOCUSED_GRAPH_SNAPSHOT_STALE",
          "Project authority advanced before the selected Details could be composed.",
        );
      }
      const nodeDetails: FocusedGraphDetailsContent["nodes"] = [];
      for (const key of selectedNodes) {
        const node = nodes.get(key);
        if (node === undefined) this.#selectionUnavailable(key);
        const semanticLocation =
          await this.#objectLocations.locateProjectObjectInSnapshot(
            client,
            {
              project_id: projectId,
              object_ref: {
                semantic_key: this.#locationSemanticKey(
                  node.record_ref.record_id,
                  node.semantic_key,
                ),
                object_id: node.record_ref.record_id,
                revision: node.record_ref.revision,
              },
              task_intent: "inspect",
            },
            readAt,
          );
        if (semanticLocation === undefined) {
          throw this.#corrupt(
            "A selected graph node lost its Project semantic-location owner.",
          );
        }
        this.#assertLocationIdentity(semanticLocation.content, node.record_ref);
        this.#assertLocationDefinition(
          semanticLocation.content,
          graph.content.profile.project_definition_ref,
        );
        nodeDetails.push({
          member_kind: "node",
          member_key: key,
          member: structuredClone(node),
          semantic_location: structuredClone(semanticLocation.content),
          source_inspections: await this.#sourceInspections(
            client,
            readAt,
            projectId,
            node.basis.record_refs,
            graph.content.profile.project_definition_ref,
          ),
        });
      }

      const relationshipDetails: FocusedGraphDetailsContent["relationships"] =
        [];
      for (const key of selectedRelationships) {
        const relationship = relationships.get(key);
        if (relationship === undefined) this.#selectionUnavailable(key);
        const relationshipRef: FocusedGraphExactRef = {
          record_id: relationship.relationship_ref.element_id,
          revision: relationship.relationship_ref.revision,
          record_hash: relationship.relationship_ref.record_hash,
        };
        const semanticLocation =
          await this.#objectLocations.locateProjectObjectInSnapshot(
            client,
            {
              project_id: projectId,
              object_ref: {
                semantic_key: this.#locationSemanticKey(
                  relationshipRef.record_id,
                  relationship.semantic_key,
                ),
                object_id: relationshipRef.record_id,
                revision: relationshipRef.revision,
              },
              task_intent: "inspect",
            },
            readAt,
          );
        if (semanticLocation === undefined) {
          throw this.#corrupt(
            "A selected graph relationship lost its Project semantic-location owner.",
          );
        }
        this.#assertLocationIdentity(semanticLocation.content, relationshipRef);
        this.#assertLocationDefinition(
          semanticLocation.content,
          graph.content.profile.project_definition_ref,
        );
        relationshipDetails.push({
          member_kind: "relationship",
          member_key: key,
          member: structuredClone(relationship),
          semantic_location: structuredClone(semanticLocation.content),
          source_inspections: await this.#sourceInspections(
            client,
            readAt,
            projectId,
            relationship.basis.record_refs,
            graph.content.profile.project_definition_ref,
          ),
        });
      }

      const returnDestinations = graph.content.destinations.filter(
        (destination) =>
          destination.destination_key ===
          graph.content.task.return_destination_key,
      );
      if (returnDestinations.length !== 1) {
        throw this.#corrupt(
          "The selected Details result lost its exact graph return destination.",
        );
      }
      const content: FocusedGraphDetailsContent = {
        details_request_id: request.details_request_id,
        graph: {
          schema_name: graph.schema_name,
          schema_version: graph.schema_version,
          content_hash: graph.content_hash,
          task: structuredClone(graph.content.task),
          profile: structuredClone(graph.content.profile),
          requested_snapshot: structuredClone(graph.content.requested_snapshot),
          represented_snapshot: structuredClone(
            graph.content.represented_snapshot,
          ),
          semantic_layer: graph.content.semantic_layer,
          temporal_position: structuredClone(graph.content.temporal_position),
          projection_position: structuredClone(
            graph.content.projection_position,
          ),
          scope: structuredClone(graph.content.scope),
          return_destination: structuredClone(returnDestinations[0]!),
        },
        selection: {
          selection_kind: request.selection.selection_kind,
          selected_keys: [...request.selection.selected_keys] as [
            string,
            ...string[],
          ],
        },
        nodes: nodeDetails,
        relationships: relationshipDetails,
        paths: structuredClone(selectedPaths),
        limitations: [
          ...new Set([
            ...graph.content.limitations,
            "Details re-executes the exact bounded graph request and resolves destinations without granting selection authority.",
            "Source inspection is available only when the exact SourceSpan resolves through a current ProjectSource binding and an inspectable representation.",
          ]),
        ] as [string, ...string[]],
        authority_boundary: {
          postgresql_authoritative: true,
          neo4j_projection_only: true,
          selection_is_presentation_state: true,
          details_are_read_only: true,
          source_owner: "project_source_view",
          semantic_location_owner: "project_object_location_view",
          graph_specific_registry_added: false,
        },
      };
      const view: PetraFocusedGraphDetailsView = {
        schema_name: "petra.focused-graph-details-view",
        schema_version: "1.0.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      this.#contracts.assertValid("focused-graph-details-view", "1.0.0", view);
      return view;
    });
  }

  async queryFocusedGraph(
    projectId: string,
    request: FocusedGraphReadRequest,
  ): Promise<PetraFocusedGraphReadView | undefined> {
    request = parseFocusedGraphViewRequest(request);
    if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId)) {
      throw this.#error(
        "FOCUSED_GRAPH_QUERY_INVALID",
        "A focused graph query requires one exact Project identity.",
      );
    }
    if (request.task_kind !== "neighborhood") {
      throw this.#error(
        "FOCUSED_GRAPH_QUERY_INVALID",
        "This focused query owner supports only an exact bounded neighborhood.",
      );
    }

    return this.#readTransaction(async (client, readAt) => {
      if (request.semantic_layer === "historical") {
        if (isExplorationRequest(request)) {
          throw this.#error(
            "FOCUSED_GRAPH_QUERY_INVALID",
            "Named expansion is unavailable for a retained Historical position.",
          );
        }
        return this.#historicalView(client, readAt, projectId, request);
      }
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

      const traversal = isExplorationRequest(request)
        ? await this.#expandedSelections(
            client,
            projectId,
            focusGraph,
            focusClaim,
            request,
            checkpoint,
          )
        : await this.#oneHopSelections(
            client,
            projectId,
            focusGraph,
            focusClaim,
            request,
            checkpoint,
          );
      const { claims, graphClaims, selected } = traversal;
      let capped = traversal.capped;

      await this.#guardProjection(
        checkpoint,
        observed.targetSequence,
        represented.target_sequence,
        represented.stream_revision,
      );

      const nodeKey = (id: string): string => `node:${id.toLowerCase()}`;
      const relationshipKey = (id: string): string =>
        `relationship:${id.toLowerCase()}`;
      const workingNodeKey = (candidate: PetraWorkingCandidate): string =>
        `node:working:${candidate.working_candidate_id.toLowerCase()}:${candidate.revision}`;
      const workingRelationshipKey = (
        relationship: PetraWorkingRelationship,
      ): string =>
        `relationship:working:${relationship.working_relationship_id.toLowerCase()}:${relationship.revision}`;
      const workingQueryResult =
        request.semantic_layer === "working"
          ? await this.#workingSelections(
              client,
              projectId,
              definition,
              semantics,
              new Map(
                [...graphClaims.values()].map((node) => [
                  node.id,
                  {
                    record_id: node.id,
                    revision: node.authoritativeRevision,
                    record_hash: node.recordHash,
                  },
                ]),
              ),
              {
                nodes: Math.max(0, request.limits.maximum_nodes - claims.size),
                relationships: Math.max(
                  0,
                  request.limits.maximum_relationships - selected.length,
                ),
                paths: Math.max(
                  0,
                  request.limits.maximum_paths - selected.length,
                ),
              },
            )
          : { selections: [], capped: false, hidden: 0 };
      const workingDirection = (
        selection: WorkingSelection,
      ): "outgoing" | "incoming" =>
        selection.currentIsSubject ? "outgoing" : "incoming";
      const workingFilteredSelections = isExplorationRequest(request)
        ? workingQueryResult.selections.filter((selection) => {
            const meaning = meaningKind(
              selection.relationship.profile_relationship.predicate,
            );
            return !(
              meaning !== undefined &&
              request.exploration.filters.meaning_kinds.includes(meaning) &&
              request.exploration.filters.origins.includes(
                "working_candidate",
              ) &&
              request.exploration.filters.directions.includes(
                workingDirection(selection),
              )
            );
          })
        : [];
      const workingResult = isExplorationRequest(request)
        ? {
            ...workingQueryResult,
            selections: workingQueryResult.selections.filter((selection) => {
              const meaning = meaningKind(
                selection.relationship.profile_relationship.predicate,
              );
              return (
                meaning !== undefined &&
                request.exploration.filters.meaning_kinds.includes(meaning) &&
                request.exploration.filters.origins.includes(
                  "working_candidate",
                ) &&
                request.exploration.filters.directions.includes(
                  workingDirection(selection),
                )
              );
            }),
            hidden:
              workingQueryResult.hidden + workingFilteredSelections.length,
          }
        : workingQueryResult;
      if (workingResult.capped) capped = true;
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

      const requestedSourceSpanIds = unique([
        ...[...claims.values()].flatMap(sourceSpanIdsForClaim),
        ...selected.flatMap(({ assertion }) =>
          sourceSpanIdsForAssertion(assertion),
        ),
        ...workingResult.selections.flatMap(
          ({ claim, assertion, candidate, relationship }) => [
            ...sourceSpanIdsForClaim(claim),
            ...sourceSpanIdsForAssertion(assertion),
            ...this.#workingSourceSpanIds(candidate),
            ...this.#workingSourceSpanIds(relationship),
          ],
        ),
      ]);
      const representedSourceSpanIds = requestedSourceSpanIds.slice(
        0,
        MAX_SOURCE_LOCATIONS,
      );
      const sourceLocations = await this.#sourceLocations(
        client,
        projectId,
        representedSourceSpanIds,
      );
      const sourceLocationsCapped =
        requestedSourceSpanIds.length > representedSourceSpanIds.length;
      const sourceDestinations = new Map<
        string,
        FocusedGraphSemanticDestination
      >();
      const sourceFacts = (
        memberKey: string,
        memberLabel: string,
        sourceSpanIds: readonly string[],
      ): {
        destinationKeys: string[];
        refs: FocusedGraphExactRef[];
        summary: string;
        limitations: string[];
      } => {
        const locations = unique(sourceSpanIds)
          .map((sourceSpanId) => sourceLocations.get(sourceSpanId))
          .filter(
            (location): location is SourceLocation =>
              location !== undefined && location.projectScoped,
          );
        const unavailableProjectLocations = unique(sourceSpanIds).filter(
          (sourceSpanId) =>
            sourceLocations.get(sourceSpanId)?.projectScoped === false,
        );
        const omittedLocations = unique(sourceSpanIds).filter(
          (sourceSpanId) => !sourceLocations.has(sourceSpanId),
        );
        const destinationKeys: string[] = [];
        for (const location of locations) {
          const destinationKey = `destination:source:${location.span.source_span_id.toLowerCase()}`;
          if (destinationKey === request.return_destination.destination_key) {
            throw this.#error(
              "FOCUSED_GRAPH_QUERY_INVALID",
              "The return destination key collides with a server-composed source location.",
            );
          }
          if (!sourceDestinations.has(destinationKey)) {
            sourceDestinations.set(destinationKey, {
              destination_key: destinationKey,
              destination_kind: "source_inspection",
              state: "available",
              owner: "project_object_location_view",
              label: "Inspect exact source location",
              target_ref: location.ref,
            });
          }
          destinationKeys.push(destinationKey);
        }
        const limitations: string[] = [];
        if (sourceSpanIds.length === 0) {
          limitations.push(
            `No direct SourceSpan location is recorded for this ${memberLabel}.`,
          );
        }
        if (unavailableProjectLocations.length > 0) {
          limitations.push(
            `${unavailableProjectLocations.length} recorded SourceSpan ${unavailableProjectLocations.length === 1 ? "location has" : "locations have"} no Project-scoped source-inspection destination at this snapshot.`,
          );
        }
        if (omittedLocations.length > 0) {
          limitations.push(
            `${omittedLocations.length} additional recorded SourceSpan ${omittedLocations.length === 1 ? "location is" : "locations are"} outside the bounded source-location limit of ${MAX_SOURCE_LOCATIONS}.`,
          );
        }
        if (limitations.length > 0) {
          const destinationKey = `destination:source-unavailable:${memberKey}`;
          if (destinationKey === request.return_destination.destination_key) {
            throw this.#error(
              "FOCUSED_GRAPH_QUERY_INVALID",
              "The return destination key collides with a server-composed unavailable source fact.",
            );
          }
          sourceDestinations.set(destinationKey, {
            destination_key: destinationKey,
            destination_kind: "source_inspection",
            state: "unavailable",
            owner: "project_object_location_view",
            label: "Source location unavailable",
            reason: limitations.join(" "),
          });
          destinationKeys.push(destinationKey);
        }
        const verificationStates = unique(
          locations.map((location) => location.span.verification.status),
        );
        return {
          destinationKeys,
          refs: locations.map((location) => location.ref),
          summary:
            locations.length === 0
              ? "No Project-scoped exact SourceSpan location is available."
              : `${locations.length} Project-scoped exact SourceSpan ${locations.length === 1 ? "location" : "locations"}; verification ${verificationStates.join(", ")}. ${locations
                  .slice(0, 3)
                  .map(sourceLocationSummary)
                  .join(
                    "; ",
                  )}${locations.length > 3 ? "; additional exact locations remain available through their typed destinations" : ""}.`,
          limitations,
        };
      };

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
          const memberKey = nodeKey(claimId);
          const sources = sourceFacts(
            memberKey,
            semantics.object.term.singular,
            sourceSpanIdsForClaim(claim),
          );
          const validationSummary =
            claim.basis.basis_kind === "source"
              ? ` Validators ${claim.basis.validator_results
                  .map(
                    (result) =>
                      `${result.validator_name}=${result.outcome}:${result.code}`,
                  )
                  .join(", ")}.`
              : "";
          return {
            node_key: memberKey,
            record_ref: ref,
            semantic_key: semantics.object.semantic_key,
            term: semantics.object.term,
            label: claim.canonical_text,
            summary: `A ${claim.claim_kind} ${semantics.object.term.singular} at exact canonical revision ${claim.revision}.`,
            layer: "current",
            authority_position: "current_authority",
            lifecycle: "represented",
            basis: {
              summary: `PostgreSQL canonical ${semantics.object.term.singular} with ${claim.basis.basis_kind} basis; recorded authority is ${claim.authority.zone}/${claim.authority.review_state}. ${sources.summary}${validationSummary}`,
              record_refs: [ref, ...sources.refs],
              limitations: sources.limitations,
            },
            destination_keys: [
              ...sources.destinationKeys,
              returnTarget !== undefined && sameExactRef(returnTarget, ref)
                ? request.return_destination.destination_key
                : undefined,
            ].filter((key): key is string => key !== undefined),
          };
        });

      const workingNodesByKey = new Map<string, FocusedGraphNode>();
      for (const selection of workingResult.selections) {
        const key = workingNodeKey(selection.candidate);
        if (workingNodesByKey.has(key)) continue;
        const sources = sourceFacts(
          key,
          semantics.object.term.singular,
          unique([
            ...sourceSpanIdsForClaim(selection.claim),
            ...this.#workingSourceSpanIds(selection.candidate),
          ]),
        );
        const candidateRef: FocusedGraphExactRef = {
          record_id: selection.candidate.working_candidate_id,
          revision: selection.candidate.revision,
          record_hash: selection.candidateHash,
        };
        const profileRef: FocusedGraphExactRef = {
          record_id:
            selection.candidate.profile_object.object_record_ref.record_id,
          revision:
            selection.candidate.profile_object.object_record_ref.revision,
          record_hash:
            selection.candidate.profile_object.object_record_ref.record_hash,
        };
        workingNodesByKey.set(key, {
          node_key: key,
          record_ref: candidateRef,
          semantic_key: semantics.object.semantic_key,
          term: semantics.object.term,
          label: selection.claim.canonical_text,
          summary: `A durable non-authoritative ${semantics.object.term.singular} working revision ${selection.candidate.revision}; validation ${selection.candidate.validation.state}.`,
          layer: "working",
          authority_position: "working_non_authority",
          lifecycle:
            selection.candidate.disposition === "withdrawn"
              ? "superseded"
              : "represented",
          basis: {
            summary: `${selection.candidate.origin.summary} Bound to Project snapshot ${selection.candidate.input_snapshot.snapshot_ref.snapshot_id} at authority event ${selection.candidate.input_snapshot.snapshot_ref.event_position}; validation does not grant authority. ${sources.summary}`,
            record_refs: uniqueRefs([
              candidateRef,
              profileRef,
              ...selection.candidate.basis.map((item) => item.record_ref),
              ...selection.candidate.provenance.map((item) => item.record_ref),
              ...sources.refs,
            ]),
            limitations: [
              "This WorkingCandidate is durable working state and is not current Project authority.",
              ...selection.candidate.qualifications.statements.map(
                (statement) => statement.statement,
              ),
              ...sources.limitations,
            ],
          },
          destination_keys: sources.destinationKeys,
        });
      }
      nodes.push(...workingNodesByKey.values());

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
          const memberKey = relationshipKey(graphRelationship.id);
          const sources = sourceFacts(
            memberKey,
            semantics.relationship.term.singular,
            sourceSpanIdsForAssertion(assertion),
          );
          return {
            relationship_key: memberKey,
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
              summary: `Exact canonical Assertion revision ${assertion.revision}; predicate ${assertion.predicate}; origin ${assertion.assertion_kind}; recorded authority ${assertion.authority.zone}/${assertion.authority.review_state}. ${sources.summary}`,
              record_refs: [exactRef, ...sources.refs],
              limitations: sources.limitations,
            },
            destination_keys: [
              ...sources.destinationKeys,
              returnTarget !== undefined && sameExactRef(returnTarget, exactRef)
                ? request.return_destination.destination_key
                : undefined,
            ].filter((key): key is string => key !== undefined),
          };
        },
      );
      for (const selection of workingResult.selections) {
        const meaning = meaningKind(
          selection.relationship.profile_relationship.predicate,
        );
        if (meaning === undefined) {
          throw this.#error(
            "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
            `The registered focused query does not map working predicate ${selection.relationship.profile_relationship.predicate} to a renderer-neutral relationship meaning.`,
          );
        }
        const memberKey = workingRelationshipKey(selection.relationship);
        const sources = sourceFacts(
          memberKey,
          semantics.relationship.term.singular,
          unique([
            ...sourceSpanIdsForAssertion(selection.assertion),
            ...this.#workingSourceSpanIds(selection.relationship),
          ]),
        );
        const currentKey = nodeKey(selection.currentNodeId);
        const candidateKey = workingNodeKey(selection.candidate);
        const workingRef: FocusedGraphExactRef = {
          record_id: selection.relationship.working_relationship_id,
          revision: selection.relationship.revision,
          record_hash: selection.relationshipHash,
        };
        relationships.push({
          relationship_key: memberKey,
          relationship_ref: {
            element_id: selection.relationship.working_relationship_id,
            revision: selection.relationship.revision,
            record_hash: selection.relationshipHash,
          },
          semantic_key: semantics.relationship.semantic_key,
          term: semantics.relationship.term,
          predicate: selection.relationship.profile_relationship.predicate,
          meaning_kind: meaning,
          source_node_key: selection.currentIsSubject
            ? currentKey
            : candidateKey,
          target_node_key: selection.currentIsSubject
            ? candidateKey
            : currentKey,
          direction: "outgoing",
          origin: "working_candidate",
          layer: "working",
          authority_position: "working_non_authority",
          summary: `${selection.relationship.origin.summary} This durable relationship is not accepted Project authority.`,
          basis: {
            summary: `Exact WorkingRelationship revision ${selection.relationship.revision}; predicate ${selection.relationship.profile_relationship.predicate}; validation ${selection.relationship.validation.state}; base snapshot event ${selection.relationship.input_snapshot.snapshot_ref.event_position}. ${sources.summary}`,
            record_refs: uniqueRefs([
              workingRef,
              {
                record_id:
                  selection.relationship.profile_relationship
                    .relationship_record_ref.record_id,
                revision:
                  selection.relationship.profile_relationship
                    .relationship_record_ref.revision,
                record_hash:
                  selection.relationship.profile_relationship
                    .relationship_record_ref.record_hash,
              },
              ...selection.relationship.basis.map((item) => item.record_ref),
              ...selection.relationship.provenance.map(
                (item) => item.record_ref,
              ),
              ...sources.refs,
            ]),
            limitations: [
              "This WorkingRelationship is non-authoritative and can change authority only through canonical Review and Apply.",
              ...selection.relationship.qualifications.statements.map(
                (statement) => statement.statement,
              ),
              ...sources.limitations,
            ],
          },
          destination_keys: sources.destinationKeys,
        });
      }
      const paths: FocusedGraphPath[] = selected.map((selection, index) => ({
        path_key: `path:${selection.graph.id.toLowerCase()}:${index + 1}`,
        state: "complete",
        ordering_rationale: isExplorationRequest(request)
          ? `Breadth-first traversal from the exact named-expansion target under registered recipe ${request.exploration.recipe_semantic_key}. This order is not evidence strength.`
          : "One exact recorded relationship is the complete path within this one-hop result.",
        steps: selection.traversal.map((step, stepIndex) => ({
          position: stepIndex + 1,
          from_node_key: nodeKey(step.fromId),
          relationship_key: relationshipKey(step.relationshipId),
          to_node_key: nodeKey(step.toId),
          traversal_direction: step.traversalDirection,
          repeated_member: step.repeatedMember,
        })),
        limitations: unique(
          selection.traversal.flatMap((step) => {
            const relationship = relationships.find(
              (candidate) =>
                candidate.relationship_key ===
                relationshipKey(step.relationshipId),
            );
            return relationship?.basis.limitations ?? [];
          }),
        ),
      }));
      paths.push(
        ...workingResult.selections.map((selection) => {
          const relationship = relationships.find(
            (candidate) =>
              candidate.relationship_key ===
              workingRelationshipKey(selection.relationship),
          );
          if (relationship === undefined) {
            throw this.#corrupt(
              "A selected WorkingRelationship has no composed focused member.",
            );
          }
          const currentKey = nodeKey(selection.currentNodeId);
          const candidateKey = workingNodeKey(selection.candidate);
          return {
            path_key: `path:${relationship.relationship_ref.element_id.toLowerCase()}`,
            state: "complete" as const,
            ordering_rationale:
              "One exact durable WorkingRelationship is represented separately from Current authority.",
            steps: [
              {
                position: 1,
                from_node_key: currentKey,
                relationship_key: relationship.relationship_key,
                to_node_key: candidateKey,
                traversal_direction: workingDirection(selection),
                repeated_member:
                  relationship.source_node_key === relationship.target_node_key,
              },
            ],
            limitations: structuredClone(relationship.basis.limitations),
          };
        }),
      );

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
          request.semantic_layer === "working"
            ? isExplorationRequest(request)
              ? "Whole-Project traversal, Historical state, unregistered recipes, and records beyond this exact named expansion remain outside scope. Current and Working members retain separate authority positions."
              : "Whole-Project traversal, Historical state, structural provenance, and expansion are outside this result. Current and Working members retain separate authority positions."
            : isExplorationRequest(request)
              ? "Whole-Project traversal, Working changes, Historical state, unregistered recipes, and records beyond this exact named expansion remain outside scope."
              : "Whole-Project traversal, Working changes, Historical state, structural provenance, and expansion are outside this result.",
        count: { state: "unknown" },
      };
      const omissionList: FocusedGraphOmission[] = [];
      if (capped || sourceLocationsCapped) {
        omissionList.push({
          omission_kind: "capped",
          description:
            capped && sourceLocationsCapped
              ? `Additional recorded ${isExplorationRequest(request) ? "named-expansion" : "one-hop"} relationships may exist beyond the caller-visible membership limit, and ${requestedSourceSpanIds.length - representedSourceSpanIds.length} recorded SourceSpan locations are outside the bounded source-location limit.`
              : capped
                ? `Additional recorded ${isExplorationRequest(request) ? "named-expansion" : "one-hop"} relationships may exist beyond the caller-visible node, relationship, or path limit.`
                : `${requestedSourceSpanIds.length - representedSourceSpanIds.length} recorded SourceSpan locations are outside the bounded source-location limit of ${MAX_SOURCE_LOCATIONS}.`,
          count:
            sourceLocationsCapped && !capped
              ? {
                  state: "exact",
                  value:
                    requestedSourceSpanIds.length -
                    representedSourceSpanIds.length,
                }
              : { state: "unknown" },
        });
      }
      if (workingQueryResult.hidden > 0) {
        omissionList.push({
          omission_kind: "working_hidden",
          description:
            "Relevant WorkingRelationship heads with a stale/incompatible current base or beyond the finite result bound were not overlaid onto Current authority.",
          count: workingQueryResult.capped
            ? { state: "unknown" }
            : { state: "exact", value: workingQueryResult.hidden },
        });
      }
      if (isExplorationRequest(request)) {
        const filteredRelationshipCount =
          traversal.filtered + workingFilteredSelections.length;
        if (filteredRelationshipCount > 0) {
          omissionList.push({
            omission_kind: "filtered",
            description:
              "Recorded candidate relationships outside the registered recipe or normalized filters are hidden from this returned membership; this does not assert absence.",
            count: traversal.unknownMembership
              ? { state: "unknown" }
              : { state: "exact", value: filteredRelationshipCount },
          });
        }
        omissionList.push(
          {
            omission_kind: "restricted",
            description:
              "Authorization is rechecked for this expansion. Restricted path names, identities, connections, and counts are not disclosed.",
            count: { state: "not_disclosed" },
          },
          {
            omission_kind: "unknown",
            description:
              "Paths outside the exact registered recipe, snapshot, layer, filters, and finite limits remain unknown and cannot be treated as absent.",
            count: { state: "unknown" },
          },
        );
      }
      omissionList.push(outOfScopeOmission);
      const omissions = omissionList as [
        FocusedGraphOmission,
        ...FocusedGraphOmission[],
      ];
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
        semantic_layer: request.semantic_layer,
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
            request.semantic_layer === "working"
              ? isExplorationRequest(request)
                ? "One exact named expansion from a current Claim with relevant durable WorkingRelationship heads and their exact WorkingCandidate endpoints represented separately."
                : "One exact current Claim neighborhood with relevant durable WorkingRelationship heads and their exact WorkingCandidate endpoints."
              : isExplorationRequest(request)
                ? "One exact named expansion from a current Claim through the bounded scientific relationship projection."
                : "One exact current Claim neighborhood from the bounded scientific relationship projection.",
          included_relationship_semantics: [
            semantics.relationship.semantic_key,
          ],
          directions: ["outgoing", "incoming"],
          included_layers:
            request.semantic_layer === "working"
              ? ["current", "working"]
              : ["current"],
          limits: structuredClone(request.limits),
          coverage:
            capped || sourceLocationsCapped
              ? "capped"
              : traversal.unknownMembership
                ? "partial"
                : "complete_for_scope",
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
        destinations: [
          structuredClone(request.return_destination),
          ...[...sourceDestinations.values()].filter(
            (destination) =>
              destination.destination_key !==
              request.return_destination.destination_key,
          ),
        ],
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
          request.semantic_layer === "working"
            ? "Working changes are current durable heads relevant to returned Current endpoints; they remain non-authoritative and are not overlaid as Current."
            : isExplorationRequest(request)
              ? "This named expansion reveals only recorded Current relationships admitted by its registered recipe and normalized filters; relevant Working changes require an explicit working-layer request."
              : "This is a current one-hop Claim neighborhood; relevant Working changes require an explicit working-layer request.",
          "PostgreSQL supplies authority; Neo4j supplies rebuildable bounded membership and never domain authority.",
        ],
      };
      if (isExplorationRequest(request)) {
        const expansionSemantic = semantics.expansion;
        if (expansionSemantic === undefined) {
          throw this.#error(
            "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
            "The named expansion recipe did not resolve through the exact ProjectDefinition.",
          );
        }
        const resultState = capped
          ? ("capped" as const)
          : traversal.unknownMembership ||
              sourceLocationsCapped ||
              workingQueryResult.hidden > 0
            ? ("partial" as const)
            : ("complete_for_scope" as const);
        const cycleCount = paths.filter((path) =>
          path.steps.some((step) => step.repeated_member),
        ).length;
        const groupCoordinates: Array<{
          layer: "current" | "working";
          meaning: FocusedGraphMeaning;
        }> = [];
        for (const meaning of request.exploration.filters.meaning_kinds) {
          groupCoordinates.push({ layer: "current", meaning });
          if (request.semantic_layer === "working") {
            groupCoordinates.push({ layer: "working", meaning });
          }
        }
        const groups = groupCoordinates.map(({ layer, meaning }) => {
          const keys = relationships
            .filter(
              (relationship) =>
                relationship.layer === layer &&
                relationship.meaning_kind === meaning,
            )
            .map((relationship) => relationship.relationship_key);
          const group: FocusedGraphGroupV11 = {
            group_key: `group:relationship-meaning:${layer}:${meaning}`,
            facet: "relationship_meaning",
            label: `${titleCase(meaning)} — ${titleCase(layer)}`,
            membership_rule: `Exact returned ${layer} relationships whose renderer-neutral meaning is ${meaning}; the group is a presentation facet and not a domain assertion.`,
            count_unit: "relationships",
            layer,
            meaning_kind: meaning,
            member_relationship_keys: keys,
            returned_count: keys.length,
            total_count:
              resultState === "complete_for_scope"
                ? { state: "exact", value: keys.length }
                : { state: "unknown" },
            filtered_count: { state: "exact", value: 0 },
            hidden_count:
              resultState === "complete_for_scope"
                ? { state: "exact", value: 0 }
                : { state: "unknown" },
            coverage: resultState,
            overlap: false,
          };
          return group;
        }) as [FocusedGraphGroupV11, ...FocusedGraphGroupV11[]];
        const contentV11: PetraFocusedGraphViewV11["content"] = {
          ...content,
          profile: {
            ...content.profile,
            resolved_semantics: [
              ...content.profile.resolved_semantics,
              expansionSemantic,
            ],
          },
          exploration: {
            mode: "named_expansion",
            expansion_key: request.exploration.expansion_key,
            recipe_semantic_key: expansionSemantic.semantic_key,
            recipe_label: expansionSemantic.term.singular,
            target_ref: structuredClone(request.exploration.target_ref),
            target_node_key: nodeKey(request.exploration.target_ref.record_id),
            maximum_depth: request.exploration.maximum_depth,
            filters: structuredClone(request.exploration.filters),
            accounting: {
              result_state: resultState,
              capped_members: capped
                ? { state: "unknown" }
                : { state: "exact", value: 0 },
              hidden_relationships:
                capped || traversal.unknownMembership || workingResult.capped
                  ? { state: "unknown" }
                  : {
                      state: "exact",
                      value: traversal.filtered + workingResult.hidden,
                    },
              restricted_paths: { state: "not_disclosed" },
              cycle_paths: { state: "exact", value: cycleCount },
              incomplete_paths:
                resultState === "complete_for_scope"
                  ? { state: "exact", value: 0 }
                  : { state: "unknown" },
              unknown_paths: { state: "unknown" },
            },
          },
          scope: {
            ...content.scope,
            directions: structuredClone(request.exploration.filters.directions),
            coverage: resultState,
          },
          groups,
          actions: [
            ...content.actions,
            {
              action_key: `action:${expansionSemantic.semantic_key.replaceAll(".", ":")}:${request.exploration.expansion_key.replaceAll("/", ":")}`,
              action_kind: "expand_recorded",
              semantic_key: expansionSemantic.semantic_key,
              label: expansionSemantic.term.singular,
              consequence: "read_only_expansion",
              target_keys: [nodeKey(request.exploration.target_ref.record_id)],
              availability: { state: "available" },
            },
          ],
        };
        const view: PetraFocusedGraphViewV11 = {
          schema_name: "petra.focused-graph-view",
          schema_version: "1.1.0",
          project_id: projectId,
          content: contentV11,
          content_hash: canonicalHash(contentV11),
          read_at: readAt,
        };
        return this.#resolve(definition, view);
      }
      const view: PetraFocusedGraphView = {
        schema_name: "petra.focused-graph-view",
        schema_version: "1.0.0",
        project_id: projectId,
        content,
        content_hash: canonicalHash(content),
        read_at: readAt,
      };
      return this.#resolve(definition, view);
    });
  }

  async #historicalView(
    client: PoolClient,
    readAt: string,
    projectId: string,
    request: FocusedGraphViewRequest,
  ): Promise<PetraFocusedGraphView> {
    if (
      request.temporal_position.position_kind !== "historical" ||
      request.expected_snapshot === undefined
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_QUERY_INVALID",
        "Historical Graph requires one exact retained snapshot and recorded-time position.",
      );
    }
    const eventResult = await client.query<HistoricalEventRow>(
      `SELECT event.event_position::text,
              event.stream_revision::text,
              event.recorded_at,
              (SELECT max(outbox.target_sequence)::text
                 FROM petra.outbox_records AS outbox
                 JOIN petra.domain_events AS member_event
                   ON member_event.event_id = outbox.event_id
                WHERE outbox.partition_key = $1
                  AND outbox.target = 'neo4j_graph'
                  AND member_event.event_position <= event.event_position)
                AS target_sequence
         FROM petra.domain_events AS event
        WHERE event.project_id = $1
          AND event.event_position = $2`,
      [projectId, request.expected_snapshot.event_position],
    );
    const event = eventResult.rows[0];
    if (
      event === undefined ||
      event.recorded_at.toISOString() !== request.temporal_position.at.value
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_SNAPSHOT_STALE",
        "The requested historical snapshot does not resolve to its exact retained recorded-time position.",
      );
    }
    const definitionResult = await client.query<ProjectContextRow>(
      `SELECT revision.project_id,
              revision.payload AS definition_payload,
              revision.record_hash AS definition_record_hash
         FROM petra.project_definition_history_bindings AS binding
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_id = binding.project_id
          AND revision.project_definition_id = binding.project_definition_id
          AND revision.revision = binding.project_definition_revision
          AND revision.content_hash = binding.project_definition_content_hash
          AND revision.record_hash = binding.project_definition_record_hash
        WHERE binding.project_id = $1
          AND binding.effective_after_stream_revision <= $2
        ORDER BY binding.effective_after_stream_revision DESC,
                 binding.project_definition_revision DESC
        LIMIT 1`,
      [projectId, Number(event.stream_revision)],
    );
    const definitionRow = definitionResult.rows[0];
    if (
      definitionRow === undefined ||
      definitionRow.definition_record_hash === null
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_SNAPSHOT_STALE",
        "The exact retained ProjectDefinition for this historical snapshot is unavailable.",
      );
    }
    const definition = this.#storedRecord<PetraProjectDefinition>(
      "project-definition",
      definitionRow.definition_payload,
      definitionRow.definition_record_hash,
    );
    const definitionRef: FocusedGraphProjectDefinitionRef = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      record_hash: definitionRow.definition_record_hash,
      definition_family: definition.definition_family,
    };
    if (
      definition.project_id !== projectId ||
      !sameDefinitionRef(request.project_definition_ref, definitionRef)
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_DEFINITION_STALE",
        "The requested ProjectDefinition is not the exact retained definition for this historical snapshot.",
      );
    }
    const semantics = this.#resolveSemantics(definition, request);
    const targetSequence = Number(event.target_sequence ?? 0);
    const retainedCheckpoint = await this.#checkpoint(client, projectId);
    if (
      retainedCheckpoint === undefined ||
      retainedCheckpoint.content.position.position_kind !== "advanced" ||
      retainedCheckpoint.content.position.target_sequence < targetSequence
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_PROJECTION_UNAVAILABLE",
        "The retained PostgreSQL projection ledger does not cover this exact historical snapshot.",
      );
    }
    const requestedSnapshot = this.#snapshot({
      projectId,
      definitionRef,
      eventPosition: Number(event.event_position),
      streamRevision: Number(event.stream_revision),
      targetSequence,
      positionKind: "requested",
    });
    if (!sameSnapshotRef(request.expected_snapshot, requestedSnapshot)) {
      throw this.#error(
        "FOCUSED_GRAPH_SNAPSHOT_STALE",
        "The requested historical snapshot identity does not reproduce the retained Project position.",
      );
    }
    const representedSnapshot = this.#snapshot({
      projectId,
      definitionRef,
      eventPosition: Number(event.event_position),
      streamRevision: Number(event.stream_revision),
      targetSequence,
      positionKind: "represented",
    });
    const membership = await client.query<HistoricalMemberRow>(
      `WITH ranked AS (
         SELECT member.graph_element_kind,
                member.object_id,
                member.object_revision,
                member.operation,
                row_number() OVER (
                  PARTITION BY member.graph_element_kind, member.object_id
                  ORDER BY projection.event_position DESC,
                           projection.target_sequence DESC,
                           projection.attempt DESC
                ) AS rank
           FROM petra.graph_projection_records AS projection
           JOIN petra.graph_projected_objects AS member
             ON member.graph_projection_record_id =
                projection.graph_projection_record_id
          WHERE projection.project_id = $1
            AND projection.outcome_kind = 'applied'
            AND projection.event_position <= $2
       )
       SELECT graph_element_kind, object_id, object_revision::text, operation
         FROM ranked
        WHERE rank = 1
        ORDER BY graph_element_kind, object_id`,
      [projectId, Number(event.event_position)],
    );
    const activeNodes = new Map(
      membership.rows
        .filter(
          (member) =>
            member.graph_element_kind === "node" &&
            member.operation === "upsert" &&
            member.object_id.startsWith("claim_"),
        )
        .map((member) => [member.object_id, Number(member.object_revision)]),
    );
    const focusRevision = activeNodes.get(request.focus_ref.record_id);
    if (focusRevision === undefined) {
      throw this.#error(
        "FOCUSED_GRAPH_FOCUS_NOT_FOUND",
        "The focused object is not a retained Claim member at this historical snapshot.",
      );
    }
    const focusClaim = await this.#historicalEvidence<PetraClaim>(
      client,
      request.focus_ref.record_id,
      focusRevision,
      "claim",
      "claim",
    );
    if (
      focusClaim.revision !== request.focus_ref.revision ||
      canonicalHash(focusClaim) !== request.focus_ref.record_hash
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_SNAPSHOT_STALE",
        "The focused object does not match its exact retained historical revision.",
      );
    }
    const assertions: PetraAssertion[] = [];
    let capped = false;
    for (const member of membership.rows) {
      if (
        member.graph_element_kind !== "relationship" ||
        member.operation !== "upsert" ||
        !member.object_id.startsWith("assertion_")
      ) {
        continue;
      }
      const assertion = await this.#historicalEvidence<PetraAssertion>(
        client,
        member.object_id,
        Number(member.object_revision),
        "assertion",
        "assertion",
      );
      if (
        assertion.object.object_kind !== "entity" ||
        (assertion.subject_id !== focusClaim.claim_id &&
          assertion.object.entity_id !== focusClaim.claim_id)
      ) {
        continue;
      }
      if (
        !activeNodes.has(assertion.subject_id) ||
        !activeNodes.has(assertion.object.entity_id) ||
        meaningKind(assertion.predicate) === undefined
      ) {
        continue;
      }
      if (
        assertions.length >= request.limits.maximum_relationships ||
        assertions.length >= request.limits.maximum_paths ||
        assertions.length >= request.limits.maximum_nodes - 1
      ) {
        capped = true;
        continue;
      }
      assertions.push(assertion);
    }
    const claims = new Map<string, PetraClaim>([
      [focusClaim.claim_id, focusClaim],
    ]);
    for (const assertion of assertions) {
      for (const id of [
        assertion.subject_id,
        this.#assertionEntityId(assertion),
      ]) {
        if (claims.has(id)) continue;
        claims.set(
          id,
          await this.#historicalEvidence<PetraClaim>(
            client,
            id,
            activeNodes.get(id)!,
            "claim",
            "claim",
          ),
        );
      }
    }
    const nodeKey = (id: string): string => `node:${id.toLowerCase()}`;
    const relationshipKey = (id: string): string =>
      `relationship:${id.toLowerCase()}`;
    const returnTarget =
      request.return_destination.state === "available"
        ? request.return_destination.target_ref
        : undefined;
    const exactClaims = new Map<string, FocusedGraphExactRef>();
    for (const claim of claims.values()) {
      exactClaims.set(claim.claim_id, {
        record_id: claim.claim_id,
        revision: claim.revision,
        record_hash: canonicalHash(claim),
      });
    }
    const exactAssertions = new Map<string, FocusedGraphExactRef>();
    for (const assertion of assertions) {
      exactAssertions.set(assertion.assertion_id, {
        record_id: assertion.assertion_id,
        revision: assertion.revision,
        record_hash: canonicalHash(assertion),
      });
    }
    const representedRefs = [
      ...exactClaims.values(),
      ...exactAssertions.values(),
    ];
    if (
      returnTarget !== undefined &&
      !representedRefs.some((ref) => sameExactRef(ref, returnTarget))
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_QUERY_INVALID",
        "The available return destination is outside this retained historical result.",
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
        "The exact origin is outside this retained historical result.",
      );
    }
    const requestedSourceSpanIds = unique([
      ...[...claims.values()].flatMap(sourceSpanIdsForClaim),
      ...assertions.flatMap(sourceSpanIdsForAssertion),
    ]);
    const representedSourceSpanIds = requestedSourceSpanIds.slice(
      0,
      MAX_SOURCE_LOCATIONS,
    );
    const sourceLocations = await this.#sourceLocations(
      client,
      projectId,
      representedSourceSpanIds,
    );
    const destinations = new Map<string, FocusedGraphSemanticDestination>();
    const sourceFacts = (
      memberKey: string,
      sourceSpanIds: readonly string[],
    ): {
      refs: FocusedGraphExactRef[];
      destinationKeys: string[];
      limitations: string[];
    } => {
      const refs: FocusedGraphExactRef[] = [];
      const destinationKeys: string[] = [];
      const unavailable: string[] = [];
      for (const sourceSpanId of unique(sourceSpanIds)) {
        const location = sourceLocations.get(sourceSpanId);
        if (location === undefined || !location.projectScoped) {
          unavailable.push(sourceSpanId);
          continue;
        }
        refs.push(location.ref);
        const destinationKey = `destination:source:${sourceSpanId.toLowerCase()}`;
        destinations.set(destinationKey, {
          destination_key: destinationKey,
          destination_kind: "source_inspection",
          state: "available",
          owner: "project_object_location_view",
          label: "Inspect exact source location",
          target_ref: location.ref,
        });
        destinationKeys.push(destinationKey);
      }
      const limitations = [
        ...(sourceSpanIds.length === 0
          ? ["No direct SourceSpan is recorded for this historical member."]
          : []),
        ...(unavailable.length > 0
          ? [
              `${unavailable.length} recorded SourceSpan ${unavailable.length === 1 ? "destination is" : "destinations are"} unavailable under current Project-scoped source access.`,
            ]
          : []),
      ];
      if (limitations.length > 0) {
        const key = `destination:source-unavailable:${memberKey}`;
        destinations.set(key, {
          destination_key: key,
          destination_kind: "source_inspection",
          state: "unavailable",
          owner: "project_object_location_view",
          label: "Source location unavailable",
          reason: limitations.join(" "),
        });
        destinationKeys.push(key);
      }
      return { refs, destinationKeys, limitations };
    };
    const nodes: FocusedGraphNode[] = [...claims.values()]
      .sort((left, right) =>
        left.claim_id === focusClaim.claim_id
          ? -1
          : right.claim_id === focusClaim.claim_id
            ? 1
            : left.claim_id.localeCompare(right.claim_id),
      )
      .map((claim) => {
        const ref = exactClaims.get(claim.claim_id)!;
        const key = nodeKey(claim.claim_id);
        const sources = sourceFacts(key, sourceSpanIdsForClaim(claim));
        return {
          node_key: key,
          record_ref: ref,
          semantic_key: semantics.object.semantic_key,
          term: semantics.object.term,
          label: claim.canonical_text,
          summary: `Retained historical ${semantics.object.term.singular} revision ${claim.revision} at Project stream revision ${event.stream_revision}.`,
          layer: "historical",
          authority_position: "historical_authority",
          lifecycle:
            claim.authority.zone === "trusted" ? "represented" : "superseded",
          basis: {
            summary: `Exact PostgreSQL record with ${claim.basis.basis_kind} basis and recorded authority ${claim.authority.zone}/${claim.authority.review_state}.`,
            record_refs: uniqueRefs([ref, ...sources.refs]),
            limitations: sources.limitations,
          },
          destination_keys: [
            ...sources.destinationKeys,
            returnTarget !== undefined && sameExactRef(returnTarget, ref)
              ? request.return_destination.destination_key
              : undefined,
          ].filter((key): key is string => key !== undefined),
        };
      });
    const relationships: FocusedGraphRelationship[] = assertions.map(
      (assertion) => {
        const ref = exactAssertions.get(assertion.assertion_id)!;
        const key = relationshipKey(assertion.assertion_id);
        const sources = sourceFacts(key, sourceSpanIdsForAssertion(assertion));
        return {
          relationship_key: key,
          relationship_ref: {
            element_id: assertion.assertion_id,
            revision: assertion.revision,
            record_hash: ref.record_hash,
          },
          semantic_key: semantics.relationship.semantic_key,
          term: semantics.relationship.term,
          predicate: assertion.predicate,
          meaning_kind: meaningKind(assertion.predicate)!,
          source_node_key: nodeKey(assertion.subject_id),
          target_node_key: nodeKey(this.#assertionEntityId(assertion)),
          direction: "outgoing",
          origin:
            assertion.assertion_kind === "model_inference"
              ? "model_inference"
              : "historical_record",
          layer: "historical",
          authority_position: "historical_authority",
          summary: assertion.rationale,
          basis: {
            summary: `Exact retained Assertion revision ${assertion.revision}; predicate ${assertion.predicate}; authority ${assertion.authority.zone}/${assertion.authority.review_state}.`,
            record_refs: uniqueRefs([ref, ...sources.refs]),
            limitations: sources.limitations,
          },
          destination_keys: [
            ...sources.destinationKeys,
            returnTarget !== undefined && sameExactRef(returnTarget, ref)
              ? request.return_destination.destination_key
              : undefined,
          ].filter((key): key is string => key !== undefined),
        };
      },
    );
    const paths: FocusedGraphPath[] = relationships.map((relationship) => ({
      path_key: `path:${relationship.relationship_ref.element_id.toLowerCase()}`,
      state: "complete",
      ordering_rationale:
        "One exact retained relationship is the complete path within this historical one-hop result.",
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
      limitations: structuredClone(relationship.basis.limitations),
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
    const currentHead = await this.#observedHead(client, projectId);
    const pendingRecords = retainedCheckpoint.content.freshness.pending_records;
    const historicalOmissions: FocusedGraphOmission[] = [];
    if (
      capped ||
      requestedSourceSpanIds.length > representedSourceSpanIds.length
    ) {
      historicalOmissions.push({
        omission_kind: "capped",
        description:
          "Additional retained one-hop membership or source locations may exist beyond the finite result bounds.",
        count: { state: "unknown" },
      });
    }
    historicalOmissions.push({
      omission_kind: "out_of_scope",
      description:
        "Current authority, Working changes, comparison, expansion, and non-recorded temporal dimensions are outside this Historical result.",
      count: { state: "unknown" },
    });
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
      semantic_layer: "historical",
      temporal_position: request.temporal_position,
      projection_position: {
        authority_source: "postgresql",
        projection_source: "neo4j_rebuildable_projection",
        state: "unavailable",
        represented_event_position: Number(event.event_position),
        observed_event_position:
          currentHead?.eventPosition ?? Number(event.event_position),
        pending_records: pendingRecords,
        detail:
          "This exact retained Historical result is reconstructed from PostgreSQL records and retained projection membership. The current Neo4j projection is not presented as the selected historical position.",
      },
      scope: {
        description:
          "One exact retained Historical Claim neighborhood at the selected recorded-time Project snapshot.",
        included_relationship_semantics: [semantics.relationship.semantic_key],
        directions: ["outgoing", "incoming"],
        included_layers: ["historical"],
        limits: structuredClone(request.limits),
        coverage:
          capped ||
          requestedSourceSpanIds.length > representedSourceSpanIds.length
            ? "capped"
            : "complete_for_scope",
        omissions: historicalOmissions as [
          FocusedGraphOmission,
          ...FocusedGraphOmission[],
        ],
      },
      nodes,
      relationships,
      paths,
      selection: {
        state: "selected",
        selection_kind: "node",
        selected_keys: [nodeKey(focusClaim.claim_id)],
      },
      destinations: [
        structuredClone(request.return_destination),
        ...[...destinations.values()].filter(
          (destination) =>
            destination.destination_key !==
            request.return_destination.destination_key,
        ),
      ],
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
        "Historical mode is read-only; correction and Work preparation require an explicit return to Current and fresh authority resolution.",
        "PostgreSQL supplies exact retained records; the rebuildable current Neo4j projection is not treated as Historical authority.",
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
        throw this.#error("FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED", error.message);
      }
      throw error;
    }
  }

  async #historicalEvidence<RecordType>(
    client: PoolClient,
    id: string,
    revision: number,
    evidenceKind: "claim" | "assertion",
    contractName: "claim" | "assertion",
  ): Promise<RecordType> {
    const result = await client.query<
      PayloadHashRow & { evidence_kind: string }
    >(
      `SELECT evidence_kind, payload, record_hash
         FROM petra.evidence_entity_revisions
        WHERE evidence_id = $1
          AND revision = $2`,
      [id, revision],
    );
    const row = result.rows[0];
    if (row === undefined || row.evidence_kind !== evidenceKind) {
      throw this.#corrupt(
        "A retained historical graph member does not resolve to its exact canonical evidence revision.",
      );
    }
    return this.#storedRecord<RecordType>(
      contractName,
      row.payload,
      row.record_hash,
    );
  }

  #assertionEntityId(assertion: PetraAssertion): string {
    if (assertion.object.object_kind !== "entity") {
      throw this.#corrupt(
        "A retained focused relationship no longer has an exact entity endpoint.",
      );
    }
    return assertion.object.entity_id;
  }

  #workingSourceSpanIds(
    record: PetraWorkingCandidate | PetraWorkingRelationship,
  ): string[] {
    return unique(
      [...record.basis, ...record.provenance]
        .map((item) => item.record_ref)
        .filter((ref) => ref.schema_name === "petra.source-span")
        .map((ref) => ref.record_id),
    );
  }

  async #workingSelections(
    client: PoolClient,
    projectId: string,
    definition: PetraProjectDefinition,
    semantics: ResolvedFocusedGraphSemantics,
    currentRefs: ReadonlyMap<string, FocusedGraphExactRef>,
    remaining: {
      readonly nodes: number;
      readonly relationships: number;
      readonly paths: number;
    },
  ): Promise<{
    selections: WorkingSelection[];
    capped: boolean;
    hidden: number;
  }> {
    const rows = await client.query<WorkingRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.working_relationships AS head
         JOIN petra.working_relationship_revisions AS revision
           ON revision.working_relationship_id = head.working_relationship_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
        ORDER BY revision.recorded_at, revision.working_relationship_id
        LIMIT 1001`,
      [projectId],
    );
    let hidden = 0;
    const selections: WorkingSelection[] = [];
    const candidateKeys = new Set<string>();
    let capped = rows.rows.length > 1000;
    for (const row of rows.rows.slice(0, 1000)) {
      const relationship = this.#storedRecord<PetraWorkingRelationship>(
        "working-relationship",
        row.payload,
        row.record_hash,
      );
      if (
        relationship.project_id !== projectId ||
        relationship.profile_relationship.registration.semantic_key !==
          semantics.relationship.semantic_key
      ) {
        continue;
      }
      const endpoints = [
        relationship.endpoints.subject,
        relationship.endpoints.object,
      ] as const;
      const profileIndex = endpoints.findIndex(
        (endpoint) => endpoint.endpoint_kind === "profile_record",
      );
      const candidateIndex = endpoints.findIndex(
        (endpoint) => endpoint.endpoint_kind === "working_candidate",
      );
      if (
        profileIndex < 0 ||
        candidateIndex < 0 ||
        profileIndex === candidateIndex
      )
        continue;
      const profileEndpoint = endpoints[profileIndex]!;
      const candidateEndpoint = endpoints[candidateIndex]!;
      if (
        profileEndpoint.endpoint_kind !== "profile_record" ||
        candidateEndpoint.endpoint_kind !== "working_candidate"
      ) {
        continue;
      }
      const currentRef = currentRefs.get(profileEndpoint.record_ref.record_id);
      if (currentRef === undefined) continue;
      if (!sameExactRef(currentRef, profileEndpoint.record_ref)) {
        hidden += 1;
        continue;
      }
      if (
        relationship.disposition !== "available" ||
        relationship.project_definition_ref.project_definition_id !==
          definition.project_definition_id ||
        relationship.project_definition_ref.revision !== definition.revision ||
        relationship.project_definition_ref.content_hash !==
          definition.content_hash ||
        relationship.project_definition_ref.definition_family !==
          definition.definition_family ||
        relationship.profile_relationship.registration.registration_kind !==
          "relationship_schema" ||
        canonicalize(
          relationship.profile_relationship.registration.contract,
        ) !== canonicalize(semantics.relationship.contract)
      ) {
        hidden += 1;
        continue;
      }
      this.#assertWorkingContentHash(relationship);
      const candidateRow = await client.query<WorkingRow>(
        `SELECT payload, record_hash
           FROM petra.working_candidate_revisions
          WHERE project_id = $1
            AND working_candidate_id = $2
            AND revision = $3
            AND content_hash = $4`,
        [
          projectId,
          candidateEndpoint.candidate_ref.working_candidate_id,
          candidateEndpoint.candidate_ref.revision,
          candidateEndpoint.candidate_ref.content_hash,
        ],
      );
      const exactCandidate = candidateRow.rows[0];
      if (exactCandidate === undefined) {
        throw this.#corrupt(
          "A relevant WorkingRelationship references an unavailable exact WorkingCandidate revision.",
        );
      }
      const candidate = this.#storedRecord<PetraWorkingCandidate>(
        "working-candidate",
        exactCandidate.payload,
        exactCandidate.record_hash,
      );
      this.#assertWorkingContentHash(candidate);
      if (
        candidate.project_id !== projectId ||
        candidate.disposition !== "available" ||
        candidate.project_definition_ref.project_definition_id !==
          definition.project_definition_id ||
        candidate.project_definition_ref.revision !== definition.revision ||
        candidate.project_definition_ref.content_hash !==
          definition.content_hash ||
        candidate.project_definition_ref.definition_family !==
          definition.definition_family ||
        candidate.profile_object.registration.registration_kind !==
          "object_schema" ||
        candidate.profile_object.registration.semantic_key !==
          semantics.object.semantic_key ||
        canonicalize(candidate.profile_object.registration.contract) !==
          canonicalize(semantics.object.contract)
      ) {
        throw this.#corrupt(
          "A relevant working endpoint is not bound to the exact current profile semantics.",
        );
      }
      const claim = await this.#evidenceRevision<PetraClaim>(
        client,
        candidate.profile_object.object_record_ref,
        "claim",
        "claim",
      );
      const assertion = await this.#evidenceRevision<PetraAssertion>(
        client,
        relationship.profile_relationship.relationship_record_ref,
        "assertion",
        "assertion",
      );
      if (
        claim.claim_id !==
          candidate.profile_object.object_record_ref.record_id ||
        claim.revision !==
          candidate.profile_object.object_record_ref.revision ||
        candidate.validation.target_record_hash !==
          candidate.profile_object.object_record_ref.record_hash ||
        assertion.assertion_id !==
          relationship.profile_relationship.relationship_record_ref.record_id ||
        assertion.revision !==
          relationship.profile_relationship.relationship_record_ref.revision ||
        assertion.predicate !== relationship.profile_relationship.predicate ||
        relationship.validation.target_record_hash !==
          relationship.profile_relationship.relationship_record_ref
            .record_hash ||
        assertion.object.object_kind !== "entity" ||
        (profileIndex === 0 &&
          (assertion.subject_id !== currentRef.record_id ||
            assertion.object.entity_id !== claim.claim_id)) ||
        (profileIndex === 1 &&
          (assertion.subject_id !== claim.claim_id ||
            assertion.object.entity_id !== currentRef.record_id))
      ) {
        throw this.#corrupt(
          "A relevant WorkingRelationship does not preserve its exact profile relationship and endpoints.",
        );
      }
      const candidateKey = `${candidate.working_candidate_id}:${candidate.revision}:${exactCandidate.record_hash}`;
      const additionalNode = candidateKeys.has(candidateKey) ? 0 : 1;
      if (
        selections.length >= remaining.relationships ||
        selections.length >= remaining.paths ||
        candidateKeys.size + additionalNode > remaining.nodes
      ) {
        capped = true;
        hidden += 1;
        continue;
      }
      candidateKeys.add(candidateKey);
      selections.push({
        relationship,
        relationshipHash: row.record_hash,
        assertion,
        candidate,
        candidateHash: exactCandidate.record_hash,
        claim,
        currentNodeId: currentRef.record_id,
        currentIsSubject: profileIndex === 0,
      });
    }
    return { selections, capped, hidden };
  }

  #assertWorkingContentHash(
    record: PetraWorkingCandidate | PetraWorkingRelationship,
  ): void {
    const projection = structuredClone(record) as Record<string, unknown>;
    delete projection.content_hash;
    if (record.content_hash !== canonicalHash(projection)) {
      throw this.#corrupt(
        "A relevant durable working record does not reproduce its content hash.",
      );
    }
  }

  async #evidenceRevision<RecordType>(
    client: PoolClient,
    ref: FocusedGraphExactRef,
    evidenceKind: "claim" | "assertion",
    contractName: "claim" | "assertion",
  ): Promise<RecordType> {
    const result = await client.query<
      PayloadHashRow & { evidence_kind: string }
    >(
      `SELECT evidence_kind, payload, record_hash
         FROM petra.evidence_entity_revisions
        WHERE evidence_id = $1
          AND revision = $2
          AND record_hash = $3`,
      [ref.record_id, ref.revision, ref.record_hash],
    );
    const row = result.rows[0];
    if (row === undefined || row.evidence_kind !== evidenceKind) {
      throw this.#corrupt(
        "A focused graph exact evidence reference does not resolve within its recorded kind.",
      );
    }
    return this.#storedRecord<RecordType>(
      contractName,
      row.payload,
      row.record_hash,
    );
  }

  async #oneHopSelections(
    client: PoolClient,
    projectId: string,
    focusGraph: AuthorityGraphObjectView,
    focusClaim: PetraClaim,
    request: FocusedGraphViewRequest,
    checkpoint: PetraProjectionCheckpoint,
  ): Promise<CurrentTraversalResult> {
    const edgeBudget = Math.min(
      request.limits.maximum_relationships,
      request.limits.maximum_paths,
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
    const selected: CurrentSelection[] = [];
    let capped = false;
    for (const graphRelationship of candidates) {
      if (
        selected.length >= request.limits.maximum_relationships ||
        selected.length >= request.limits.maximum_paths
      ) {
        capped = true;
        break;
      }
      const assertion = await this.#relationship(
        client,
        projectId,
        graphRelationship,
        checkpoint,
      );
      const sourceId = graphRelationship.sourceId;
      const targetId = graphRelationship.targetId;
      if (sourceId === undefined || targetId === undefined) {
        throw this.#projectionIncoherent(
          "A projected scientific relationship has no exact endpoints.",
        );
      }
      const endpointIds = [sourceId, targetId];
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
      selected.push({
        graph: graphRelationship,
        assertion,
        traversal: [
          {
            relationshipId: graphRelationship.id,
            fromId: sourceId,
            toId: targetId,
            traversalDirection: "outgoing",
            repeatedMember: sourceId === targetId,
          },
        ],
      });
    }
    if (candidates.length > selected.length) capped = true;
    return {
      claims,
      graphClaims,
      selected,
      capped,
      filtered: 0,
      unknownMembership: candidates.length === candidateLimit,
    };
  }

  async #expandedSelections(
    client: PoolClient,
    projectId: string,
    focusGraph: AuthorityGraphObjectView,
    focusClaim: PetraClaim,
    request: FocusedGraphExplorationViewRequest,
    checkpoint: PetraProjectionCheckpoint,
  ): Promise<CurrentTraversalResult> {
    const recipe = EXPANSION_RECIPES.get(
      request.exploration.recipe_semantic_key,
    );
    if (
      recipe === undefined ||
      request.exploration.filters.meaning_kinds.some(
        (meaning) => !recipe.meaningKinds.has(meaning),
      ) ||
      request.exploration.filters.directions.some(
        (direction) => !recipe.directions.has(direction),
      )
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
        "The named expansion recipe or its filters are not registered for this focused query owner.",
      );
    }

    const targetGraph = sameExactRef(
      request.exploration.target_ref,
      request.focus_ref,
    )
      ? focusGraph
      : await this.#graph.getObject(
          projectId,
          request.exploration.target_ref.record_id,
        );
    if (
      targetGraph === undefined ||
      targetGraph.elementKind !== "node" ||
      targetGraph.kind !== "Claim"
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_FOCUS_NOT_FOUND",
        "The exact named-expansion target is not represented as a Claim in this Project projection.",
      );
    }
    this.#assertProjectedAt(targetGraph, checkpoint);
    if (
      targetGraph.authoritativeRevision !==
        request.exploration.target_ref.revision ||
      targetGraph.recordHash !== request.exploration.target_ref.record_hash
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_SNAPSHOT_STALE",
        "The named-expansion target no longer matches its requested exact revision.",
      );
    }
    const targetClaim = sameExactRef(
      request.exploration.target_ref,
      request.focus_ref,
    )
      ? focusClaim
      : await this.#claim(client, targetGraph);
    const claims = new Map<string, PetraClaim>([
      [focusClaim.claim_id, focusClaim],
      [targetClaim.claim_id, targetClaim],
    ]);
    const graphClaims = new Map<string, AuthorityGraphObjectView>([
      [focusGraph.id, focusGraph],
      [targetGraph.id, targetGraph],
    ]);
    if (claims.size > request.limits.maximum_nodes) {
      throw this.#error(
        "FOCUSED_GRAPH_QUERY_INVALID",
        "The finite node limit cannot preserve both the exact question focus and named-expansion target.",
      );
    }

    const selected: CurrentSelection[] = [];
    const selectedIds = new Set<string>();
    const examinedTraversals = new Set<string>();
    const filteredIds = new Set<string>();
    const queuedDepth = new Map<string, number>([[targetGraph.id, 0]]);
    const queue: Array<{
      nodeId: string;
      traversal: readonly TraversalStep[];
    }> = [{ nodeId: targetGraph.id, traversal: [] }];
    let capped = false;
    let unknownMembership = false;

    traversal: while (queue.length > 0) {
      const branch = queue.shift();
      if (branch === undefined) break;
      if (branch.traversal.length >= request.exploration.maximum_depth)
        continue;
      const candidates = await this.#graph.getEvidenceRelations(
        projectId,
        branch.nodeId,
        100,
      );
      if (candidates.length === 100) unknownMembership = true;
      for (const graphRelationship of candidates) {
        if (selectedIds.has(graphRelationship.id)) continue;
        if (
          selected.length >= request.limits.maximum_relationships ||
          selected.length >= request.limits.maximum_paths
        ) {
          capped = true;
          break traversal;
        }
        const sourceId = graphRelationship.sourceId;
        const targetId = graphRelationship.targetId;
        if (sourceId === undefined || targetId === undefined) {
          throw this.#projectionIncoherent(
            "A projected expansion relationship has no exact endpoints.",
          );
        }
        const traversalDirection =
          sourceId === branch.nodeId
            ? ("outgoing" as const)
            : targetId === branch.nodeId
              ? ("incoming" as const)
              : undefined;
        if (traversalDirection === undefined) {
          throw this.#projectionIncoherent(
            "Neo4j returned a relationship outside the requested expansion branch.",
          );
        }
        const traversalKey = `${graphRelationship.id}:${branch.nodeId}`;
        if (examinedTraversals.has(traversalKey)) continue;
        examinedTraversals.add(traversalKey);
        const assertion = await this.#relationship(
          client,
          projectId,
          graphRelationship,
          checkpoint,
        );
        const meaning = meaningKind(assertion.predicate);
        if (meaning === undefined) {
          throw this.#error(
            "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED",
            `The registered focused query does not map predicate ${assertion.predicate} to a renderer-neutral relationship meaning.`,
          );
        }
        const origin = assertionOrigin(assertion);
        if (
          !recipe.meaningKinds.has(meaning) ||
          !recipe.directions.has(traversalDirection) ||
          !request.exploration.filters.meaning_kinds.includes(meaning) ||
          !request.exploration.filters.directions.includes(
            traversalDirection,
          ) ||
          !request.exploration.filters.origins.includes(origin)
        ) {
          filteredIds.add(graphRelationship.id);
          continue;
        }

        const otherId = traversalDirection === "outgoing" ? targetId : sourceId;
        const represented = graphClaims.has(otherId);
        const repeatedMember = represented;
        if (!represented) {
          if (claims.size >= request.limits.maximum_nodes) {
            capped = true;
            break traversal;
          }
          const graphNode = await this.#graph.getObject(projectId, otherId);
          if (
            graphNode === undefined ||
            graphNode.elementKind !== "node" ||
            graphNode.kind !== "Claim"
          ) {
            throw this.#projectionIncoherent(
              "A projected named-expansion relationship has an unavailable or incompatible Claim endpoint.",
            );
          }
          this.#assertProjectedAt(graphNode, checkpoint);
          graphClaims.set(otherId, graphNode);
          claims.set(otherId, await this.#claim(client, graphNode));
        }
        const step: TraversalStep = {
          relationshipId: graphRelationship.id,
          fromId: branch.nodeId,
          toId: otherId,
          traversalDirection,
          repeatedMember,
        };
        const path = [...branch.traversal, step];
        selected.push({
          graph: graphRelationship,
          assertion,
          traversal: path,
        });
        selectedIds.add(graphRelationship.id);
        filteredIds.delete(graphRelationship.id);
        if (
          !repeatedMember &&
          path.length < request.exploration.maximum_depth &&
          (queuedDepth.get(otherId) ?? Number.POSITIVE_INFINITY) > path.length
        ) {
          queuedDepth.set(otherId, path.length);
          queue.push({ nodeId: otherId, traversal: path });
        }
      }
    }

    return {
      claims,
      graphClaims,
      selected,
      capped,
      filtered: filteredIds.size,
      unknownMembership,
    };
  }

  #resolveSemantics(
    definition: PetraProjectDefinition,
    request: FocusedGraphReadRequest,
  ): ResolvedFocusedGraphSemantics {
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
    const expansion = isExplorationRequest(request)
      ? exact(request.exploration.recipe_semantic_key, "action")
      : undefined;
    if (
      task.registration_kind !== "objective_schema" ||
      object.registration_kind !== "object_schema" ||
      object.contract.name !== "petra.claim" ||
      relationship.registration_kind !== "relationship_schema" ||
      relationship.contract.name !== "petra.assertion" ||
      action.registration_kind !== "extension" ||
      (expansion !== undefined &&
        expansion.registration_kind !== "extension") ||
      focusedGraph.contract.name !== "petra.focused-graph-view" ||
      focusedGraph.contract.version !== "1.0.0" ||
      (expansion !== undefined &&
        (expansion.contract.name !== "petra.focused-graph-view" ||
          expansion.contract.version !== "1.1.0")) ||
      EXPANSION_RECIPES.has(expansion?.semantic_key ?? "") !==
        (expansion !== undefined)
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
      ...(expansion === undefined ? {} : { expansion }),
    };
  }

  #resolve<View extends PetraFocusedGraphReadView>(
    definition: PetraProjectDefinition,
    view: View,
  ): View {
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
        throw this.#error("FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED", error.message);
      }
      throw error;
    }
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

  #selectionUnavailable(key: string): never {
    throw this.#error(
      "FOCUSED_GRAPH_QUERY_INVALID",
      `Selected graph member ${key} is outside the exact bounded result.`,
    );
  }

  #locationSemanticKey(recordId: string, fallback: string): string {
    if (recordId.startsWith("claim_")) {
      return "scientific.claim";
    }
    if (recordId.startsWith("assertion_")) {
      return "scientific.assertion";
    }
    if (recordId.startsWith("working_candidate_")) {
      return "petra.working-candidate";
    }
    if (recordId.startsWith("working_relationship_")) {
      return "petra.working-relationship";
    }
    return fallback;
  }

  #assertLocationIdentity(
    location: FocusedGraphDetailsContent["nodes"][number]["semantic_location"],
    expected: FocusedGraphExactRef,
  ): void {
    if ("failure" in location.resolution) {
      return;
    }
    const resolved = location.resolution.resolved_ref;
    if (
      resolved.object_id !== expected.record_id ||
      resolved.revision !== expected.revision ||
      resolved.record_hash !== expected.record_hash
    ) {
      throw this.#corrupt(
        "A selected graph member resolved to a substituted semantic location.",
      );
    }
  }

  #assertLocationDefinition(
    location: FocusedGraphDetailsContent["nodes"][number]["semantic_location"],
    expected: FocusedGraphDetailsContent["graph"]["profile"]["project_definition_ref"],
  ): void {
    if (
      location.definition_ref.project_definition_id !==
        expected.project_definition_id ||
      location.definition_ref.revision !== expected.revision ||
      location.definition_ref.content_hash !== expected.content_hash ||
      location.definition_ref.definition_family !== expected.definition_family
    ) {
      throw this.#error(
        "FOCUSED_GRAPH_DEFINITION_STALE",
        "The semantic-location owner no longer represents the focused graph's exact ProjectDefinition.",
      );
    }
  }

  async #sourceInspections(
    client: PoolClient,
    readAt: string,
    projectId: string,
    basisRefs: readonly FocusedGraphExactRef[],
    expectedDefinition: FocusedGraphDetailsContent["graph"]["profile"]["project_definition_ref"],
  ): Promise<FocusedGraphSourceInspection[]> {
    const sourceSpanRefs = uniqueRefs(
      basisRefs.filter((ref) => ref.record_id.startsWith("source_span_")),
    );
    const inspections: FocusedGraphSourceInspection[] = [];
    for (const sourceSpanRef of sourceSpanRefs) {
      const bindings = await client.query<SourceBindingRow>(
        `SELECT DISTINCT source.project_source_id
           FROM petra.source_spans AS span
           JOIN petra.parsed_documents AS document
             ON document.parsed_document_id = span.parsed_document_id
           JOIN petra.project_source_revisions AS binding
             ON binding.artifact_manifest_id =
                  document.source_artifact_manifest_id
           JOIN petra.project_sources AS source
             ON source.project_source_id = binding.project_source_id
            AND source.current_revision = binding.revision
          WHERE source.project_id = $1
            AND span.source_span_id = $2
            AND span.revision = $3
            AND span.record_hash = $4
          ORDER BY source.project_source_id`,
        [
          projectId,
          sourceSpanRef.record_id,
          sourceSpanRef.revision,
          sourceSpanRef.record_hash,
        ],
      );
      if (bindings.rows.length === 0) {
        inspections.push({
          state: "unavailable",
          owner: "project_source_view",
          source_span_ref: structuredClone(sourceSpanRef),
          reason:
            "The exact SourceSpan has no current Project-scoped ProjectSource inspection destination.",
        });
        continue;
      }
      for (const binding of bindings.rows) {
        const source = await this.#sourceViews.readSourceInSnapshot(
          client,
          readAt,
          projectId,
          binding.project_source_id,
          sourceSpanRef.record_id,
        );
        if (source === undefined) {
          throw this.#corrupt(
            "A SourceSpan Project binding lost its exact ProjectSource owner.",
          );
        }
        const sourceDefinition = source.content.binding.project_definition_ref;
        if (
          sourceDefinition.record_id !==
            expectedDefinition.project_definition_id ||
          sourceDefinition.revision !== expectedDefinition.revision ||
          sourceDefinition.content_hash !== expectedDefinition.content_hash
        ) {
          inspections.push({
            state: "unavailable",
            owner: "project_source_view",
            source_span_ref: structuredClone(sourceSpanRef),
            project_source_id: source.project_source_id,
            reason:
              "The exact SourceSpan is bound to a current ProjectSource under a different ProjectDefinition.",
          });
          continue;
        }
        const preview = source.content.representation.preview;
        if (
          preview === undefined ||
          preview.span_ref.record_id !== sourceSpanRef.record_id ||
          preview.span_ref.revision !== sourceSpanRef.revision ||
          preview.span_ref.content_hash !== sourceSpanRef.record_hash
        ) {
          inspections.push({
            state: "unavailable",
            owner: "project_source_view",
            source_span_ref: structuredClone(sourceSpanRef),
            project_source_id: source.project_source_id,
            reason:
              source.content.representation.extent === "restricted"
                ? "The exact ProjectSource is bound, but its rights do not permit SourceSpan inspection."
                : "The exact ProjectSource is bound, but no inspectable representation reproduces this SourceSpan.",
          });
          continue;
        }
        inspections.push({
          state: "available",
          owner: "project_source_view",
          source_span_ref: structuredClone(sourceSpanRef),
          project_source_id: source.project_source_id,
          binding_revision: source.content.binding.revision,
          binding_content_hash: source.content.binding.content_hash,
          source_view_content_hash: source.content_hash,
          source_view: structuredClone(source.content),
        });
      }
    }
    return inspections;
  }

  async #sourceLocations(
    client: PoolClient,
    projectId: string,
    sourceSpanIds: readonly string[],
  ): Promise<ReadonlyMap<string, SourceLocation>> {
    const result = new Map<string, SourceLocation>();
    for (const sourceSpanId of sourceSpanIds) {
      const query = await client.query<SourceSpanRow>(
        `SELECT span.payload, span.record_hash,
                EXISTS (
                  SELECT 1
                    FROM petra.parsed_documents AS document
                    JOIN petra.project_source_revisions AS binding
                      ON binding.artifact_manifest_id =
                           document.source_artifact_manifest_id
                    JOIN petra.project_sources AS source
                      ON source.project_source_id = binding.project_source_id
                     AND source.current_revision = binding.revision
                   WHERE document.parsed_document_id = span.parsed_document_id
                     AND source.project_id = $1
                ) AS project_scoped
           FROM petra.source_spans AS span
          WHERE span.source_span_id = $2 AND span.revision = 1`,
        [projectId, sourceSpanId],
      );
      const row = query.rows[0];
      if (row === undefined || row.record_hash !== canonicalHash(row.payload)) {
        throw this.#corrupt(
          "A focused graph member refers to a missing or corrupt SourceSpan.",
        );
      }
      this.#contracts.assertValid("source-span", "1.0.0", row.payload);
      const span = structuredClone(row.payload) as PetraSourceSpan;
      if (span.source_span_id !== sourceSpanId || span.revision !== 1) {
        throw this.#corrupt(
          "A focused graph member refers to an incompatible SourceSpan revision.",
        );
      }
      result.set(sourceSpanId, {
        ref: {
          record_id: span.source_span_id,
          revision: span.revision,
          record_hash: row.record_hash,
        },
        span,
        projectScoped: row.project_scoped,
      });
    }
    return result;
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
