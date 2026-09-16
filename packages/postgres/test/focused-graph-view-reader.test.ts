import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraAssertion,
  PetraClaim,
  PetraProjectDefinition,
  PetraProjectionCheckpoint,
  PetraSourceSpan,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  derivePetraId,
  type AuthorityGraphObjectView,
  type AuthorityGraphStore,
  type FocusedGraphDetailsViewRequest,
  type FocusedGraphViewRequest,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, QueryResult } from "pg";
import { describe, expect, it, vi } from "vitest";

import { PostgresFocusedGraphViewReader } from "../src/focused-graph-view-reader.js";

const fixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const result = <Row extends Record<string, unknown>>(
  rows: Row[],
): QueryResult<Row> =>
  ({ rows, rowCount: rows.length }) as unknown as QueryResult<Row>;

const contracts = new PetraContractRegistry();
const contract = (name: string, version?: string) => {
  const entry = contracts.entries.find(
    (candidate) =>
      candidate.name === name &&
      (version === undefined || candidate.version === version),
  );
  if (entry === undefined) throw new Error(`Missing contract ${name}.`);
  return {
    name: `petra.${name}`,
    version: entry.version,
    content_hash: entry.canonical_sha256,
  };
};

const definition = (): PetraProjectDefinition => {
  const value = fixture<PetraProjectDefinition>(
    "project-definition-scientific",
  );
  value.content.registrations = [
    {
      registration_kind: "objective_schema",
      semantic_key: "scientific.research-question",
      contract: contract("project-objective"),
    },
    {
      registration_kind: "object_schema",
      semantic_key: "scientific.claim",
      contract: contract("claim"),
    },
    {
      registration_kind: "relationship_schema",
      semantic_key: "scientific.assertion",
      contract: contract("assertion"),
    },
    {
      registration_kind: "extension",
      semantic_key: "petra.focused-graph",
      contract: contract("focused-graph-view"),
    },
    {
      registration_kind: "extension",
      semantic_key: "scientific.graph.return",
      contract: contract("focused-graph-view"),
    },
  ];
  value.content.terms.push(
    {
      semantic_key: "scientific.assertion",
      singular: "Evidence relationship",
      plural: "Evidence relationships",
      definition: "A registered scientific relationship with exact basis.",
      generic_family: "relationship",
    },
    {
      semantic_key: "scientific.graph.return",
      singular: "Return to evidence",
      plural: "Return to evidence",
      definition: "Return to the exact originating evidence object.",
      generic_family: "task",
    },
  );
  value.content_hash = hash(value.content);
  return value;
};

const trustedClaim = (id: string, label: string): PetraClaim => {
  const value = fixture<PetraClaim>("claim");
  value.claim_id = id;
  value.canonical_text = label;
  value.authority = structuredClone(
    fixture<PetraAssertion>("assertion-trusted").authority,
  );
  return value;
};

const graphNode = (claim: PetraClaim): AuthorityGraphObjectView => ({
  elementKind: "node",
  id: claim.claim_id,
  kind: "Claim",
  authoritativeRevision: claim.revision,
  recordHash: hash(claim),
  properties: { target_sequence: 1, stream_revision: 3, event_position: 3 },
});

describe("PostgreSQL focused graph query reader", () => {
  it("binds exact definition, snapshots, limits, canonical records, and the guarded Neo4j neighborhood", async () => {
    const projectDefinition = definition();
    const focus = trustedClaim(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
      "Focused claim",
    );
    const related = trustedClaim(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FD2",
      "Related claim",
    );
    related.basis = {
      basis_kind: "researcher",
      rationale:
        "The researcher recorded this related Claim without a direct SourceSpan.",
      proposed_by: structuredClone(related.created_by),
      proposed_at: related.created_at,
    };
    const predicates = [
      "CITES",
      "SUPPORTS",
      "CONTRADICTS",
      "QUALIFIES",
      "ADOPTS",
    ] as const;
    const assertions = predicates.map((predicate, index) => {
      const assertion = fixture<PetraAssertion>("assertion-trusted");
      assertion.assertion_id = `assertion_01ARZ3NDEKTSV4RRFFQ69G5FD${index + 3}`;
      assertion.subject_id = focus.claim_id;
      assertion.predicate = predicate;
      assertion.object = {
        object_kind: "entity",
        entity_id: related.claim_id,
      };
      assertion.assertion_kind =
        predicate === "ADOPTS" ? "model_inference" : "source_stated";
      assertion.rationale = `The exact accepted Assertion records ${predicate}.`;
      return assertion;
    });
    const sourceSpan = fixture<PetraSourceSpan>("source-span");
    const workingClaim = trustedClaim(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FE8",
      "Working claim",
    );
    const workingAssertion = fixture<PetraAssertion>("assertion-trusted");
    workingAssertion.assertion_id = "assertion_01ARZ3NDEKTSV4RRFFQ69G5FE9";
    workingAssertion.subject_id = focus.claim_id;
    workingAssertion.predicate = "SUPPORTS";
    workingAssertion.object = {
      object_kind: "entity",
      entity_id: workingClaim.claim_id,
    };
    const workingCandidate =
      fixture<PetraWorkingCandidate>("working-candidate");
    workingCandidate.project_id = projectDefinition.project_id;
    workingCandidate.project_definition_ref = {
      project_definition_id: projectDefinition.project_definition_id,
      revision: projectDefinition.revision,
      content_hash: projectDefinition.content_hash,
      definition_family: projectDefinition.definition_family,
    };
    workingCandidate.profile_object.registration = {
      registration_kind: "object_schema",
      semantic_key: "scientific.claim",
      contract: contract("claim"),
    };
    workingCandidate.profile_object.object_record_ref = {
      schema_name: "petra.claim",
      schema_version: "1.0.0",
      record_id: workingClaim.claim_id,
      revision: workingClaim.revision,
      record_hash: hash(workingClaim),
    };
    workingCandidate.validation.target_record_hash = hash(workingClaim);
    const workingCandidateProjection = structuredClone(
      workingCandidate,
    ) as Record<string, unknown>;
    delete workingCandidateProjection.content_hash;
    workingCandidate.content_hash = hash(workingCandidateProjection);
    const workingRelationship = fixture<PetraWorkingRelationship>(
      "working-relationship",
    );
    workingRelationship.project_id = projectDefinition.project_id;
    workingRelationship.project_definition_ref = structuredClone(
      workingCandidate.project_definition_ref,
    );
    workingRelationship.profile_relationship.registration = {
      registration_kind: "relationship_schema",
      semantic_key: "scientific.assertion",
      contract: contract("assertion"),
    };
    workingRelationship.profile_relationship.predicate = "SUPPORTS";
    workingRelationship.profile_relationship.relationship_record_ref = {
      schema_name: "petra.assertion",
      schema_version: "1.0.0",
      record_id: workingAssertion.assertion_id,
      revision: workingAssertion.revision,
      record_hash: hash(workingAssertion),
    };
    workingRelationship.endpoints = {
      subject: {
        endpoint_kind: "profile_record",
        record_ref: {
          schema_name: "petra.claim",
          schema_version: "1.0.0",
          record_id: focus.claim_id,
          revision: focus.revision,
          record_hash: hash(focus),
        },
      },
      object: {
        endpoint_kind: "working_candidate",
        candidate_ref: {
          working_candidate_id: workingCandidate.working_candidate_id,
          revision: workingCandidate.revision,
          content_hash: workingCandidate.content_hash,
        },
      },
    };
    workingRelationship.validation.target_record_hash = hash(workingAssertion);
    const workingRelationshipProjection = structuredClone(
      workingRelationship,
    ) as Record<string, unknown>;
    delete workingRelationshipProjection.content_hash;
    workingRelationship.content_hash = hash(workingRelationshipProjection);
    const checkpoint = fixture<PetraProjectionCheckpoint>(
      "projection-checkpoint-current",
    );
    const focusNode = graphNode(focus);
    const relatedNode = graphNode(related);
    const relationships: AuthorityGraphObjectView[] = assertions.map(
      (assertion) => ({
        elementKind: "relationship",
        id: assertion.assertion_id,
        kind: assertion.predicate,
        authoritativeRevision: assertion.revision,
        recordHash: hash(assertion),
        projectId: projectDefinition.project_id,
        sourceId: focus.claim_id,
        targetId: related.claim_id,
        assertionId: assertion.assertion_id,
        relationClass: "scientific",
        properties: {
          target_sequence: 1,
          stream_revision: 3,
          event_position: 3,
        },
      }),
    );
    const evidence = new Map<string, PetraClaim | PetraAssertion>([
      [focus.claim_id, focus],
      [related.claim_id, related],
      ...assertions.map(
        (assertion) => [assertion.assertion_id, assertion] as const,
      ),
      [workingClaim.claim_id, workingClaim],
      [workingAssertion.assertion_id, workingAssertion],
    ]);
    const queries: string[] = [];
    const client = {
      query: async <Row extends Record<string, unknown>>(
        text: string,
        values: readonly unknown[] = [],
      ): Promise<QueryResult<Row>> => {
        await Promise.resolve();
        queries.push(text);
        if (
          text.startsWith("BEGIN") ||
          text === "COMMIT" ||
          text === "ROLLBACK"
        )
          return result([]);
        if (text.includes("transaction_timestamp()"))
          return result([
            { read_at: new Date("2026-09-15T20:00:00.000Z") } as unknown as Row,
          ]);
        if (text.includes("FROM petra.domain_events AS event"))
          return result([
            {
              event_position: "3",
              stream_revision: "3",
              recorded_at: new Date("2026-09-15T19:00:00.000Z"),
              target_sequence: "1",
            } as unknown as Row,
          ]);
        if (text.includes("project_definition_history_bindings"))
          return result([
            {
              project_id: projectDefinition.project_id,
              definition_payload: structuredClone(projectDefinition),
              definition_record_hash: hash(projectDefinition),
            } as unknown as Row,
          ]);
        if (text.includes("WITH ranked AS"))
          return result([
            {
              graph_element_kind: "node",
              object_id: focus.claim_id,
              object_revision: String(focus.revision),
              operation: "upsert",
            } as unknown as Row,
            {
              graph_element_kind: "node",
              object_id: related.claim_id,
              object_revision: String(related.revision),
              operation: "upsert",
            } as unknown as Row,
            ...assertions.map(
              (assertion) =>
                ({
                  graph_element_kind: "relationship",
                  object_id: assertion.assertion_id,
                  object_revision: String(assertion.revision),
                  operation: "upsert",
                }) as unknown as Row,
            ),
          ]);
        if (text.includes("FROM petra.projects AS project"))
          return values[0] === projectDefinition.project_id
            ? result([
                {
                  project_id: projectDefinition.project_id,
                  definition_payload: structuredClone(projectDefinition),
                  definition_record_hash: hash(projectDefinition),
                } as unknown as Row,
              ])
            : result([]);
        if (text.includes("FROM petra.projection_checkpoints AS head"))
          return result([
            {
              payload: structuredClone(checkpoint),
              record_hash: hash(checkpoint),
            } as unknown as Row,
          ]);
        if (text.includes("FROM petra.authority_positions AS authority"))
          return result([
            { event_position: "3", stream_revision: "3" } as unknown as Row,
          ]);
        if (text.includes("FROM petra.outbox_target_heads AS head"))
          return result([
            {
              target_sequence: "1",
              event_position: "3",
              stream_revision: "3",
            } as unknown as Row,
          ]);
        if (text.includes("SELECT DISTINCT source.project_source_id"))
          return result([]);
        if (text.includes("FROM petra.source_spans AS span"))
          return values[1] === sourceSpan.source_span_id
            ? result([
                {
                  payload: structuredClone(sourceSpan),
                  record_hash: hash(sourceSpan),
                  project_scoped: true,
                } as unknown as Row,
              ])
            : result([]);
        if (text.includes("FROM petra.working_relationships AS head"))
          return result([
            {
              payload: structuredClone(workingRelationship),
              record_hash: hash(workingRelationship),
            } as unknown as Row,
          ]);
        if (text.includes("FROM petra.working_candidate_revisions"))
          return result([
            {
              payload: structuredClone(workingCandidate),
              record_hash: hash(workingCandidate),
            } as unknown as Row,
          ]);
        if (text.includes("FROM petra.evidence_entities AS head")) {
          const record = evidence.get(String(values[1]));
          return record === undefined
            ? result([])
            : result([
                {
                  current_revision: String(record.revision),
                  current_record_hash: hash(record),
                  current_payload: structuredClone(record),
                  current_lifecycle: `${record.authority.zone}_${record.authority.review_state}`,
                  selected_revision: String(record.revision),
                  selected_record_hash: hash(record),
                  selected_payload: structuredClone(record),
                  selected_lifecycle: `${record.authority.zone}_${record.authority.review_state}`,
                } as unknown as Row,
              ]);
        }
        if (text.includes("FROM petra.evidence_entity_revisions")) {
          const record = evidence.get(String(values[0]));
          return record === undefined
            ? result([])
            : result([
                {
                  evidence_kind:
                    record.schema_name === "petra.claim"
                      ? "claim"
                      : "assertion",
                  payload: structuredClone(record),
                  record_hash: hash(record),
                } as unknown as Row,
              ]);
        }
        throw new Error(`Unexpected query: ${text}`);
      },
      release: vi.fn(),
    };
    const pool = {
      connect: () => Promise.resolve(client),
    } as unknown as Pool;
    const getFreshness = vi.fn(() =>
      Promise.resolve({
        projectId: projectDefinition.project_id,
        projection: checkpoint.projection,
        projectedTargetSequence: 1,
        projectedEventId: checkpoint.content.observed_head.event_id,
        projectedStreamRevision: 3,
        observedTargetSequence: 1,
        pendingRecords: 0,
        state: "current" as const,
      }),
    );
    const graph = {
      getFreshness,
      getObject: (_projectId: string, id: string) =>
        Promise.resolve(
          id === focus.claim_id
            ? focusNode
            : id === related.claim_id
              ? relatedNode
              : undefined,
        ),
      getEvidenceRelations: () => Promise.resolve(relationships),
    } as unknown as AuthorityGraphStore;
    const request: FocusedGraphViewRequest = {
      request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
      task_kind: "neighborhood",
      task_semantic_key: "scientific.research-question",
      question: "What directly supports this Claim?",
      focus_ref: {
        record_id: focus.claim_id,
        revision: focus.revision,
        record_hash: hash(focus),
      },
      origin: { origin_kind: "direct" },
      project_definition_ref: {
        project_definition_id: projectDefinition.project_definition_id,
        revision: projectDefinition.revision,
        content_hash: projectDefinition.content_hash,
        record_hash: hash(projectDefinition),
        definition_family: projectDefinition.definition_family,
      },
      semantic_layer: "current",
      temporal_position: {
        position_kind: "current",
        dimension: "project_snapshot",
      },
      object_semantic_key: "scientific.claim",
      relationship_semantic_key: "scientific.assertion",
      return_action_semantic_key: "scientific.graph.return",
      return_destination: {
        destination_key: "destination:evidence",
        destination_kind: "evidence",
        state: "available",
        owner: "project_relationship_view",
        label: "Return to Evidence",
        target_ref: {
          record_id: focus.claim_id,
          revision: focus.revision,
          record_hash: hash(focus),
        },
      },
      limits: {
        maximum_depth: 1,
        maximum_nodes: 5,
        maximum_relationships: 8,
        maximum_paths: 8,
      },
    };
    const reader = new PostgresFocusedGraphViewReader(pool, graph, contracts);
    const view = await reader.queryFocusedGraph(
      projectDefinition.project_id,
      request,
    );

    expect(view?.project_id).toBe(projectDefinition.project_id);
    expect(view?.content.profile.project_definition_ref).toEqual(
      request.project_definition_ref,
    );
    expect(view?.content.requested_snapshot.event_position).toBe(3);
    expect(view?.content.represented_snapshot.event_position).toBe(3);
    expect(view?.content.projection_position).toEqual(
      expect.objectContaining({
        state: "current",
        represented_event_position: 3,
        observed_event_position: 3,
        pending_records: 0,
      }),
    );
    expect(view?.content.scope.limits).toEqual(request.limits);
    expect(view?.content.scope.coverage).toBe("complete_for_scope");
    expect(
      view?.content.nodes.map((node) => node.record_ref.record_id),
    ).toEqual([focus.claim_id, related.claim_id]);
    expect(
      view?.content.relationships.map((relationship) => ({
        predicate: relationship.predicate,
        meaning: relationship.meaning_kind,
      })),
    ).toEqual([
      { predicate: "CITES", meaning: "citation" },
      { predicate: "SUPPORTS", meaning: "support" },
      { predicate: "CONTRADICTS", meaning: "contradiction" },
      { predicate: "QUALIFIES", meaning: "qualification" },
      { predicate: "ADOPTS", meaning: "inference" },
    ]);
    expect(view?.content.relationships.at(-1)?.origin).toBe("model_inference");
    expect(view?.content.paths).toHaveLength(5);
    expect(
      view?.content.paths.every(
        (path) =>
          path.steps.length === 1 &&
          path.steps[0]?.traversal_direction === "outgoing",
      ),
    ).toBe(true);
    const sourceDestination = view?.content.destinations.find(
      (destination) => destination.destination_kind === "source_inspection",
    );
    expect(sourceDestination).toEqual(
      expect.objectContaining({
        state: "available",
        owner: "project_object_location_view",
        target_ref: {
          record_id: sourceSpan.source_span_id,
          revision: sourceSpan.revision,
          record_hash: hash(sourceSpan),
        },
      }),
    );
    expect(
      view?.content.nodes[0]?.basis.record_refs.some(
        (ref) => ref.record_id === sourceSpan.source_span_id,
      ),
    ).toBe(true);
    expect(view?.content.nodes[0]?.basis.limitations).toEqual([]);
    expect(view?.content.nodes[0]?.basis.summary).toContain(
      "source-span-resolution=pass:SPAN_RESOLVED",
    );
    expect(view?.content.relationships[0]?.basis.summary).toContain(
      "trusted/human_accepted",
    );
    const unavailableSource = view?.content.destinations.find(
      (destination) => destination.state === "unavailable",
    );
    expect(unavailableSource?.destination_kind).toBe("source_inspection");
    expect(
      unavailableSource?.state === "unavailable"
        ? unavailableSource.reason
        : undefined,
    ).toContain("No direct SourceSpan location");
    expect(view?.content.nodes[1]?.destination_keys).toContain(
      unavailableSource?.destination_key,
    );
    expect(view?.content.authority_boundary.renderer_queries_projection).toBe(
      false,
    );
    expect(getFreshness).toHaveBeenCalledTimes(2);
    expect(queries.at(-1)).toBe("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();

    const workingView = await reader.queryFocusedGraph(
      projectDefinition.project_id,
      { ...structuredClone(request), semantic_layer: "working" },
    );
    expect(workingView?.content.semantic_layer).toBe("working");
    expect(workingView?.content.scope.included_layers).toEqual([
      "current",
      "working",
    ]);
    expect(
      workingView?.content.nodes.find((node) => node.layer === "working"),
    ).toEqual(
      expect.objectContaining({
        authority_position: "working_non_authority",
        label: "Working claim",
      }),
    );
    expect(
      workingView?.content.relationships.find(
        (relationship) => relationship.layer === "working",
      ),
    ).toEqual(
      expect.objectContaining({
        predicate: "SUPPORTS",
        origin: "working_candidate",
        authority_position: "working_non_authority",
      }),
    );
    expect(
      workingView?.content.relationships.filter(
        (relationship) => relationship.layer === "current",
      ),
    ).toHaveLength(assertions.length);

    const relatedNodeKey = `node:${related.claim_id.toLowerCase()}`;
    const detailsRequest: FocusedGraphDetailsViewRequest = {
      details_request_id:
        "focused_graph_details_request_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      focused_graph_request: request,
      expected_graph: {
        schema_name: "petra.focused-graph-view",
        schema_version: "1.0.0",
        content_hash: view!.content_hash,
      },
      selection: {
        selection_kind: "node",
        selected_keys: [relatedNodeKey],
      },
    };
    const querySpy = vi
      .spyOn(reader, "queryFocusedGraph")
      .mockResolvedValueOnce(view);
    const details = await reader.queryFocusedGraphDetails(
      projectDefinition.project_id,
      detailsRequest,
    );
    querySpy.mockRestore();
    expect(details?.content.graph).toEqual(
      expect.objectContaining({
        content_hash: view?.content_hash,
        task: view?.content.task,
        requested_snapshot: view?.content.requested_snapshot,
        represented_snapshot: view?.content.represented_snapshot,
        semantic_layer: "current",
        projection_position: view?.content.projection_position,
        return_destination: request.return_destination,
      }),
    );
    expect(details?.content.nodes).toHaveLength(1);
    expect(details?.content.nodes[0]).toMatchObject({
      member_kind: "node",
      member_key: relatedNodeKey,
      semantic_location: {
        resolution: {
          state: "current",
          resolved_ref: {
            semantic_key: "scientific.claim",
            object_id: related.claim_id,
            revision: related.revision,
            record_hash: hash(related),
          },
        },
      },
      source_inspections: [],
    });
    expect(details?.content.authority_boundary).toMatchObject({
      selection_is_presentation_state: true,
      details_are_read_only: true,
      source_owner: "project_source_view",
      semantic_location_owner: "project_object_location_view",
      graph_specific_registry_added: false,
    });

    const selectedRelationship = view!.content.relationships[0]!;
    const relationshipDetailsRequest: FocusedGraphDetailsViewRequest = {
      ...structuredClone(detailsRequest),
      details_request_id:
        "focused_graph_details_request_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      selection: {
        selection_kind: "relationship",
        selected_keys: [selectedRelationship.relationship_key],
      },
    };
    const relationshipQuerySpy = vi
      .spyOn(reader, "queryFocusedGraph")
      .mockResolvedValueOnce(view);
    const relationshipDetails = await reader.queryFocusedGraphDetails(
      projectDefinition.project_id,
      relationshipDetailsRequest,
    );
    relationshipQuerySpy.mockRestore();
    expect(relationshipDetails?.content.details_request_id).toBe(
      relationshipDetailsRequest.details_request_id,
    );
    expect(relationshipDetails?.content.relationships).toHaveLength(1);
    expect(relationshipDetails?.content.relationships[0]).toMatchObject({
      member_kind: "relationship",
      member_key: selectedRelationship.relationship_key,
      semantic_location: {
        resolution: {
          state: "current",
          resolved_ref: {
            semantic_key: "scientific.assertion",
            object_id: selectedRelationship.relationship_ref.element_id,
            revision: selectedRelationship.relationship_ref.revision,
            record_hash: selectedRelationship.relationship_ref.record_hash,
          },
        },
      },
      source_inspections: [
        {
          state: "unavailable",
          owner: "project_source_view",
          source_span_ref: {
            record_id: sourceSpan.source_span_id,
            revision: sourceSpan.revision,
            record_hash: hash(sourceSpan),
          },
          reason:
            "The exact SourceSpan has no current Project-scoped ProjectSource inspection destination.",
        },
      ],
    });

    const historicalView = await reader.queryFocusedGraph(
      projectDefinition.project_id,
      {
        ...structuredClone(request),
        semantic_layer: "historical",
        temporal_position: {
          position_kind: "historical",
          dimension: "recorded_time",
          at: { state: "exact", value: "2026-09-15T19:00:00.000Z" },
        },
        expected_snapshot: view!.content.requested_snapshot,
      },
    );
    expect(historicalView?.content.semantic_layer).toBe("historical");
    expect(historicalView?.content.scope.included_layers).toEqual([
      "historical",
    ]);
    expect(historicalView?.content.projection_position.state).toBe(
      "unavailable",
    );
    expect(
      historicalView?.content.nodes.every(
        (node) =>
          node.layer === "historical" &&
          node.authority_position === "historical_authority",
      ),
    ).toBe(true);
    expect(
      historicalView?.content.relationships.every(
        (relationship) =>
          relationship.layer === "historical" &&
          relationship.authority_position === "historical_authority",
      ),
    ).toBe(true);
    expect(historicalView?.content.limitations.join(" ")).toContain(
      "read-only",
    );

    const staleRequest: FocusedGraphViewRequest = {
      ...structuredClone(request),
      expected_snapshot: {
        snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        revision: 1,
        event_position: 2,
        content_hash: `sha256:${"f".repeat(64)}`,
      },
    };
    await expect(
      reader.queryFocusedGraph(projectDefinition.project_id, staleRequest),
    ).rejects.toEqual(
      expect.objectContaining({ code: "FOCUSED_GRAPH_SNAPSHOT_STALE" }),
    );
    expect(queries.at(-1)).toBe("ROLLBACK");

    const focusedV11 = contract("focused-graph-view", "1.1.0");
    projectDefinition.content.registrations.push({
      registration_kind: "extension",
      semantic_key: "scientific.graph.show-downstream",
      contract: focusedV11,
    });
    projectDefinition.content.terms.push({
      semantic_key: "scientific.graph.show-downstream",
      singular: "Show downstream effects",
      plural: "Show downstream effects",
      definition:
        "Reveal recorded downstream relationships within an exact bounded query.",
      generic_family: "task",
    });
    projectDefinition.content_hash = hash(projectDefinition.content);
    const expansionDefinitionRef = {
      project_definition_id: projectDefinition.project_definition_id,
      revision: projectDefinition.revision,
      content_hash: projectDefinition.content_hash,
      record_hash: hash(projectDefinition),
      definition_family: projectDefinition.definition_family,
    };
    workingCandidate.project_definition_ref = {
      project_definition_id: expansionDefinitionRef.project_definition_id,
      revision: expansionDefinitionRef.revision,
      content_hash: expansionDefinitionRef.content_hash,
      definition_family: expansionDefinitionRef.definition_family,
    };
    const expandedWorkingCandidateProjection = structuredClone(
      workingCandidate,
    ) as Record<string, unknown>;
    delete expandedWorkingCandidateProjection.content_hash;
    workingCandidate.content_hash = hash(expandedWorkingCandidateProjection);
    workingRelationship.project_definition_ref = structuredClone(
      workingCandidate.project_definition_ref,
    );
    if (
      workingRelationship.endpoints.object.endpoint_kind !== "working_candidate"
    ) {
      throw new Error("Expected the WorkingCandidate object endpoint.");
    }
    workingRelationship.endpoints.object.candidate_ref.content_hash =
      workingCandidate.content_hash;
    const expandedWorkingRelationshipProjection = structuredClone(
      workingRelationship,
    ) as Record<string, unknown>;
    delete expandedWorkingRelationshipProjection.content_hash;
    workingRelationship.content_hash = hash(
      expandedWorkingRelationshipProjection,
    );
    const snapshotMaterial = {
      project_id: projectDefinition.project_id,
      project_definition_ref: expansionDefinitionRef,
      semantic_layer: "current",
      event_position: 3,
      stream_revision: 3,
      graph_target_sequence: 1,
      position_kind: "requested",
    };
    const expansionSnapshot = {
      snapshot_id: derivePetraId("snapshot", canonicalize(snapshotMaterial)),
      revision: 1,
      event_position: 3,
      content_hash: hash(snapshotMaterial),
    };
    const expansionRequest = {
      ...structuredClone(request),
      project_definition_ref: expansionDefinitionRef,
      expected_snapshot: expansionSnapshot,
      limits: {
        maximum_depth: 2,
        maximum_nodes: 5,
        maximum_relationships: 8,
        maximum_paths: 8,
      },
      exploration: {
        mode: "named_expansion" as const,
        expansion_key: "expansion:show-downstream:focused-claim",
        recipe_semantic_key: "scientific.graph.show-downstream",
        target_ref: structuredClone(request.focus_ref),
        maximum_depth: 2,
        filters: {
          meaning_kinds: ["contradiction" as const, "qualification" as const],
          directions: ["outgoing" as const],
          origins: ["canonical_record" as const],
        },
      },
    };
    const expanded = await reader.queryFocusedGraph(
      projectDefinition.project_id,
      expansionRequest,
    );
    expect(expanded?.schema_version).toBe("1.1.0");
    if (expanded?.schema_version !== "1.1.0") {
      throw new Error("Expected the additive focused graph expansion view.");
    }
    expect(
      expanded.content.relationships.map(
        (relationship) => relationship.meaning_kind,
      ),
    ).toEqual(["contradiction", "qualification"]);
    expect(expanded.content.groups).toEqual([
      expect.objectContaining({
        meaning_kind: "contradiction",
        count_unit: "relationships",
        returned_count: 1,
        overlap: false,
      }),
      expect.objectContaining({
        meaning_kind: "qualification",
        count_unit: "relationships",
        returned_count: 1,
        overlap: false,
      }),
    ]);
    expect(expanded.content.exploration.accounting).toEqual({
      result_state: "complete_for_scope",
      capped_members: { state: "exact", value: 0 },
      hidden_relationships: { state: "exact", value: 3 },
      restricted_paths: { state: "not_disclosed" },
      cycle_paths: { state: "exact", value: 1 },
      incomplete_paths: { state: "exact", value: 0 },
      unknown_paths: { state: "unknown" },
    });
    expect(expanded.content.scope.omissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          omission_kind: "filtered",
          count: { state: "exact", value: 3 },
        }),
        expect.objectContaining({
          omission_kind: "restricted",
          count: { state: "not_disclosed" },
        }),
        expect.objectContaining({
          omission_kind: "unknown",
          count: { state: "unknown" },
        }),
      ]),
    );
    expect(
      expanded.content.paths.some((path) =>
        path.steps.some((step) => step.repeated_member),
      ),
    ).toBe(true);

    const workingExpansion = await reader.queryFocusedGraph(
      projectDefinition.project_id,
      {
        ...structuredClone(expansionRequest),
        semantic_layer: "working",
        exploration: {
          ...structuredClone(expansionRequest.exploration),
          filters: {
            meaning_kinds: ["support"],
            directions: ["outgoing"],
            origins: ["working_candidate"],
          },
        },
      },
    );
    if (workingExpansion?.schema_version !== "1.1.0") {
      throw new Error("Expected an additive Working expansion view.");
    }
    expect(workingExpansion.content.scope.included_layers).toEqual([
      "current",
      "working",
    ]);
    expect(workingExpansion.content.groups).toEqual([
      expect.objectContaining({
        layer: "current",
        meaning_kind: "support",
        returned_count: 0,
      }),
      expect.objectContaining({
        layer: "working",
        meaning_kind: "support",
        returned_count: 1,
      }),
    ]);
    expect(workingExpansion.content.relationships).toEqual([
      expect.objectContaining({
        layer: "working",
        origin: "working_candidate",
        authority_position: "working_non_authority",
      }),
    ]);
    expect(workingExpansion.content.paths[0]?.steps[0]).toEqual(
      expect.objectContaining({
        from_node_key: `node:${focus.claim_id.toLowerCase()}`,
        traversal_direction: "outgoing",
      }),
    );
    expect(
      workingExpansion.content.exploration.accounting.hidden_relationships,
    ).toEqual({ state: "exact", value: 5 });

    const cappedExpansion = await reader.queryFocusedGraph(
      projectDefinition.project_id,
      {
        ...structuredClone(expansionRequest),
        limits: {
          maximum_depth: 2,
          maximum_nodes: 5,
          maximum_relationships: 2,
          maximum_paths: 2,
        },
        exploration: {
          ...structuredClone(expansionRequest.exploration),
          filters: {
            meaning_kinds: [
              "citation",
              "support",
              "contradiction",
              "qualification",
              "inference",
              "provenance",
            ],
            directions: ["outgoing"],
            origins: ["canonical_record", "model_inference"],
          },
        },
      },
    );
    if (cappedExpansion?.schema_version !== "1.1.0") {
      throw new Error("Expected a capped additive expansion view.");
    }
    expect(cappedExpansion.content.scope.coverage).toBe("capped");
    expect(cappedExpansion.content.exploration.accounting).toMatchObject({
      result_state: "capped",
      capped_members: { state: "unknown" },
      hidden_relationships: { state: "unknown" },
      incomplete_paths: { state: "unknown" },
    });
    expect(cappedExpansion.content.relationships).toHaveLength(2);
  });
});
